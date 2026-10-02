import { Vector3 } from '../../engine/index.js';
import { TileTerrain } from './terrain/TileTerrain.js';
import { gradeTerrain } from './terrain/Grade.js';
import { buildSite, occupy, waterDatum } from './site/Site.js';
import { SEEN, PARTED, ADDED, BESIDE, OPEN, AREAS, TREES, MARINAS, DECKS, PROPS } from './Survey.js';
import { LANDMARKS } from './Landmarks.js';
import { loadModels } from './build/Models.js';
import { buildVillage } from './build/Village.js';
import { Flora } from './flora/Flora.js';
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

// The world from its files. `read( path )` resolves to the ArrayBuffer of a file under public/ (the
// browser fetches it, the node checks read it off the disk): { site, terrain, models }.
export async function loadWorld( read = fetchFile() ) {

	const tile = ( file ) => read( TILES + file );
	const json = async ( file ) => JSON.parse( new TextDecoder().decode( await tile( file ) ) );
	const index = await json( 'index.json' );
	const [ water, places, survey, models ] = await Promise.all( [ json( index.water ), json( 'places.json' ), json( 'survey.json' ), loadModels( read ) ] );
	const datum = waterDatum( water, index.center );
	const terrain = await TileTerrain.load( { index, readFile: tile, size: DOMAIN, datum } );
	// each landmark as it is declared, with what its model says of itself on the ground
	const landmarks = new Map( LANDMARKS.map( ( l ) => [ l.name.toLowerCase(), { ...l, plan: models.landmarks.get( l.name.toLowerCase() ).plan } ] ) );
	const site = buildSite( { index, water, places, survey, seen: SEEN, parted: PARTED, added: ADDED, beside: BESIDE, open: OPEN, areas: AREAS, trees: TREES, marinas: MARINAS, decks: DECKS, props: PROPS, datum, landmarks, ground: ( x, z ) => terrain.heightAt( x, z ) } );
	gradeTerrain( terrain, site );
	occupy( site, terrain, models.kit );
	return { site, terrain, models };

}

function fetchFile( base = document.baseURI ) {

	return async ( path ) => ( await fetch( new URL( path, base ) ) ).arrayBuffer();

}

// what stands on the ground: world is what loadWorld gave; colliders may be null (a render without a player)
export function buildPlaces( world, { scene, colliders } ) {

	return { village: buildVillage( world, { scene, colliders } ), flora: new Flora( world, { scene } ) };

}

// Where the game's fixed things stand in this world (the entries of world/WorldLayout.js that a
// region places), from the Site's park: x = east, z = south (m). The player looks along
// -( sin yaw, cos yaw ); a stall faces ( sin yaw, cos yaw ), and the boat's bow points that way too.
export function layoutOf( { site } ) {

	const { start, boat, stand, chandlery } = site.park;
	const here = { position: new Vector3( start.x, 0, start.z ), yaw: Math.atan2( - start.toWater[ 0 ], - start.toWater[ 1 ] ) };
	const stall = ( s ) => ( { x: s.x, z: s.z, yaw: Math.atan2( s.toWater[ 0 ], s.toWater[ 1 ] ) } );
	return {
		start: here, spawn: { position: here.position.clone(), yaw: here.yaw },
		boatDock: { position: new Vector3( boat.x, 0, boat.z ), heading: Math.atan2( boat.upstream[ 0 ], boat.upstream[ 1 ] ) },
		stand: stall( stand ), chandlery: stall( chandlery ),
	};

}

// Write the layout into the shared layout object. Each entry is written into the object already
// there, never replaced: the stalls and the boat hold those objects by reference.
export function applyLayout( WORLD, world ) {

	for ( const [ k, v ] of Object.entries( layoutOf( world ) ) ) Object.assign( WORLD[ k ], v );

}
