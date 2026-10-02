import { Mesh, Vector3 } from '../../engine/index.js';
import { prepare, mergePrepared, box, mat4 } from '../../world/boat/GeoKit.js';
import { createPropMaterial, PAT } from '../../game/GameMaterials.js';

// The roads of the block, from public/world/bosut/places.json (OpenStreetMap via Overture, ODbL).
// Each road is a ribbon of quads laid on the ground along its centreline: asphalt for the lanes
// through Rokovci and Andrijaševci, gravel and packed earth for the field tracks, with a shoulder
// of worn ground either side. The bridge over the Bosut is carried by Bridge.js, so the deck of a
// segment flagged as a bridge is left out here and only its approaches are drawn.
//
// Coordinates: places.json is in the projected grid (EPSG:3765); the patch's own centre turns them
// into the game's metres (x east, z south), the same way the river lines are placed.

// how each class is surfaced
const SURFACE = {
	motorway: 'asphalt', trunk: 'asphalt', primary: 'asphalt', secondary: 'asphalt', tertiary: 'asphalt',
	residential: 'asphalt', living_street: 'asphalt', unclassified: 'gravel', service: 'gravel',
	track: 'earth', footway: 'earth', path: 'earth', cycleway: 'asphalt', steps: 'earth',
};

const COLOR = {
	// weathered asphalt is nearly grey-brown, not black; the gravel here is crushed limestone
	asphalt: 0x3a3a38, gravel: 0x8c8676, earth: 0x6e6050,
};
const ROUGH = { asphalt: 0.72, gravel: 0.93, earth: 0.95 };

// a road is lifted this far over the ground so it never z-fights with the terrain
const LIFT = 0.07;

export function buildRoads( { terrain, scene, places } ) {

	if ( ! places || ! places.roads || ! places.roads.length ) return null;
	const [ cE, cN ] = terrain.center;
	const parts = [];
	let count = 0;
	for ( const road of places.roads ) {

		const surface = SURFACE[ road.class ] || 'earth';
		const pts = road.pts.map( ( [ e, n ] ) => ( { x: e - cE, z: cN - n } ) );
		// drop anything that falls outside the patch: the ground there is the flat plain
		const half = terrain.size / 2 - 4;
		if ( ! pts.some( ( p ) => Math.abs( p.x ) < half && Math.abs( p.z ) < half ) ) continue;
		if ( road.bridge ) continue; // the bridge carries its own deck
		const w = road.width;
		// the centreline is resampled to a few metres so the ribbon follows the ground
		const line = resample( pts, 4 );
		for ( let i = 0; i + 1 < line.length; i ++ ) {

			const a = line[ i ], b = line[ i + 1 ];
			const dx = b.x - a.x, dz = b.z - a.z;
			const len = Math.hypot( dx, dz );
			if ( len < 0.05 ) continue;
			const yaw = Math.atan2( dx, dz );
			const mx = ( a.x + b.x ) / 2, mz = ( a.z + b.z ) / 2;
			const y = terrain.heightAt( mx, mz ) + LIFT;
			// the carriageway, and a worn shoulder a little wider and lower
			parts.push( prepare( box( w, 0.06, len + 0.4 ), {
				color: COLOR[ surface ], rough: ROUGH[ surface ], pattern: PAT.plain,
				matrix: mat4( mx, y, mz, 0, yaw, 0 ),
			} ) );
			if ( surface !== 'earth' ) parts.push( prepare( box( w + 1.6, 0.05, len + 0.4 ), {
				color: COLOR.earth, rough: 0.95, pattern: PAT.plain,
				matrix: mat4( mx, y - 0.035, mz, 0, yaw, 0 ),
			} ) );

		}

		count ++;

	}

	if ( ! parts.length ) return null;
	const mesh = new Mesh( mergePrepared( parts ), createPropMaterial( 'slavoniaRoads' ) );
	mesh.name = 'roads';
	mesh.receiveShadow = true;
	mesh.castShadow = false;
	mesh.userData.count = count;
	scene.add( mesh );
	return mesh;

}

// walk the line, emitting a point every `step` metres (the last point is always kept)
function resample( pts, step ) {

	const out = [ pts[ 0 ] ];
	let carry = 0;
	for ( let i = 0; i + 1 < pts.length; i ++ ) {

		const a = pts[ i ], b = pts[ i + 1 ];
		const len = Math.hypot( b.x - a.x, b.z - a.z );
		let t = carry;
		while ( t < len ) {

			out.push( { x: a.x + ( b.x - a.x ) * t / len, z: a.z + ( b.z - a.z ) * t / len } );
			t += step;

		}

		carry = t - len;

	}

	out.push( pts[ pts.length - 1 ] );
	return out;

}

export const _v = Vector3;
