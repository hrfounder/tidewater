import { Vector3 } from '../../engine/index.js';
import { TileTerrain } from './TileTerrain.js';
import { GROUND_SURFACE } from './GroundSurface.js';
import { buildPlatforms } from './Platforms.js';
import { Flora } from './Flora.js';
import { buildRoads } from './Roads.js';
import { buildBuildings } from './Buildings.js';
import { buildBridges } from './Bridge.js';

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
	// the two stalls on the park bank, both facing the water ( a stall faces ( sin yaw, cos yaw ),
	// and the river runs away to the north here, so yaw is near PI )
	stand: { x: 112, z: 10, yaw: Math.PI - 0.25 },
	chandlery: { x: 76, z: 12, yaw: Math.PI + 0.2 },
};

// The Bosut on a still day: a 30 m wide channel about 2.5 m deep, light air, and a fetch of only the
// river's own width, so the surface carries fine wind ripples and nothing else. The ocean's cascades
// (733 m down to 7 m) are swell-sized here, so the region sets its own, and the shallow depth puts
// the dispersion in the right regime. Turbid green-brown water, about a metre of visibility
// (docs/slavonia/photos).
export const WATER = {
	windSpeed: 2.2,
	windDir: [ 0.6, - 0.8 ],
	fft: {
		// ripple-sized cascades: a 61 m tile down to 0.73 m capillary detail
		sizes: [ 61, 13.7, 3.1, 0.73 ],
		depth: 2.5,
		choppiness: 0.3,
		// fetch is the river's width in km; no swell reaches an inland channel
		local: { windSpeed: 2.2, windDirection: - 37, fetch: 0.03, spreadBlend: 0.5, swell: 0.0 },
		swell: { scale: 0.0, windSpeed: 1, windDirection: 0, fetch: 1, spreadBlend: 1.0, swell: 0.0, shortWavesFade: 0.1 },
	},
	// whitecaps need wind the Bosut never sees
	foam: { bias: 0.2, gain: 0.6, add: 0.3 },
	// per metre: strong absorption of red and blue, scattering by silt and algae (green-brown)
	absorption: [ 0.95, 0.6, 0.75 ],
	scattering: [ 0.22, 0.26, 0.14 ],
};

// How far the ground mesh reaches. The patch is 2 km of real data; past it the heightfield reports
// the plain's own level, and the Slavonian lowland really does run flat to the horizon, so the mesh
// carries on rather than ending at a cliff with the water plane showing beyond it. The water grid
// follows the camera, so the ground has to outrun the view: from the highest progress view (650 m)
// the horizon is about 90 km away, and 131 km of plain keeps the sea out of every shot. Past the
// data the ground is flat, so the far nodes are the coarsest the quadtree has.
export const TERRAIN_EXTENT = 131072;

export { GROUND_SURFACE };

// hand-built places in the patch (call once the terrain exists)
export function buildPlaces( { terrain, scene, places = null } ) {

	return {
		roads: buildRoads( { terrain, scene, places } ),
		bridges: buildBridges( { terrain, scene, places } ),
		buildings: buildBuildings( { terrain, scene, places } ),
		platforms: buildPlatforms( { terrain, scene } ),
		flora: new Flora( { scene, terrain } ),
	};

}

// the terrain patch around the bridge (2 km at 1 m)
export async function loadTerrain( base = typeof document !== 'undefined' ? document.baseURI : '' ) {

	const dir = new URL( TILES, base );
	const index = await ( await fetch( new URL( 'index.json', dir ) ) ).json();
	return TileTerrain.load( { index, center: index.center, readFile: async ( f ) => ( await fetch( new URL( f, dir ) ) ).arrayBuffer() } );

}

// the roads and building footprints of the block (tools/geodata/places.py)
export async function loadPlaces( base = typeof document !== 'undefined' ? document.baseURI : '' ) {

	try {

		return await ( await fetch( new URL( TILES + 'places.json', base ) ) ).json();

	} catch ( e ) {

		console.warn( 'places.json missing: no roads or buildings', e );
		return null;

	}

}

// Write the layout overrides into the shared layout object. Each entry is written into the object
// already there, never replaced: the stalls and the boat hold those objects by reference.
export function applyLayout( WORLD ) {

	for ( const [ k, v ] of Object.entries( LAYOUT ) ) Object.assign( WORLD[ k ], v );

}
