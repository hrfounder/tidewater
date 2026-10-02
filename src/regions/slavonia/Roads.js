import { Mesh, Vector3 } from '../../engine/index.js';
import { prepare, mergePrepared, gridSurface } from '../../world/boat/GeoKit.js';
import { createPropMaterial, PAT } from '../../game/GameMaterials.js';

// The roads of the block, from public/world/bosut/places.json (OpenStreetMap via Overture, ODbL).
//
// Each road is one continuous ribbon draped over the ground along its centreline, not a box per
// segment: boxes overlapped at every bend and stepped in height, which is what the lanes looked like
// from the air. The centreline is resampled every few metres, each station gets a mitred normal so
// the two edges stay parallel through a bend, and the strip follows the terrain.
//
// Asphalt for the lanes through Rokovci and Andrijaševci, gravel and packed earth for the field
// tracks, each with a worn shoulder a little wider and lower. The bridge over the Bosut carries its
// own deck (Bridge.js), so a segment flagged as a bridge is left out here.
//
// Coordinates: places.json is in the projected grid (EPSG:3765); the patch's own centre turns them
// into the game's metres (x east, z south), the same way the river lines are placed.

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

const STEP = 3; // m between stations: close enough to follow the ground and a bend
const LIFT = 0.07; // the surface stands this far over the ground, clear of z-fighting

export function buildRoads( { terrain, scene, places } ) {

	if ( ! places || ! places.roads || ! places.roads.length ) return null;
	const [ cE, cN ] = terrain.center;
	const half = terrain.size / 2 - 4;
	const parts = [];
	let count = 0;

	for ( const road of places.roads ) {

		if ( road.bridge ) continue;
		const surface = SURFACE[ road.class ] || 'earth';
		const pts = road.pts.map( ( [ e, n ] ) => ( { x: e - cE, z: cN - n } ) );
		if ( ! pts.some( ( p ) => Math.abs( p.x ) < half && Math.abs( p.z ) < half ) ) continue;
		const line = resample( pts, STEP );
		if ( line.length < 2 ) continue;

		const carriage = ribbon( terrain, line, road.width / 2, LIFT );
		if ( ! carriage ) continue;
		parts.push( prepare( carriage, { color: COLOR[ surface ], rough: ROUGH[ surface ], pattern: PAT.plain } ) );
		if ( surface !== 'earth' ) {

			const shoulder = ribbon( terrain, line, road.width / 2 + 0.8, LIFT - 0.035 );
			if ( shoulder ) parts.push( prepare( shoulder, { color: COLOR.earth, rough: 0.95, pattern: PAT.plain } ) );

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

// One strip of ground `halfWidth` either side of the line, following the terrain.
function ribbon( terrain, line, halfWidth, lift ) {

	const rows = [];
	for ( let i = 0; i < line.length; i ++ ) {

		const p = line[ i ];
		// the mitred normal: the average of the directions either side of this station, so the two
		// edges stay parallel through a bend instead of pinching or flaring
		const a = line[ Math.max( 0, i - 1 ) ], b = line[ Math.min( line.length - 1, i + 1 ) ];
		let dx = b.x - a.x, dz = b.z - a.z;
		const l = Math.hypot( dx, dz );
		if ( l < 1e-4 ) continue;
		dx /= l; dz /= l;
		const nx = - dz, nz = dx;
		const lx = p.x - nx * halfWidth, lz = p.z - nz * halfWidth;
		const rx = p.x + nx * halfWidth, rz = p.z + nz * halfWidth;
		rows.push( [
			new Vector3( lx, terrain.heightAt( lx, lz ) + lift, lz ),
			new Vector3( rx, terrain.heightAt( rx, rz ) + lift, rz ),
		] );

	}

	return rows.length > 1 ? gridSurface( rows ) : null;

}

// walk the line, emitting a point every `step` metres (the last point is always kept)
function resample( pts, step ) {

	const out = [ pts[ 0 ] ];
	let carry = step;
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
