import * as THREE from '../../engine/index.js';
import { VegType } from '../../world/vegetation/InstanceLOD.js';
import { GrassField } from '../../world/vegetation/GrassField.js';
import { GeoBuilder } from '../../world/vegetation/GeoBuilder.js';
import { buildBroadleafTree } from '../../world/vegetation/PlantGeometry.js';
import { createPlantLeafMaterial, createCanopyMaterial } from '../../world/vegetation/VegMaterials.js';
import { LeafAtlas } from '../../world/vegetation/LeafTextures.js';
import { uCamPos, uGustOffset } from '../../world/vegetation/VegNodes.js';
import { G } from '../../core/Globals.js';

// Flora of the Bosut floodplain (regions/slavonia). Four things grow here, and they are what the
// photos and the aerial imagery show (docs/slavonia/photos, docs/slavonia/img):
//
//   white willow   on the bank itself, leaning out over the water, the crown low and spreading
//   black poplar   in rows along the field edges and the lane, tall and narrow
//   oak and ash    the floodplain woods, where the land cover says forest
//   reed           a bed of common reed in the shallows at the foot of the bank
//
// Plus the bank meadow: tall grass between the fishing platforms, mown nearer the park.
//
// Everything is instanced; the trees are near geometry out to TREE_FADE and shrink away beyond it,
// where the ground shader's own canopy tone carries the woods to the horizon (GroundSurface.js). Far
// crowns as impostors are the next step, as on the island.

// m: trees are geometry out to the first number and shrink away by the second, where the ground
// shader's own canopy tone carries the woods on to the horizon
const TREE_FADE = [ 170, 210 ];
const POPLAR_FADE = [ 230, 280 ];
const REED_FADE = [ 55, 75 ];

// ---------------------------------------------------------------- species

// Salix alba: short bole, a low wide crown, and limbs that reach out nearly level over the water.
export const WILLOW = {
	H: 14,
	crown: { c: [ 0, 8.2, 0 ], r: [ 6.4, 3.0, 6.4 ] },
	fork: [ 0.2, 2.6, - 0.1 ],
	lobes: [
		[ 0.6, 8.4, - 0.5, 3.2 ],
		[ - 3.4, 7.2, 2.2, 2.9 ],
		[ 3.9, 6.8, 1.6, 2.8 ],
		[ 2.1, 6.0, - 3.9, 2.7 ],
		[ - 4.1, 5.6, - 2.4, 2.6 ],
		[ 0.5, 5.0, 4.4, 2.4 ],
		[ - 1.4, 9.6, - 2.1, 2.0 ],
		[ 4.6, 4.6, - 1.1, 2.1 ],
	],
	trunk: { r0: 0.42, r1: 0.3, taper: 0.12, fin: 0.5, flare: 0.35 },
	// limbs leave the fork almost level and bow far out: the willow's reach over the water
	limb: { r0: 0.2, r1: 0.055, r2: 0.09, r3: 0.03, rise: 0.06, bow: - 0.42 },
	clump: { per: 4.2, r: 0.8, cards: 3, size: 1.5, flatten: 0.55 },
	flexR: 6,
	sway: [ 2.2, 5.0 ],
	center: 6.0,
};

// Populus nigra 'Italica': a column. The lobes stack up the trunk instead of spreading.
export const POPLAR = {
	H: 26,
	crown: { c: [ 0, 14.0, 0 ], r: [ 2.3, 9.0, 2.3 ] },
	fork: [ 0.05, 4.0, 0.0 ],
	lobes: [
		[ 0.1, 21.5, 0.0, 1.9 ],
		[ - 0.9, 17.4, 0.6, 2.2 ],
		[ 1.0, 14.8, - 0.5, 2.3 ],
		[ 0.4, 11.6, 1.0, 2.2 ],
		[ - 0.8, 9.0, - 0.8, 2.0 ],
		[ 0.7, 19.4, 0.7, 1.9 ],
		[ - 0.5, 12.8, - 1.1, 1.9 ],
		[ 0.2, 24.0, - 0.2, 1.5 ],
	],
	trunk: { r0: 0.34, r1: 0.26, taper: 0.16, fin: 0.25, flare: 0.2 },
	// limbs climb steeply and hug the trunk
	limb: { r0: 0.13, r1: 0.04, r2: 0.06, r3: 0.022, rise: 0.5, bow: - 0.05 },
	clump: { per: 4.6, r: 0.7, cards: 3, size: 1.25, flatten: 0.9 },
	flexR: 3,
	sway: [ 3.0, 12.0 ],
	center: 12.0,
};

