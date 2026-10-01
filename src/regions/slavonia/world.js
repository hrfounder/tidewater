import { Vector3 } from '../../engine/index.js';
import { TileTerrain } from './TileTerrain.js';
import { GROUND_SURFACE } from './GroundSurface.js';
import { buildPlatforms } from './Platforms.js';

// The Slavonian world as App builds it (?region=slavonia): the real terrain from the world tiles of
// the core block around Most Bosut (public/world/bosut/), its ground shader, calm river water, and
// the places in it. Loaded on demand (dynamic import) so the island never pulls it in.
//
// Until the shared WORLD layout (world/WorldLayout.js) moves into the regions (docs/slavonia/ROADMAP.md,
// M2), the layout overrides below are written into WORLD before any system reads it.

export const TILES = 'world/bosut/';

// x = east, z = south (m) from the bridge; see views.js
export const LAYOUT = {
	// on the park bank south-east of the bridge, among the fishing platforms, facing the water
	start: { position: new Vector3( 95, 0, - 2 ), yaw: 0.6 },
	spawn: { position: new Vector3( 95, 0, - 2 ), yaw: 0.6 },
	// on the water off the park, bow upstream (east)
	boatDock: { position: new Vector3( 60, 0, - 15 ), heading: Math.PI / 2 },
};

// The Bosut on a still day: light air, short fetch, no swell; turbid green-brown water (about a metre
// of visibility, docs/slavonia/photos).
export const WATER = {
	windSpeed: 2.2,
	windDir: [ 0.6, - 0.8 ],
	fft: {
		local: { windSpeed: 2.2, windDirection: - 37, fetch: 1.5, spreadBlend: 0.6, swell: 0.0 },
		swell: { scale: 0.0, windSpeed: 1, windDirection: 0, fetch: 1, spreadBlend: 1.0, swell: 0.0, shortWavesFade: 0.1 },
	},
	// per metre: strong absorption of red and blue, scattering by silt and algae (green-brown)
	absorption: [ 0.95, 0.6, 0.75 ],
	scattering: [ 0.22, 0.26, 0.14 ],
};

export { GROUND_SURFACE };

// hand-built places in the patch (call once the terrain exists)
export function buildPlaces( { terrain, scene } ) {

	return { platforms: buildPlatforms( { terrain, scene } ) };

}

// the terrain patch around the bridge (2 km at 1 m)
export async function loadTerrain( base = typeof document !== 'undefined' ? document.baseURI : '' ) {

	const dir = new URL( TILES, base );
	const index = await ( await fetch( new URL( 'index.json', dir ) ) ).json();
	return TileTerrain.load( { index, center: index.center, readFile: async ( f ) => ( await fetch( new URL( f, dir ) ) ).arrayBuffer() } );

}

// write the layout overrides into the shared layout object
export function applyLayout( WORLD ) {

	for ( const [ k, v ] of Object.entries( LAYOUT ) ) WORLD[ k ] = v;

}
