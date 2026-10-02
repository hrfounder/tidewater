import { Mesh } from '../../engine/index.js';
import { prepare, mergePrepared, box, cylinder, mat4 } from '../../world/boat/GeoKit.js';
import { createPropMaterial, PAT } from '../../game/GameMaterials.js';

// The road bridges of the block, built on the segments places.json flags as bridges (Roads.js leaves
// their decks out). The one that matters is Most Bosut, the crossing between Rokovci on the north
// bank and Andrijaševci on the south, which the patch is centred on.
//
// From the photographs of it: a concrete beam bridge, the deck carried on a deep fascia beam whose
// outer face is battered, standing on plain blade piers — concrete walls set across the current with
// a chamfered nose, not round cutwaters. A kerbed footway runs along each side of the carriageway,
// with drainage gratings in the kerb line. The parapet is a steel baluster railing, painted blue:
// posts every couple of metres, a flat top rail, a mid rail, and close-set vertical bars. Lamp
// standards stand on the kerb at intervals.

const CONCRETE = 0xb4ae9f; // the deck and the fascia, weathered pale
const CONCRETE_WET = 0x8e8a7e; // the piers, stained to the waterline
const KERB = 0xc2bcb0;
const RAIL = 0x2f6ea8; // the blue of the railing
const ASPHALT = 0x3a3a38;
const LAMP = 0x8d9298;

const DECK_LIFT = 1.25; // the deck stands this far over the bank top