// Quercus robur / Fraxinus: the floodplain wood, a heavy rounded crown on a straight bole.
export const OAK = {
	H: 21,
	crown: { c: [ 0, 13.0, 0 ], r: [ 6.0, 4.4, 6.0 ] },
	fork: [ 0.15, 6.2, - 0.05 ],
	lobes: [
		[ 0.5, 16.2, - 0.4, 3.4 ],
		[ - 3.4, 13.6, 2.6, 3.1 ],
		[ 4.0, 12.8, 1.9, 3.0 ],
		[ 2.4, 11.4, - 4.0, 3.0 ],
		[ - 4.2, 10.6, - 2.6, 2.8 ],
		[ 0.6, 9.8, 4.6, 2.7 ],
		[ - 1.5, 18.0, - 2.2, 2.2 ],
		[ 4.8, 9.0, - 1.2, 2.3 ],
	],
	trunk: { r0: 0.52, r1: 0.4, taper: 0.1, fin: 0.7, flare: 0.3 },
	limb: { r0: 0.22, r1: 0.06, r2: 0.1, r3: 0.035, rise: 0.2, bow: - 0.3 },
	clump: { per: 4.0, r: 0.9, cards: 3, size: 1.6, flatten: 0.75 },
	flexR: 6,
	sway: [ 4.5, 9.0 ],
	center: 10.0,
};

// ---------------------------------------------------------------- reed

// A clump of common reed: a sheaf of tall blades with a feathered head, as cards. Part 2 is the
// fern part in the island's leaf material: a thin upright blade that the wind bends along its length.
function buildReedClump( seed = 7, b = new GeoBuilder() ) {

	const rand = mulberry( seed );
	const blades = 16 + Math.round( rand() * 10 );
	const up = new THREE.Vector3( 0, 1, 0 );
	for ( let i = 0; i < blades; i ++ ) {

		const a = rand() * Math.PI * 2;
		const r = Math.sqrt( rand() ) * 0.34;
		const len = 1.9 + rand() * 1.4;
		const lean = 0.12 + rand() * 0.24;
		const base = new THREE.Vector3( Math.cos( a ) * r, 0, Math.sin( a ) * r );
		const dir = new THREE.Vector3( Math.cos( a ) * lean, 1, Math.sin( a ) * lean ).normalize();
		const side = new THREE.Vector3( - dir.z, 0, dir.x ).normalize();
		const face = new THREE.Vector3().crossVectors( dir, side ).normalize();
		const w0 = 0.055 + rand() * 0.03;
		const ph = rand(), cr = rand(), card = rand();
		const rows = 4;
		let prev = null;
		for ( let k = 0; k <= rows; k ++ ) {

			const t = k / rows;
			// the blade narrows to the head and bends downwind the higher it goes
			const p = base.clone().addScaledVector( dir, len * t ).addScaledVector( side, 0 );
			p.y -= t * t * len * 0.12; // the arch of a reed leaf
			const w = w0 * ( 1 - t * 0.7 );
			const flex = t * t;
			const left = b.vertex( p.clone().addScaledVector( side, - w ), face, 0, t, [ Math.max( 0, p.y / 3.2 ), flex, 1, ph ], [ 2, 0.35 + 0.65 * t, cr, card ] );
			const right = b.vertex( p.clone().addScaledVector( side, w ), face, 1, t, [ Math.max( 0, p.y / 3.2 ), flex, 1, ph ], [ 2, 0.35 + 0.65 * t, cr, card ] );
			if ( prev ) b.quad( prev[ 0 ], prev[ 1 ], right, left );
			prev = [ left, right ];

		}

	}

	void up;
	return { geometry: b.build( 3.4, new THREE.Vector3( 0, 1.3, 0 ) ), triangles: b.triangles };

}

