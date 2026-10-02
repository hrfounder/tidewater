import { Vector3 } from '../../engine/index.js';
import { TileTerrain } from './terrain/TileTerrain.js';
import { gradeTerrain } from './terrain/Grade.js';
import { buildSite, occupy, waterDatum } from './site/Site.js';
import { LANDMARKS } from './Landmarks.js';
import { GROUND_SURFACE } from './GroundSurface.js';

// The Slavonian world as App builds it (?region=slavonia): the block around Most Bosut from the map
// data in public/world/bosut/. Loaded on demand (dynamic import) so the island never pulls it in.
//
//   map files -> Site (site/Site.js) -> the ground, cut by the Site (terrain/) -> what stands on it
//
// Until the shared WORLD layout (world/WorldLayout.js) moves into the regions (docs/slavonia/ROADMAP.md,
// M2), the layout overrides below are written into WORLD before any system reads it.

export const TILES = 'world/bosut/';

// The side of the patch in metres: the mapped block (places.json is 4 km of roads and buildings)
// inside the next power of two, which the terrain's quadtree needs.
export const DOMAIN = 4096;

// x = east, z = south (m) from the bridge; see views.js
export const LAYOUT = {
	// on the park bank south-east of the bridge, facing the water
	start: { position: new Vector3( 95, 0, - 2 ), yaw: 0.6 },
	spawn: { position: new Vector3( 95, 0, - 2 ), yaw: 0.6 },
	// on the water off the park, bow upstream (east)
	boatDock: { position: new Vector3( 60, 0, - 15 ), heading: Math.PI / 2 },
	// the two stalls on the park bank, both facing the water ( a stall faces ( sin yaw, cos yaw ),
	// and the river runs away to the north here, so yaw is near PI )
	stand: { x: 112, z: 10, yaw: Math.PI - 0.25 },
	chandlery: { x: 76, z: 12, yaw: Math.PI + 0.2 },
};

// The Bosut on a still day: a channel about 2.5 m deep, light air, so the surface carries fine wind
// ripples and nothing else. The ocean's cascades (733 m down to 7 m) are swell-sized here, so the
// region sets its own, and the shallow depth puts the dispersion in the right regime. Turbid
// green-brown water, about a metre of visibility (docs/slavonia/photos).
export const WATER = {
	windSpeed: 2.2,
	windDir: [ 0.6, - 0.8 ],
	fft: {
		// ripple-sized cascades: a 61 m tile down to 0.73 m capillary detail
		sizes: [ 61, 13.7, 3.1, 0.73 ],
		depth: 2.5,
		choppiness: 0.3,
		// Fetch is how far the wind has blown over open water, and on a river that is the straight
		// reach it blows along, not the width: the Bosut runs half a kilometre between bends. Taking
		// the width instead left the spectrum peaking at a couple of centimetres, so the surface
		// fizzed at 9 Hz and read as a mountain stream. Half a kilometre puts the peak near 0.6 m and
		// 1.5 Hz, which is the slow ripple of a lowland river. shortWavesFade damps the capillary
		// tail that short fetch exaggerates; no swell reaches an inland channel.
		local: { windSpeed: 2.2, windDirection: - 37, fetch: 0.5, spreadBlend: 0.5, swell: 0.0, shortWavesFade: 0.15 },
		swell: { scale: 0.0, windSpeed: 1, windDirection: 0, fetch: 1, spreadBlend: 1.0, swell: 0.0, shortWavesFade: 0.1 },
	},
	// whitecaps need wind the Bosut never sees
	foam: { bias: 0.2, gain: 0.6, add: 0.3 },
	// per metre: strong absorption of red and blue, scattering by silt and algae (green-brown)
	absorption: [ 0.95, 0.6, 0.75 ],
	scattering: [ 0.22, 0.26, 0.14 ],
};

// How far the ground mesh reaches. Past the tiles the heightfield reports the level of the plain,
// and the Slavonian lowland really does run flat to the horizon, so the mesh carries on rather than
// ending at a cliff with the water plane showing beyond it. The water grid follows the camera, so
// the ground has to outrun the view: from the highest progress view (650 m) the horizon is about
// 90 km away, and 131 km of plain keeps the sea out of every shot.
export const TERRAIN_EXTENT = 131072;

export { GROUND_SURFACE };

// The world from its map files. `read( file )` resolves to the ArrayBuffer of a file of the block
// (the browser fetches it, the node checks read it off the disk): { site, terrain }.
export async function loadWorld( read = fetchFile() ) {

	const json = async ( file ) => JSON.parse( new TextDecoder().decode( await read( file ) ) );
	const index = await json( 'index.json' );
	const [ water, places ] = await Promise.all( [ json( index.water ), json( 'places.json' ) ] );
	const datum = waterDatum( water, index.center );
	const terrain = await TileTerrain.load( { index, readFile: read, size: DOMAIN, datum } );
	const landmarks = new Set( LANDMARKS.map( ( l ) => l.name.toLowerCase() ) );
	const site = buildSite( { index, water, places, datum, landmarks, ground: ( x, z ) => terrain.heightAt( x, z ) } );
	gradeTerrain( terrain, site );
	occupy( site, terrain );
	return { site, terrain };

}

function fetchFile( base = document.baseURI ) {

	return async ( file ) => ( await fetch( new URL( TILES + file, base ) ) ).arrayBuffer();

}

// what stands on the ground (call once the terrain exists)
export function buildPlaces() {

	return {};

}

// Write the layout overrides into the shared layout object. Each entry is written into the object
// already there, never replaced: the stalls and the boat hold those objects by reference.
export function applyLayout( WORLD ) {

	for ( const [ k, v ] of Object.entries( LAYOUT ) ) Object.assign( WORLD[ k ], v );

}
