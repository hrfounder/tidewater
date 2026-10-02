import { Mesh, Vector3 } from '../../engine/index.js';
import { prepare, mergePrepared, box, slab, cylinder, mat4 } from '../../world/boat/GeoKit.js';
import { createPropMaterial, PAT } from '../../game/GameMaterials.js';
import { yardFor, buildYards } from './Yards.js';
import { buildChurch } from './Church.js';

// The buildings of the block, from public/world/bosut/places.json (OpenStreetMap via Overture, ODbL).
//
// The footprints are real; the houses raised on them are the Slavonian village form. A Šokac house
// stands narrow end to the street with its long side down the plot, one storey under a steep gabled
// roof of red clay tile, plastered in white, cream or ochre over a tarred plinth, with a covered
// walk (gank) along the yard side and a brick chimney over the kitchen. Barns and sheds down the
// plot are the same shape, lower and unpainted.
//
// Each footprint is reduced to its minimum-area rectangle: the real rings carry porches and lean-tos
// as notches, and a house built on the raw ring would be a lumpy extrusion. The rectangle gives the
// ridge its direction, which is what reads from the street and from the air.

const WALL = [ 0xd8d2c2, 0xe6dcc4, 0xd9c9a3, 0xc9d3cf, 0xe0d6cc, 0xcdbfa2 ]; // limewash: white, cream, ochre, pale blue
const TILE = [ 0x8a4a33, 0x95543a, 0x7d4531, 0x8f5c3f ]; // clay tile, weathered to brown-red
const SHED = [ 0xa8a091, 0x9c927f, 0xb2a894 ]; // unpainted render and old timber
const PLINTH = 0x4a443c;

// roof pitch as rise per metre of width (the slope's tangent is twice this), and the widths between
// which a building stops being a house and becomes a hall
const PITCH_HOUSE = 0.52, PITCH_SHED = 0.38, PITCH_HALL = 0.18;
const HOUSE_SPAN = 9, HALL_SPAN = 16;

// deterministic per-building choice, so the village looks the same every run
function hash( x, z ) {

	const s = Math.sin( x * 12.9898 + z * 78.233 ) * 43758.5453;
	return s - Math.floor( s );

}

// The minimum-area rectangle of a ring (rotating calipers over the ring's own edge directions):
// returns the centre, the half extents and the angle of the long side.
function minAreaRect( ring ) {

	let best = null;
	for ( let i = 0; i + 1 < ring.length; i ++ ) {

		const dx = ring[ i + 1 ][ 0 ] - ring[ i ][ 0 ], dz = ring[ i + 1 ][ 1 ] - ring[ i ][ 1 ];
		const l = Math.hypot( dx, dz );
		if ( l < 0.2 ) continue;
		const ux = dx / l, uz = dz / l;
		let x0 = Infinity, x1 = - Infinity, z0 = Infinity, z1 = - Infinity;
		for ( const [ px, pz ] of ring ) {

			const a = px * ux + pz * uz, b = - px * uz + pz * ux;
			if ( a < x0 ) x0 = a; if ( a > x1 ) x1 = a;
			if ( b < z0 ) z0 = b; if ( b > z1 ) z1 = b;

		}

		const area = ( x1 - x0 ) * ( z1 - z0 );
		if ( ! best || area < best.area ) best = { area, ux, uz, x0, x1, z0, z1 };

	}

	if ( ! best ) return null;
	const { ux, uz, x0, x1, z0, z1 } = best;
	const ca = ( x0 + x1 ) / 2, cb = ( z0 + z1 ) / 2;
	const cx = ca * ux - cb * uz, cz = ca * uz + cb * ux;
	// The rectangle's two extents: eu along the edge direction u, ev along its perpendicular
	// v = ( -uz, ux ). A box turned by `ang` about y has its local z along ( sin ang, cos ang ), so the
	// long side (d, which the ridge follows) has to be the extent along whichever axis local z is
	// turned onto. Pairing u's angle with v's extent builds every elongated house at right angles to
	// its footprint.
	const eu = x1 - x0, ev = z1 - z0;
	return eu >= ev
		? { cx, cz, w: ev, d: eu, ang: Math.atan2( ux, uz ) }
		: { cx, cz, w: eu, d: ev, ang: Math.atan2( - uz, ux ) };

}

