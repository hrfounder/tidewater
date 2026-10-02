import { Vector3 } from '../../engine/index.js';
import { prepare, box, slab, cylinder, lathe, mat4 } from '../../world/boat/GeoKit.js';
import { PAT } from '../../game/GameMaterials.js';

// Crkva svetog Roka in Rokovci, and crkva svetog Andrije in Andrijaševci: the village baroque of
// this corner of Slavonia, built from the photographs of St Roch's.
//
// What those show, and what this builds:
//   - a single nave under a steep red clay tile roof, the eaves carried on a white cornice
//   - walls in pale ochre, divided into bays by flat white pilasters, with tall round-arched
//     windows in white surrounds
//   - the bell tower standing in the west front rather than beside it: the façade rises into it,
//     so the tower's face is the church's face, with the door at its foot
//   - a belfry stage with a tall round-arched louvred opening on each side
//   - above that the thing that makes it Pannonian rather than anything else: a black sheet-metal
//     onion dome, drawn in over a neck and running up to a slender spire with an orb and a cross
//   - a rounded apse at the altar end under a half-cone of the same tile
//
// Scale comes from the real footprint (Buildings.js reduces the ring to a rectangle); the
// proportions are the photographs'.

const WALL = 0xe8dcb8; // the limewashed ochre of the walls
const TRIM = 0xf2efe6; // the white of the pilasters, cornices and window surrounds
const TILE = 0x9c5a3c; // old clay tile
const METAL = 0x2a2b2d; // the dome's blackened sheet metal
const PLINTH = 0x9a958a; // the rendered stone base

// the profile of an onion dome, as radius against height, scaled to the belfry below it: it swells
// out of the cornice, draws in to a neck and runs up into the spire
const ONION = [
	[ 0.00, 0.00 ], [ 0.52, 0.00 ], [ 0.60, 0.07 ], [ 0.66, 0.17 ],
	[ 0.68, 0.30 ], [ 0.64, 0.44 ], [ 0.54, 0.57 ], [ 0.40, 0.68 ],
	[ 0.26, 0.77 ], [ 0.16, 0.85 ], [ 0.10, 0.92 ], [ 0.05, 1.00 ],
];