function mulberry( a ) {

	return function () {

		a |= 0; a = a + 0x6D2B79F5 | 0;
		let t = Math.imul( a ^ a >>> 15, 1 | a );
		t = t + Math.imul( t ^ t >>> 7, 61 | t ) ^ t;
		return ( ( t ^ t >>> 14 ) >>> 0 ) / 4294967296;

	};

}

// ---------------------------------------------------------------- what is already built

// A coarse grid of the ground the village has taken: building footprints with a margin for the
// eaves and the yard path, and the roads with their shoulders. Nothing is planted there, and the
// meadow stops at its edge, so no tree grows through a wall and no reed bed crosses a lane.
const BUILT_TEXEL = 2;

function builtMask( terrain, places ) {

	const res = Math.round( terrain.size / BUILT_TEXEL );
	const m = new Uint8Array( res * res );
	if ( ! places ) return { m, res, texel: BUILT_TEXEL, origin: terrain.origin };
	const [ cE, cN ] = terrain.center;
	const mark = ( x, z, r ) => {

		const i0 = Math.max( 0, Math.floor( ( x - r - terrain.origin ) / BUILT_TEXEL ) );
		const i1 = Math.min( res - 1, Math.ceil( ( x + r - terrain.origin ) / BUILT_TEXEL ) );
		const j0 = Math.max( 0, Math.floor( ( z - r - terrain.origin ) / BUILT_TEXEL ) );
		const j1 = Math.min( res - 1, Math.ceil( ( z + r - terrain.origin ) / BUILT_TEXEL ) );
		for ( let j = j0; j <= j1; j ++ ) for ( let i = i0; i <= i1; i ++ ) m[ j * res + i ] = 255;

	};

	for ( const b of places.buildings || [] ) {

		// the footprint's own points, each given the eaves and a metre of standing room
		for ( const [ e, n ] of b.ring ) mark( e - cE, cN - n, 3 );

	}

	for ( const r of places.roads || [] ) {

		const half = r.width / 2 + 1.2;
		const pts = r.pts;
		for ( let i = 0; i + 1 < pts.length; i ++ ) {

			const ax = pts[ i ][ 0 ] - cE, az = cN - pts[ i ][ 1 ];
			const bx = pts[ i + 1 ][ 0 ] - cE, bz = cN - pts[ i + 1 ][ 1 ];
			const len = Math.hypot( bx - ax, bz - az );
			const steps = Math.max( 1, Math.ceil( len / BUILT_TEXEL ) );
			for ( let k = 0; k <= steps; k ++ ) mark( ax + ( bx - ax ) * k / steps, az + ( bz - az ) * k / steps, half );

		}

	}

	return { m, res, texel: BUILT_TEXEL, origin: terrain.origin };

}

function isBuilt( built, x, z ) {

	const i = Math.floor( ( x - built.origin ) / built.texel ), j = Math.floor( ( z - built.origin ) / built.texel );
	if ( i < 0 || j < 0 || i >= built.res || j >= built.res ) return false;
	return built.m[ j * built.res + i ] > 0;

}

// ---------------------------------------------------------------- scatter

