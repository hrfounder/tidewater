import { Mesh } from '../../engine/index.js';
import { prepare, mergePrepared, box, cylinder, mat4 } from '../../world/boat/GeoKit.js';
import { createPropMaterial, PAT } from '../../game/GameMaterials.js';

// The road bridges of the block, built on the segments places.json flags as bridges (Roads.js leaves
// their decks out). The one that matters is Most Bosut, the two-lane crossing between Rokovci on the
// north bank and Andrijaševci on the south, which the patch is centred on
// (docs/slavonia/photos/bosut-winter-platforms-bridge.jpg).
//
// Each is a concrete beam bridge as they are built here: a deck carried on a pair of edge beams,
// standing on a cutwater pier or two in the channel and an abutment at each bank, with a steel pipe
// railing along both kerbs and a footway cantilevered on one side.

const CONCRETE = 0xa8a49c;
const CONCRETE_WET = 0x8e8a82; // the piers, stained to the waterline
const RAIL = 0x6f7276;
const DECK_LIFT = 1.15; // the deck stands this far over the bank top, so the road rises to it

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

		// the crossing runs from the first point to the last; the deck is a straight span between
		// the two bank tops, which is what these beam bridges are
		const a = pts[ 0 ], b = pts[ pts.length - 1 ];
		const dx = b.x - a.x, dz = b.z - a.z;
		const span = Math.hypot( dx, dz );
		if ( span < 8 ) continue;
		const yaw = Math.atan2( dx, dz );
		const mx = ( a.x + b.x ) / 2, mz = ( a.z + b.z ) / 2;
		// the deck sits over the higher of the two banks, so neither approach dips into it
		const deckY = Math.max( terrain.heightAt( a.x, a.z ), terrain.heightAt( b.x, b.z ) ) + DECK_LIFT;
		const w = road.width;

		// the deck slab, with a kerb either side
		parts.push( prepare( box( w, 0.42, span ), {
			color: CONCRETE, rough: 0.88, pattern: PAT.plain, matrix: mat4( mx, deckY - 0.21, mz, 0, yaw, 0 ),
		} ) );
		// the wearing course: the road surface carried across
		parts.push( prepare( box( w - 0.5, 0.08, span ), {
			color: 0x3a3a38, rough: 0.72, pattern: PAT.plain, matrix: mat4( mx, deckY + 0.04, mz, 0, yaw, 0 ),
		} ) );
		// the edge beams under the deck, deeper than the slab
		for ( const side of [ - 1, 1 ] ) {

			const ex = mx + Math.cos( yaw ) * side * ( w / 2 - 0.25 );
			const ez = mz - Math.sin( yaw ) * side * ( w / 2 - 0.25 );
			parts.push( prepare( box( 0.42, 0.85, span ), {
				color: CONCRETE, rough: 0.9, pattern: PAT.plain, matrix: mat4( ex, deckY - 0.75, ez, 0, yaw, 0 ),
			} ) );

		}

		// piers: where the deck crosses open water, a pier every ~16 m of span
		const bays = Math.max( 2, Math.round( span / 16 ) );
		for ( let i = 1; i < bays; i ++ ) {

			const t = i / bays;
			const px = a.x + dx * t, pz = a.z + dz * t;
			const bed = terrain.heightAt( px, pz );
			if ( bed > deckY - 1.5 ) continue; // on the bank: the abutment carries it
			const h = deckY - 0.95 - bed;
			parts.push( prepare( box( 1.1, h, 2.6 ), {
				color: CONCRETE_WET, rough: 0.93, pattern: PAT.plain, matrix: mat4( px, bed + h / 2, pz, 0, yaw, 0 ),
			} ) );
			// the cutwater: a round nose upstream and down, so the pier parts the current
			for ( const end of [ - 1, 1 ] ) {

				const nx = px - Math.sin( yaw ) * end * 1.3, nz = pz - Math.cos( yaw ) * end * 1.3;
				parts.push( prepare( cylinder( 0.55, 0.55, h, 10 ), {
					color: CONCRETE_WET, rough: 0.93, pattern: PAT.plain, matrix: mat4( nx, bed + h / 2, nz, 0, 0, 0 ),
				} ) );

			}

		}

		// the abutments: a block at each bank carrying the deck down to the ground
		for ( const end of [ a, b ] ) {

			const g = terrain.heightAt( end.x, end.z );
			const h = Math.max( 0.6, deckY - 0.95 - g + 0.6 );
			const ex = end.x + ( end === a ? dx : - dx ) / span * 1.2;
			const ez = end.z + ( end === a ? dz : - dz ) / span * 1.2;
			parts.push( prepare( box( w + 0.8, h, 2.4 ), {
				color: CONCRETE, rough: 0.9, pattern: PAT.plain, matrix: mat4( ex, g + h / 2 - 0.3, ez, 0, yaw, 0 ),
			} ) );

		}

		// the railing: a top rail and a lower rail on posts, both kerbs
		for ( const side of [ - 1, 1 ] ) {

			const rx = mx + Math.cos( yaw ) * side * w / 2, rz = mz - Math.sin( yaw ) * side * w / 2;
			for ( const [ ry, rr ] of [ [ 1.05, 0.045 ], [ 0.55, 0.035 ] ] ) {

				parts.push( prepare( box( rr * 2, rr * 2, span ), {
					color: RAIL, rough: 0.5, metal: 0.8, pattern: PAT.machined, matrix: mat4( rx, deckY + ry, rz, 0, yaw, 0 ),
				} ) );

			}

			const posts = Math.max( 2, Math.round( span / 2.2 ) );
			for ( let i = 0; i <= posts; i ++ ) {

				const t = i / posts;
				const px = a.x + dx * t + Math.cos( yaw ) * side * w / 2;
				const pz = a.z + dz * t - Math.sin( yaw ) * side * w / 2;
				parts.push( prepare( box( 0.07, 1.15, 0.07 ), {
					color: RAIL, rough: 0.5, metal: 0.8, pattern: PAT.machined, matrix: mat4( px, deckY + 0.55, pz, 0, yaw, 0 ),
				} ) );

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