// Every road station in the block, on a coarse grid, so a house can find the lane it fronts without
// walking all of them. A Slavonian plot shows the street its gable, and the fence, the windows and
// the door all follow from which end that is.
function roadIndex( places, cE, cN, cell = 40 ) {

	const map = new Map();
	for ( const r of places.roads || [] ) for ( let i = 0; i + 1 < r.pts.length; i ++ ) {

		const ax = r.pts[ i ][ 0 ] - cE, az = cN - r.pts[ i ][ 1 ];
		const bx = r.pts[ i + 1 ][ 0 ] - cE, bz = cN - r.pts[ i + 1 ][ 1 ];
		const steps = Math.max( 1, Math.ceil( Math.hypot( bx - ax, bz - az ) / 8 ) );
		for ( let k = 0; k <= steps; k ++ ) {

			const x = ax + ( bx - ax ) * k / steps, z = az + ( bz - az ) * k / steps;
			const key = Math.floor( x / cell ) + ',' + Math.floor( z / cell );
			let a = map.get( key );
			if ( ! a ) map.set( key, a = [] );
			a.push( x, z );

		}

	}

	return { map, cell };

}

function nearestRoad( idx, x, z ) {

	let bx = 0, bz = 0, best = Infinity;
	const ci = Math.floor( x / idx.cell ), cj = Math.floor( z / idx.cell );
	for ( let j = cj - 1; j <= cj + 1; j ++ ) for ( let i = ci - 1; i <= ci + 1; i ++ ) {

		const a = idx.map.get( i + ',' + j );
		if ( ! a ) continue;
		for ( let k = 0; k < a.length; k += 2 ) {

			const d = ( a[ k ] - x ) ** 2 + ( a[ k + 1 ] - z ) ** 2;
			if ( d < best ) { best = d; bx = a[ k ]; bz = a[ k + 1 ]; }

		}

	}

	return best < Infinity ? { x: bx, z: bz, d: Math.sqrt( best ) } : null;

}