export function buildBridges( { terrain, scene, places } ) {

	if ( ! places || ! places.roads ) return null;
	const [ cE, cN ] = terrain.center;
	const half = terrain.size / 2 - 4;
	const parts = [];
	let count = 0;

	for ( const road of places.roads ) {

		if ( ! road.bridge || road.width < 3 ) continue;
		const pts = road.pts.map( ( [ e, n ] ) => ( { x: e - cE, z: cN - n } ) );
		if ( ! pts.some( ( p ) => Math.abs( p.x ) < half && Math.abs( p.z ) < half ) ) continue;

		const a = pts[ 0 ], b = pts[ pts.length - 1 ];
		const dx = b.x - a.x, dz = b.z - a.z;
		const span = Math.hypot( dx, dz );
		if ( span < 8 ) continue;
		const yaw = Math.atan2( dx, dz );
		const mx = ( a.x + b.x ) / 2, mz = ( a.z + b.z ) / 2;
		const deckY = Math.max( terrain.heightAt( a.x, a.z ), terrain.heightAt( b.x, b.z ) ) + DECK_LIFT;
		const road_w = road.width;
		const foot = 1.3; // the footway each side
		const full = road_w + foot * 2;

		// the deck slab, and under it the fascia beam that carries the edge
		push( parts, box( full, 0.45, span ), CONCRETE, 0.88, mat4( mx, deckY - 0.22, mz, 0, yaw, 0 ) );
		for ( const side of [ - 1, 1 ] ) {

			const ex = mx + Math.cos( yaw ) * side * ( full / 2 - 0.2 );
			const ez = mz - Math.sin( yaw ) * side * ( full / 2 - 0.2 );
			// deep, with the outer face battered back toward the soffit
			push( parts, box( 0.44, 0.95, span ), CONCRETE, 0.9, mat4( ex, deckY - 0.9, ez, 0, yaw, 0 ) );
			push( parts, box( 0.3, 0.5, span ), CONCRETE, 0.9, mat4( ex - Math.cos( yaw ) * side * 0.1, deckY - 1.55, ez + Math.sin( yaw ) * side * 0.1, 0, yaw, 0 ) );

		}

		// the carriageway, and the raised footway with its kerb either side
		push( parts, box( road_w, 0.09, span ), ASPHALT, 0.74, mat4( mx, deckY + 0.045, mz, 0, yaw, 0 ) );
		for ( const side of [ - 1, 1 ] ) {

			const fx = mx + Math.cos( yaw ) * side * ( road_w / 2 + foot / 2 );
			const fz = mz - Math.sin( yaw ) * side * ( road_w / 2 + foot / 2 );
			push( parts, box( foot, 0.18, span ), KERB, 0.86, mat4( fx, deckY + 0.09, fz, 0, yaw, 0 ) );
			// the drainage gratings set in the kerb line
			const grates = Math.max( 2, Math.round( span / 9 ) );
			for ( let i = 0; i < grates; i ++ ) {

				const t = ( i + 0.5 ) / grates;
				const gx = a.x + dx * t + Math.cos( yaw ) * side * ( road_w / 2 - 0.2 );
				const gz = a.z + dz * t - Math.sin( yaw ) * side * ( road_w / 2 - 0.2 );
				push( parts, box( 0.34, 0.04, 0.5 ), 0x4a4d50, 0.6, mat4( gx, deckY + 0.11, gz, 0, yaw, 0 ), 0.5 );

			}

		}

		// the piers: concrete blades across the current, with a chamfered nose
		const bays = Math.max( 2, Math.round( span / 17 ) );
		for ( let i = 1; i < bays; i ++ ) {

			const t = i / bays;
			const px = a.x + dx * t, pz = a.z + dz * t;
			const bed = terrain.heightAt( px, pz );
			if ( bed > deckY - 1.8 ) continue; // on the bank: the abutment carries it
			const h = deckY - 1.6 - bed;
			push( parts, box( 1.0, h, 3.2 ), CONCRETE_WET, 0.93, mat4( px, bed + h / 2, pz, 0, yaw, 0 ) );
			for ( const end of [ - 1, 1 ] ) {

				const nx = px - Math.sin( yaw ) * end * 1.6, nz = pz - Math.cos( yaw ) * end * 1.6;
				push( parts, box( 0.72, h, 0.72 ), CONCRETE_WET, 0.93, mat4( nx, bed + h / 2, nz, 0, yaw + Math.PI / 4, 0 ) );

			}

			// the head the deck beams bear on
			push( parts, box( 1.3, 0.5, 4.2 ), CONCRETE, 0.9, mat4( px, deckY - 1.45, pz, 0, yaw, 0 ) );

		}

		// the abutments at each bank
		for ( const end of [ a, b ] ) {

			const g = terrain.heightAt( end.x, end.z );
			const h = Math.max( 0.7, deckY - 1.5 - g + 0.7 );
			const ex = end.x + ( end === a ? dx : - dx ) / span * 1.3;
			const ez = end.z + ( end === a ? dz : - dz ) / span * 1.3;
			push( parts, box( full + 0.6, h, 2.6 ), CONCRETE, 0.9, mat4( ex, g + h / 2 - 0.35, ez, 0, yaw, 0 ) );

		}

		// ---- the parapet: posts, a flat top rail, a mid rail and close vertical bars, all blue
		for ( const side of [ - 1, 1 ] ) {

			const rx = mx + Math.cos( yaw ) * side * ( full / 2 - 0.18 );
			const rz = mz - Math.sin( yaw ) * side * ( full / 2 - 0.18 );
			const base = deckY + 0.18;
			push( parts, box( 0.1, 0.07, span ), RAIL, 0.5, mat4( rx, base + 1.06, rz, 0, yaw, 0 ), 0.75 );
			push( parts, box( 0.07, 0.05, span ), RAIL, 0.5, mat4( rx, base + 0.55, rz, 0, yaw, 0 ), 0.75 );
			const posts = Math.max( 2, Math.round( span / 2.2 ) );
			for ( let i = 0; i <= posts; i ++ ) {

				const t = i / posts;
				const px = a.x + dx * t + Math.cos( yaw ) * side * ( full / 2 - 0.18 );
				const pz = a.z + dz * t - Math.sin( yaw ) * side * ( full / 2 - 0.18 );
				push( parts, box( 0.09, 1.1, 0.09 ), RAIL, 0.5, mat4( px, base + 0.55, pz, 0, yaw, 0 ), 0.75 );

			}

			// the bars between them
			const bars = Math.max( 4, Math.round( span / 0.14 ) );
			for ( let i = 0; i < bars; i ++ ) {

				const t = ( i + 0.5 ) / bars;
				const px = a.x + dx * t + Math.cos( yaw ) * side * ( full / 2 - 0.18 );
				const pz = a.z + dz * t - Math.sin( yaw ) * side * ( full / 2 - 0.18 );
				push( parts, box( 0.025, 1.0, 0.025 ), RAIL, 0.5, mat4( px, base + 0.53, pz, 0, yaw, 0 ), 0.75 );

			}

			// lamp standards on the kerb
			const lamps = Math.max( 1, Math.round( span / 18 ) );
			if ( side > 0 ) for ( let i = 0; i < lamps; i ++ ) {

				const t = ( i + 0.5 ) / lamps;
				const px = a.x + dx * t + Math.cos( yaw ) * side * ( full / 2 - 0.5 );
				const pz = a.z + dz * t - Math.sin( yaw ) * side * ( full / 2 - 0.5 );
				push( parts, cylinder( 0.07, 0.11, 7.0, 8 ), LAMP, 0.45, mat4( px, base + 3.5, pz, 0, yaw, 0 ), 0.6 );
				push( parts, box( 0.5, 0.12, 0.26 ), LAMP, 0.45, mat4( px - Math.cos( yaw ) * side * 0.3, base + 7.0, pz + Math.sin( yaw ) * side * 0.3, 0, yaw, 0 ), 0.6 );

			}

		}

		count ++;

	}

	if ( ! parts.length ) return null;
	const mesh = new Mesh( mergePrepared( parts ), createPropMaterial( 'slavoniaBridges' ) );
	mesh.name = 'bridges';
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	mesh.userData.count = count;
	scene.add( mesh );
	return mesh;

}

function push( parts, geo, color, rough, matrix, metal = 0 ) {

	parts.push( prepare( geo, { color, rough, metal, pattern: PAT.plain, matrix } ) );

}