export function buildChurch( parts, terrain, r ) {

	const y = terrain.heightAt( r.cx, r.cz );
	const ang = r.ang;
	const ca = Math.cos( ang ), sa = Math.sin( ang );
	// local axes: `across` runs along the width, `along` down the nave toward the altar
	const ax = ( u, v ) => r.cx + ca * u - sa * v;
	const az = ( u, v ) => r.cz - sa * u - ca * v;

	const navW = Math.min( Math.max( r.w, 8 ), 13 );
	const navL = Math.min( Math.max( r.d, 14 ), 26 );
	const eaves = 8.2;
	const rise = navW * 0.62; // a steep village roof
	const over = 0.45;

	// which end is the west front: the tower stands at -v, the apse at +v
	const towerW = Math.min( navW * 0.52, 6 );
	const vTower = - navL / 2, vApse = navL / 2;

	// ---- plinth and nave walls
	add( parts, box( navW + 0.25, 0.65, navL + 0.25 ), PLINTH, 0.92, mat4( r.cx, y + 0.32, r.cz, 0, ang, 0 ) );
	add( parts, box( navW, eaves, navL ), WALL, 0.9, mat4( r.cx, y + eaves / 2, r.cz, 0, ang, 0 ) );

	// pilasters down both flanks, one between each bay, and the cornice they carry
	const bays = Math.max( 3, Math.round( navL / 4.5 ) );
	for ( const side of [ - 1, 1 ] ) {

		for ( let i = 0; i <= bays; i ++ ) {

			const v = - navL / 2 + ( i / bays ) * navL;
			add( parts, box( 0.22, eaves - 0.5, 0.55 ), TRIM, 0.9,
				mat4( ax( side * navW / 2, v ), y + ( eaves - 0.5 ) / 2, az( side * navW / 2, v ), 0, ang, 0 ) );

		}

		// the tall round-arched windows, one to a bay, in a white surround
		for ( let i = 0; i < bays; i ++ ) {

			const v = - navL / 2 + ( ( i + 0.5 ) / bays ) * navL;
			if ( v < vTower + towerW + 0.6 ) continue; // not through the tower
			const wx = ax( side * navW / 2, v ), wz = az( side * navW / 2, v );
			add( parts, box( 0.14, 3.4, 1.5 ), TRIM, 0.9, mat4( wx, y + 4.6, wz, 0, ang, 0 ) );
			add( parts, box( 0.1, 2.9, 1.1 ), 0x33373a, 0.45, mat4( wx + ca * side * 0.06, y + 4.5, wz - sa * side * 0.06, 0, ang, 0 ) );
			// the arch head
			add( parts, cylinder( 0.55, 0.55, 0.12, 12, 1, false, 0, Math.PI ), TRIM, 0.9,
				mat4( wx, y + 6.3, wz, 0, ang, Math.PI / 2 ) );

		}

	}

	// the cornice under the eaves, carried right round
	add( parts, box( navW + 0.5, 0.3, navL + 0.5 ), TRIM, 0.88, mat4( r.cx, y + eaves - 0.15, r.cz, 0, ang, 0 ) );

	// ---- the roof: two pitched slabs meeting at the ridge
	const slope = Math.atan2( rise, navW / 2 );
	const slabLen = Math.hypot( rise, navW / 2 + over );
	for ( const side of [ - 1, 1 ] ) {

		add( parts, box( slabLen, 0.18, navL + over * 2 ), TILE, 0.84,
			mat4( ax( side * ( navW / 4 + over / 4 ), 0 ), y + eaves + rise / 2, az( side * ( navW / 4 + over / 4 ), 0 ), 0, ang, - side * slope, 1, 1, 1, 'YZX' ) );

	}

	// the gable over the apse end (the west end is closed by the tower)
	const tri = slab( [ [ - navW / 2, 0 ], [ navW / 2, 0 ], [ 0, rise ] ], [], ( u, v, sd ) => new Vector3( u, v, sd * 0.12 ), { edges: false } );
	add( parts, tri, WALL, 0.9, mat4( ax( 0, vApse ), y + eaves, az( 0, vApse ), 0, ang, 0 ) );

	// ---- the apse: a rounded end under a half cone
	const apseR = navW * 0.38;
	add( parts, cylinder( apseR, apseR, eaves - 1.2, 14 ), WALL, 0.9, mat4( ax( 0, vApse + apseR * 0.5 ), y + ( eaves - 1.2 ) / 2, az( 0, vApse + apseR * 0.5 ), 0, 0, 0 ) );
	add( parts, cylinder( 0.08, apseR + 0.35, apseR * 1.15, 14 ), TILE, 0.84,
		mat4( ax( 0, vApse + apseR * 0.5 ), y + eaves - 1.2 + apseR * 0.575, az( 0, vApse + apseR * 0.5 ), 0, 0, 0 ) );

	// ---- the tower, standing in the west front
	const shaft = eaves + rise + 2.6;
	add( parts, box( towerW + 0.3, 0.7, towerW + 0.3 ), PLINTH, 0.92, mat4( ax( 0, vTower ), y + 0.35, az( 0, vTower ), 0, ang, 0 ) );
	add( parts, box( towerW, shaft, towerW ), WALL, 0.9, mat4( ax( 0, vTower ), y + shaft / 2, az( 0, vTower ), 0, ang, 0 ) );
	// corner pilasters
	for ( const su of [ - 1, 1 ] ) for ( const sv of [ - 1, 1 ] ) {

		add( parts, box( 0.3, shaft - 0.6, 0.3 ), TRIM, 0.9,
			mat4( ax( su * towerW / 2, vTower + sv * towerW / 2 ), y + ( shaft - 0.6 ) / 2, az( su * towerW / 2, vTower + sv * towerW / 2 ), 0, ang, 0 ) );

	}

	// the west door, and the round window over it
	add( parts, box( 1.6, 3.0, 0.2 ), TRIM, 0.9, mat4( ax( 0, vTower - towerW / 2 ), y + 1.6, az( 0, vTower - towerW / 2 ), 0, ang, 0 ) );
	add( parts, box( 1.25, 2.6, 0.14 ), 0x5a3a24, 0.6, mat4( ax( 0, vTower - towerW / 2 - 0.05 ), y + 1.45, az( 0, vTower - towerW / 2 - 0.05 ), 0, ang, 0 ) );

	// the belfry stage: a tall round-arched louvred opening on each face, in a white surround
	const belfry = y + shaft - 4.4;
	for ( let f = 0; f < 4; f ++ ) {

		const a = ang + f * Math.PI / 2;
		const ox = Math.sin( a ) * towerW / 2, oz = Math.cos( a ) * towerW / 2;
		const bx = ax( 0, vTower ) + ox, bz = az( 0, vTower ) + oz;
		add( parts, box( 1.9, 3.1, 0.16 ), TRIM, 0.9, mat4( bx, belfry + 1.4, bz, 0, a, 0 ) );
		add( parts, box( 1.45, 2.6, 0.1 ), 0x22262a, 0.6, mat4( bx, belfry + 1.3, bz, 0, a, 0 ) );
		add( parts, cylinder( 0.73, 0.73, 0.12, 12, 1, false, 0, Math.PI ), TRIM, 0.9, mat4( bx, belfry + 2.7, bz, 0, a, Math.PI / 2 ) );

	}

	// the cornice the dome sits on
	const cap = y + shaft;
	add( parts, box( towerW + 0.8, 0.42, towerW + 0.8 ), TRIM, 0.88, mat4( ax( 0, vTower ), cap + 0.21, az( 0, vTower ), 0, ang, 0 ) );

	// ---- the onion dome, its neck and the spire
	const domeH = towerW * 1.35, domeR = towerW * 0.82;
	// lathe takes [ radius, height ] pairs, not vectors
	const profile = ONION.map( ( [ rr, hh ] ) => [ rr * domeR, hh * domeH ] );
	add( parts, lathe( profile, 20 ), METAL, 0.42, mat4( ax( 0, vTower ), cap + 0.42, az( 0, vTower ), 0, ang, 0 ), 0.55 );
	const spireY = cap + 0.42 + domeH;
	add( parts, cylinder( 0.07, 0.17, 2.6, 10 ), METAL, 0.42, mat4( ax( 0, vTower ), spireY + 1.3, az( 0, vTower ), 0, ang, 0 ), 0.55 );
	// the orb and the cross over it
	add( parts, cylinder( 0.22, 0.22, 0.34, 10 ), METAL, 0.35, mat4( ax( 0, vTower ), spireY + 2.75, az( 0, vTower ), 0, ang, 0 ), 0.7 );
	add( parts, box( 0.07, 1.5, 0.07 ), METAL, 0.35, mat4( ax( 0, vTower ), spireY + 3.6, az( 0, vTower ), 0, ang, 0 ), 0.7 );
	add( parts, box( 0.7, 0.07, 0.07 ), METAL, 0.35, mat4( ax( 0, vTower ), spireY + 3.9, az( 0, vTower ), 0, ang, 0 ), 0.7 );

}

function add( parts, geo, color, rough, matrix, metal = 0 ) {

	parts.push( prepare( geo, { color, rough, metal, pattern: PAT.plain, matrix } ) );

}