export function buildBuildings( { terrain, scene, places } ) {

	if ( ! places || ! places.buildings || ! places.buildings.length ) return null;
	const [ cE, cN ] = terrain.center;
	const roads = roadIndex( places, cE, cN );
	const half = terrain.size / 2 - 6;
	const parts = [];
	const yards = [];
	let count = 0;

	for ( const b of places.buildings ) {

		const ring = b.ring.map( ( [ e, n ] ) => [ e - cE, cN - n ] );
		const r = minAreaRect( ring );
		if ( ! r ) continue;
		if ( Math.abs( r.cx ) > half || Math.abs( r.cz ) > half ) continue;
		if ( r.w < 2.5 || r.d < 3 || r.w > 40 || r.d > 90 ) continue; // ruins and halls are not houses
		const ground = terrain.heightAt( r.cx, r.cz );
		if ( ! ( ground > - 1 ) ) continue;

		// Turn the house so its gable (which carries the windows and the door, and which the fence
		// runs from) faces the lane it stands on. The rectangle's axes come from the footprint; only
		// which end is the street end is decided here.
		const near = nearestRoad( roads, r.cx, r.cz );
		if ( near && near.d < 60 ) {

			// the gable sits at the -z end of the local frame: ( -sin, -cos ) in world
			const gx = - Math.sin( r.ang ), gz = - Math.cos( r.ang );
			if ( ( near.x - r.cx ) * gx + ( near.z - r.cz ) * gz < 0 ) r.ang += Math.PI;

		}

		if ( b.class === 'church' ) { buildChurch( parts, terrain, r ); count ++; continue; }

		const h = hash( r.cx, r.cz );
		const area = r.w * r.d;
		// a dwelling is the one nearest the street; anything small and squat down the plot is a shed
		const isShed = area < 34 || r.w < 4.2;
		const levels = b.levels || ( area > 150 ? 2 : 1 );
		const eaves = b.height ? Math.max( 2.4, b.height * 0.62 ) : ( isShed ? 2.3 + h * 0.5 : 2.8 + levels * 0.55 );
		const wall = isShed ? SHED[ ( h * SHED.length ) | 0 ] : WALL[ ( h * WALL.length ) | 0 ];
		const tile = TILE[ ( hash( r.cz, r.cx ) * TILE.length ) | 0 ];
		const y = ground;

		// the house: walls to the eaves, on a tarred plinth
		parts.push( prepare( box( r.w, eaves, r.d ), {
			color: wall, rough: 0.9, pattern: PAT.plain, matrix: mat4( r.cx, y + eaves / 2, r.cz, 0, r.ang, 0 ),
		} ) );
		parts.push( prepare( box( r.w + 0.12, 0.45, r.d + 0.12 ), {
			color: PLINTH, rough: 0.92, pattern: PAT.plain, matrix: mat4( r.cx, y + 0.22, r.cz, 0, r.ang, 0 ),
		} ) );

		// the roof: a gable along the long side, as two pitched slabs meeting at the ridge
		// Rise per metre of width. A house roof here is steep (about 46 degrees); a shed's is lower;
		// and a wide hall or barn carries a shallow one (about 20 degrees), or a 25 m span would
		// stand a 13 m roof on 4 m walls.
		const span = Math.min( 1, Math.max( 0, ( r.w - HOUSE_SPAN ) / ( HALL_SPAN - HOUSE_SPAN ) ) );
		const pitch = ( isShed ? PITCH_SHED : PITCH_HOUSE ) * ( 1 - span ) + PITCH_HALL * span;
		const rise = r.w * pitch;
		const over = 0.4; // the eaves overhang
		const slope = Math.atan2( rise, r.w / 2 );
		const slabLen = Math.hypot( rise, r.w / 2 + over );
		for ( const side of [ - 1, 1 ] ) {

			// each slab is a thin box, tilted about the ridge and pushed out to the eaves
			const cxs = r.cx + Math.cos( r.ang ) * side * ( r.w / 4 + over / 4 );
			const czs = r.cz - Math.sin( r.ang ) * side * ( r.w / 4 + over / 4 );
			parts.push( prepare( box( slabLen, 0.14, r.d + over * 2 ), {
				color: tile, rough: 0.82, pattern: PAT.plain,
				matrix: mat4( cxs, y + eaves + rise / 2, czs, 0, r.ang, - side * slope, 1, 1, 1, 'YZX' ),
			} ) );

		}

		// the gable walls that close the roof at each end: the triangle between the eaves and the
		// ridge, not a box (a box would stand square above the roof)
		for ( const end of [ - 1, 1 ] ) {

			const gx = r.cx - Math.sin( r.ang ) * end * r.d / 2;
			const gz = r.cz - Math.cos( r.ang ) * end * r.d / 2;
			const tri = slab( [ [ - r.w / 2, 0 ], [ r.w / 2, 0 ], [ 0, rise ] ], [], ( u, v, side ) =>
				new Vector3( u, v, side * 0.11 ), { edges: false } );
			parts.push( prepare( tri, {
				color: wall, rough: 0.9, pattern: PAT.plain, matrix: mat4( gx, y + eaves, gz, 0, r.ang, 0 ),
			} ) );

		}

		// the chimney, over the middle of the long side
		if ( ! isShed ) {

			const off = ( h - 0.5 ) * r.d * 0.3;
			const kx = r.cx - Math.sin( r.ang ) * off, kz = r.cz - Math.cos( r.ang ) * off;
			parts.push( prepare( box( 0.5, rise + 0.9, 0.5 ), {
				color: 0x8d6a52, rough: 0.92, pattern: PAT.plain, matrix: mat4( kx, y + eaves + ( rise + 0.9 ) / 2, kz, 0, r.ang, 0 ),
			} ) );

		}

		// windows and a door on the gable end that faces the street: dark recesses, no glass yet
		if ( ! isShed ) {

			const fx = r.cx - Math.sin( r.ang ) * r.d / 2, fz = r.cz - Math.cos( r.ang ) * r.d / 2;
			for ( const u of [ - 0.26, 0.26 ] ) {

				const wx = fx + Math.cos( r.ang ) * u * r.w, wz = fz - Math.sin( r.ang ) * u * r.w;
				parts.push( prepare( box( 0.95, 1.2, 0.12 ), {
					color: 0x2b2f33, rough: 0.5, pattern: PAT.plain, matrix: mat4( wx, y + 1.7, wz, 0, r.ang, 0 ),
				} ) );

			}

		}

		yardFor( yards, terrain, r, isShed );
		count ++;

	}

	buildYards( { scene, parts: yards } );

	if ( ! parts.length ) return null;
	const mesh = new Mesh( mergePrepared( parts ), createPropMaterial( 'slavoniaBuildings' ) );
	mesh.name = 'buildings';
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	mesh.userData.count = count;
	scene.add( mesh );
	return mesh;

}