// Where each species stands, read off the patch itself: the height above the water, the distance to
// the water's edge, and the land-cover masks the tiles carry (forest, cropland, built-up).
function scatter( terrain, taken, seed = 4201 ) {

	const rand = mulberry( seed );
	const out = { willows: [], poplars: [], oaks: [], reeds: [] };
	const { res, texel, origin } = terrain;
	const sampleMask = ( m, x, z ) => {

		const i = Math.floor( ( x - origin ) / texel ), j = Math.floor( ( z - origin ) / texel );
		if ( i < 0 || j < 0 || i >= res || j >= res ) return 0;
		return m[ j * res + i ] / 255;

	};

	// distance to the water's edge, from the heights: a few rings outward is enough here, since the
	// bank is cut to a known profile
	const edgeDist = ( x, z ) => {

		const h = terrain.heightAt( x, z );
		if ( h < 0 ) return - 1; // in the water
		for ( let r = 1; r <= 30; r += 1.5 ) {

			for ( let a = 0; a < 10; a ++ ) {

				const ang = a / 10 * Math.PI * 2;
				if ( terrain.heightAt( x + Math.cos( ang ) * r, z + Math.sin( ang ) * r ) < 0 ) return r;

			}

		}

		return 99;

	};

	const half = terrain.size / 2 - 8;
	// a jittered grid: one candidate every 6 m over the patch
	const STEP = 6;
	for ( let z = - half; z < half; z += STEP ) for ( let x = - half; x < half; x += STEP ) {

		const px = x + ( rand() - 0.5 ) * STEP, pz = z + ( rand() - 0.5 ) * STEP;
		if ( isBuilt( taken, px, pz ) ) continue;
		const h = terrain.heightAt( px, pz );
		const forest = sampleMask( terrain.gully, px, pz );
		const built = sampleMask( terrain.path, px, pz );
		const crop = sampleMask( terrain.sand, px, pz );
		const d = edgeDist( px, pz );

		// reeds: the shallows and the wet toe of the bank, in broken stands
		if ( h > - 0.6 && h < 0.4 && rand() < 0.9 ) {

			out.reeds.push( rec( terrain, px, pz, rand, 0.8 + rand() * 0.5, REED_FADE[ 1 ] + 8 ) );
			continue;

		}

		// willows: the bank top, within a dozen metres of the water, leaning out over it
		if ( d > 0 && d < 13 && h > 0.2 && built < 0.4 && rand() < 0.16 ) {

			const r = rec( terrain, px, pz, rand, 0.85 + rand() * 0.4, TREE_FADE[ 1 ] + 12 );
			// lean toward the water: the record's yaw turns the crown, the lean rides on the scale
			out.willows.push( r );
			continue;

		}

		// the floodplain wood
		if ( forest > 0.5 && rand() < 0.42 ) {

			out.oaks.push( rec( terrain, px, pz, rand, 0.8 + rand() * 0.5, TREE_FADE[ 1 ] + 12 ) );
			continue;

		}

		// poplar rows: a line of them along the edges of the worked strips, away from the water
		if ( crop > 0.45 && d > 25 && rand() < 0.02 ) {

			out.poplars.push( rec( terrain, px, pz, rand, 0.85 + rand() * 0.35, POPLAR_FADE[ 1 ] + 12 ) );
			continue;

		}

	}

	return out;

}

function rec( terrain, x, z, rand, s, qr ) {

	return { x, y: terrain.heightAt( x, z ), z, s, yaw: rand() * Math.PI * 2, H: 1, seed: rand(), qr };

}

// ---------------------------------------------------------------- the field

export class Flora {

