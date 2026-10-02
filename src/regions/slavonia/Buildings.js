import { Mesh, Vector3 } from '../../engine/index.js';
import { prepare, mergePrepared, box, slab, cylinder, mat4 } from '../../world/boat/GeoKit.js';
import { createPropMaterial, PAT } from '../../game/GameMaterials.js';

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
	let w = x1 - x0, d = z1 - z0, ang = Math.atan2( ux, uz );
	// the long side runs along the local z, so the ridge follows it
	if ( w > d ) { const t = w; w = d; d = t; ang += Math.PI / 2; }
	return { cx, cz, w, d, ang };

}

// A village parish church: a long nave under a steep tiled roof with a half-hipped apse at the
// altar end, and the bell tower over the west door carrying a tapered spire. Catholic churches here
// are laid out east-west with the altar east, so the tower goes on the western end of the footprint.
function church( parts, terrain, r ) {

	const y = terrain.heightAt( r.cx, r.cz );
	const navW = Math.min( r.w, 12 ), navL = r.d;
	const eaves = 9.5, rise = navW * 0.55;
	const ang = r.ang;
	// the nave, which the rectangle's long side already orients
	parts.push( prepare( box( navW, eaves, navL ), {
		color: 0xe8e2d2, rough: 0.9, pattern: PAT.plain, matrix: mat4( r.cx, y + eaves / 2, r.cz, 0, ang, 0 ),
	} ) );
	const slope = Math.atan2( rise, navW / 2 );
	const slabLen = Math.hypot( rise, navW / 2 + 0.35 );
	for ( const side of [ - 1, 1 ] ) {

		const sx = r.cx + Math.cos( ang ) * side * ( navW / 4 + 0.18 );
		const sz = r.cz - Math.sin( ang ) * side * ( navW / 4 + 0.18 );
		parts.push( prepare( box( slabLen, 0.16, navL + 0.7 ), {
			color: 0x7d4531, rough: 0.82, pattern: PAT.plain,
			matrix: mat4( sx, y + eaves + rise / 2, sz, 0, ang, - side * slope, 1, 1, 1, 'YZX' ),
		} ) );

	}

	for ( const end of [ - 1, 1 ] ) {

		const gx = r.cx - Math.sin( ang ) * end * navL / 2, gz = r.cz - Math.cos( ang ) * end * navL / 2;
		const tri = slab( [ [ - navW / 2, 0 ], [ navW / 2, 0 ], [ 0, rise ] ], [], ( u, v, sd ) => new Vector3( u, v, sd * 0.11 ), { edges: false } );
		parts.push( prepare( tri, { color: 0xe8e2d2, rough: 0.9, pattern: PAT.plain, matrix: mat4( gx, y + eaves, gz, 0, ang, 0 ) } ) );

	}

	// which end of the nave lies west: the tower stands there, the altar at the other
	const ex = - Math.sin( ang ), ez = - Math.cos( ang ); // the local long axis in world x / z
	const west = ex < 0 ? 1 : - 1;
	const tx = r.cx + ex * west * ( navL / 2 + 2.4 ), tz = r.cz + ez * west * ( navL / 2 + 2.4 );
	const towerW = Math.min( 5.5, navW * 0.62 ), towerH = 20;
	parts.push( prepare( box( towerW, towerH, towerW ), {
		color: 0xe8e2d2, rough: 0.9, pattern: PAT.plain, matrix: mat4( tx, y + towerH / 2, tz, 0, ang, 0 ),
	} ) );
	// the belfry openings, then the cornice and the spire
	for ( const f of [ 0, 1 ] ) {

		const o = f ? Math.cos( ang ) : - Math.sin( ang ), o2 = f ? - Math.sin( ang ) : - Math.cos( ang );
		parts.push( prepare( box( f ? 0.12 : 1.5, 2.6, f ? 1.5 : 0.12 ), {
			color: 0x2b2f33, rough: 0.6, pattern: PAT.plain,
			matrix: mat4( tx + o * towerW / 2, y + towerH - 3.4, tz + o2 * towerW / 2, 0, ang, 0 ),
		} ) );

	}

	parts.push( prepare( box( towerW + 0.7, 0.35, towerW + 0.7 ), {
		color: 0xd8d0c0, rough: 0.9, pattern: PAT.plain, matrix: mat4( tx, y + towerH + 0.18, tz, 0, ang, 0 ),
	} ) );
	parts.push( prepare( cylinder( 0.0, towerW * 0.78, 9.5, 4 ), {
		color: 0x55606a, rough: 0.55, metal: 0.35, pattern: PAT.plain,
		matrix: mat4( tx, y + towerH + 0.35 + 4.75, tz, 0, ang + Math.PI / 4, 0 ),
	} ) );
	// the cross on the spire
	parts.push( prepare( box( 0.1, 1.5, 0.1 ), { color: 0x3c3f42, rough: 0.5, metal: 0.7, pattern: PAT.machined, matrix: mat4( tx, y + towerH + 10.6, tz, 0, ang, 0 ) } ) );
	parts.push( prepare( box( 0.7, 0.1, 0.1 ), { color: 0x3c3f42, rough: 0.5, metal: 0.7, pattern: PAT.machined, matrix: mat4( tx, y + towerH + 10.9, tz, 0, ang, 0 ) } ) );

	// the apse at the altar end
	const axp = r.cx - ex * west * ( navL / 2 + 1.6 ), azp = r.cz - ez * west * ( navL / 2 + 1.6 );
	parts.push( prepare( cylinder( navW * 0.34, navW * 0.34, eaves * 0.86, 10 ), {
		color: 0xe8e2d2, rough: 0.9, pattern: PAT.plain, matrix: mat4( axp, y + eaves * 0.43, azp, 0, 0, 0 ),
	} ) );

}

export function buildBuildings( { terrain, scene, places } ) {

	if ( ! places || ! places.buildings || ! places.buildings.length ) return null;
	const [ cE, cN ] = terrain.center;
	const half = terrain.size / 2 - 6;
	const parts = [];
	let count = 0;

	for ( const b of places.buildings ) {

		const ring = b.ring.map( ( [ e, n ] ) => [ e - cE, cN - n ] );
		const r = minAreaRect( ring );
		if ( ! r ) continue;
		if ( Math.abs( r.cx ) > half || Math.abs( r.cz ) > half ) continue;
		if ( r.w < 2.5 || r.d < 3 || r.w > 40 || r.d > 90 ) continue; // ruins and halls are not houses
		const ground = terrain.heightAt( r.cx, r.cz );
		if ( ! ( ground > - 1 ) ) continue;

		if ( b.class === 'church' ) { church( parts, terrain, r ); count ++; continue; }

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
		const pitch = isShed ? 0.38 : 0.52; // rise over half-span; a Slavonian roof is steep
		const rise = r.w / 2 * pitch * 2;
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

		count ++;

	}

	if ( ! parts.length ) return null;
	const mesh = new Mesh( mergePrepared( parts ), createPropMaterial( 'slavoniaBuildings' ) );
	mesh.name = 'buildings';
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	mesh.userData.count = count;
	scene.add( mesh );
	return mesh;

}