	constructor( { scene, terrain, places = null } ) {

		this.terrain = terrain;
		this.group = new THREE.Group();
		this.group.name = 'SlavoniaFlora';
		this.group.matrixAutoUpdate = false;

		const t0 = performance.now();
		const built = builtMask( terrain, places );
		const recs = scatter( terrain, built );
		this.records = recs;

		const leafMat = createPlantLeafMaterial();
		this.leafAtlas = new LeafAtlas();
		const canopyMat = createCanopyMaterial( this.leafAtlas );
		this.materials = [ leafMat, canopyMat ];

		const reed = buildReedClump( 7 );

		this.types = [];
		const add = ( t ) => {

			this.types.push( t );
			for ( const m of t.meshes ) this.group.add( m );
			return t;

		};

		// Three trees of each species, grown from different seeds, and the records split between
		// them: one crown repeated down a bank reads as wallpaper.
		const species = ( name, spec, records, fade, seeds ) => seeds.map( ( seed, v ) => {

			const part = records.filter( ( r, i ) => i % seeds.length === v );
			if ( ! part.length ) return null;
			const geo = buildBroadleafTree( spec, seed ).geometry;
			return add( new VegType( `${ name }${ v }`, part, {
				fade, margin: 12, sortNear: true,
				near: [ { geometry: geo, material: canopyMat, castShadow: true, name: `flora-${ name }-${ v }` } ],
			} ) );

		} ).filter( Boolean );

		this.willows = species( 'willow', WILLOW, recs.willows, TREE_FADE, [ 101, 137, 173 ] );
		this.poplars = species( 'poplar', POPLAR, recs.poplars, POPLAR_FADE, [ 211, 251, 283 ] );
		this.oaks = species( 'oak', OAK, recs.oaks, TREE_FADE, [ 307, 349, 389 ] );
		this.reeds = add( new VegType( 'reeds', recs.reeds, {
			fade: REED_FADE, margin: 10, sortNear: true,
			near: [ { geometry: reed.geometry, material: leafMat, castShadow: false, name: 'flora-reed' } ],
		} ) );

		// alpha-tested foliage after the opaque ground
		for ( const t of this.types ) for ( const m of t.meshes ) m.renderOrder = 1;

		this.grass = new GrassField( { terrain, mask: buildMeadowMask( terrain, built ) } );
		for ( const m of this.grass.meshes ) this.group.add( m );

		this.group.updateMatrixWorld( true );
		scene.add( this.group );
		this._camPos = new THREE.Vector3();
		this.timings = { total: performance.now() - t0 };
		this.counts = { willows: recs.willows.length, poplars: recs.poplars.length, oaks: recs.oaks.length, reeds: recs.reeds.length };

	}

	update( dt, camera ) {

		if ( ! this.leafAtlas.baked ) this.leafAtlas.bake();

		camera.updateMatrixWorld();
		const p = camera.getWorldPosition( this._camPos );
		uCamPos.value.copy( p );
		// the travelling gust field, integrated as the island's vegetation does it, so a change of
		// wind never makes the crowns jump
		const wd = G.windDir.value;
		const speed = 0.7 * G.windSpeed.value + 1.5;
		uGustOffset.value.x += wd.x * speed * dt;
		uGustOffset.value.y += wd.y * speed * dt;

		for ( const t of this.types ) t.update( p );
		this.grass.update( camera );

	}

}

// Where the meadow grass grows: the bank and the verges, not the worked fields, the yards, the wood
// floor or the water. The mask is the same rgba8 texture the island's GrassField takes (r = tall
// meadow, g = short, b = flowers, a = unused).
const MASK_TEXEL = 2;

function buildMeadowMask( terrain, taken ) {

	const res = Math.round( terrain.size / MASK_TEXEL );
	const texel = terrain.size / res;
	const data = new Uint8Array( res * res * 4 );
	const { res: tres, texel: ttex, origin } = terrain;
	const mask = ( m, x, z ) => {

		const i = Math.floor( ( x - origin ) / ttex ), j = Math.floor( ( z - origin ) / ttex );
		if ( i < 0 || j < 0 || i >= tres || j >= tres ) return 0;
		return m[ j * tres + i ] / 255;

	};

	for ( let j = 1; j < res - 1; j ++ ) {

		const z = terrain.origin + ( j + 0.5 ) * texel;
		for ( let i = 1; i < res - 1; i ++ ) {

			const x = terrain.origin + ( i + 0.5 ) * texel;
			const h = terrain.heightAt( x, z );
			if ( h < 0.15 ) continue; // water and the wet toe of the bank: the reeds have that
			if ( isBuilt( taken, x, z ) ) continue;
			const crop = mask( terrain.sand, x, z );
			const built = mask( terrain.path, x, z );
			const forest = mask( terrain.gully, x, z );
			const open = ( 1 - crop ) * ( 1 - built ) * ( 1 - forest * 0.75 );
			if ( open < 0.1 ) continue;
			const k = ( j * res + i ) * 4;
			data[ k ] = Math.round( 255 * Math.min( 1, open ) );
			data[ k + 1 ] = Math.round( 190 * Math.min( 1, open ) );
			data[ k + 2 ] = Math.round( 70 * open * ( 1 - forest ) );

		}

	}

	return { data, res };

}
