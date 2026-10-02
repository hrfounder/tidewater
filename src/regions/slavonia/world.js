import { Vector3 } from '../../engine/index.js';
import { TileTerrain } from './terrain/TileTerrain.js';
import { gradeTerrain } from './terrain/Grade.js';
import { buildSite, occupy, waterDatum } from './site/Site.js';
import { LANDMARKS } from './Landmarks.js';
import { loadModels } from './build/Models.js';
import { buildVillage } from './build/Village.js';
import { FREE } from './site/Occupancy.js';
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

// Where the game's fixed things stand: on the park, the south bank of the Bosut upstream (east) of
// Most Bosut. Each is so many metres up the river from the bridge and so far back from the bank,
// and the Site says where that bank is (`layoutOf`).
const PARK = {
	bridge: 'Most Bosut',
	// looking downstream, the park is on the left bank
	side: - 1,
	// metres upstream of the bridge, along the river's course
	start: 95, boat: 60, stand: 112, chandlery: 76,
	// the player starts this far back from the top of the bank, the stalls this far (m)
	startBack: 1.5, stallBack: 7,
	// the boat lies this far off the waterline (m): clear of the bank's underwater slope
	boatOff: 8,
	// a stall needs this much free ground around its middle (m); where its place is taken (the map
	// has a house on the park) it stands at the next free place up the bank, a step at a time
	stallClear: 4, stallStep: 4,
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

// The world from its files. `read( path )` resolves to the ArrayBuffer of a file under public/ (the
// browser fetches it, the node checks read it off the disk): { site, terrain, models }.
export async function loadWorld( read = fetchFile() ) {

	const tile = ( file ) => read( TILES + file );
	const json = async ( file ) => JSON.parse( new TextDecoder().decode( await tile( file ) ) );
	const index = await json( 'index.json' );
	const [ water, places, models ] = await Promise.all( [ json( index.water ), json( 'places.json' ), loadModels( read ) ] );
	const datum = waterDatum( water, index.center );
	const terrain = await TileTerrain.load( { index, readFile: tile, size: DOMAIN, datum } );
	const landmarks = new Map( LANDMARKS.map( ( l ) => [ l.name.toLowerCase(), l ] ) );
	const site = buildSite( { index, water, places, datum, landmarks, ground: ( x, z ) => terrain.heightAt( x, z ) } );
	gradeTerrain( terrain, site );
	occupy( site, terrain );
	return { site, terrain, models };

}

function fetchFile( base = document.baseURI ) {

	return async ( path ) => ( await fetch( new URL( path, base ) ) ).arrayBuffer();

}

// what stands on the ground: world is what loadWorld gave; colliders may be null (a render without a player)
export function buildPlaces( world, { scene, colliders } ) {

	return { village: buildVillage( world, { scene, colliders } ) };

}

// Where the game's fixed things stand in this world (the entries of world/WorldLayout.js that a
// region places): x = east, z = south (m).
export function layoutOf( { site } ) {

	const { water, roads } = site;
	const bridge = roads.roads.find( ( r ) => r.bridge && r.name === PARK.bridge );
	const mid = bridge.pts[ bridge.pts.length >> 1 ];
	// the river's course under the bridge, and the point of it nearest the bridge
	let course = null, at = 0, best = Infinity;
	for ( const b of water.bodies ) if ( b.kind === 'line' && b.current ) b.pts.forEach( ( p, i ) => {

		const d = Math.hypot( p[ 0 ] - mid[ 0 ], p[ 1 ] - mid[ 1 ] );
		if ( d < best ) { best = d; course = b; at = i; }

	} );
	// the bank `up` metres upstream of the bridge: the points run downstream, so upstream is back
	const bank = ( up ) => {

		let i = at, left = up;
		while ( i > 1 && left > 0 ) { left -= Math.hypot( course.pts[ i ][ 0 ] - course.pts[ i - 1 ][ 0 ], course.pts[ i ][ 1 ] - course.pts[ i - 1 ][ 1 ] ); i --; }
		const p = course.pts[ i ], q = course.pts[ i + 1 ], l = Math.hypot( q[ 0 ] - p[ 0 ], q[ 1 ] - p[ 1 ] );
		const tx = ( q[ 0 ] - p[ 0 ] ) / l, tz = ( q[ 1 ] - p[ 1 ] ) / l;
		// toward the park's bank: left of downstream is ( tz, -tx ), right is ( -tz, tx )
		const nx = - tz * PARK.side, nz = tx * PARK.side;
		return { ...water.bankFrom( p[ 0 ], p[ 1 ], nx, nz ), nx, nz, tx, tz };

	};
	// a spot `back` metres behind the top of the bank ( negative: out over the water from its edge )
	const spot = ( b, back ) => back >= 0 ? [ b.top[ 0 ] + b.nx * back, b.top[ 1 ] + b.nz * back ] : [ b.edge[ 0 ] + b.nx * back, b.edge[ 1 ] + b.nz * back ];
	const start = bank( PARK.start ), boat = bank( PARK.boat );
	const [ sx, sz ] = spot( start, PARK.startBack ), [ bx, bz ] = spot( boat, - PARK.boatOff );
	// the player looks along -( sin yaw, cos yaw ), a stall faces ( sin yaw, cos yaw ), and both face
	// the water: back along the bank's normal
	const here = { position: new Vector3( sx, 0, sz ), yaw: Math.atan2( start.nx, start.nz ) };
	const stall = ( up ) => {

		for ( ; ; up += PARK.stallStep ) {

			const b = bank( up ), [ x, z ] = spot( b, PARK.stallBack );
			if ( site.occupancy.within( x, z, PARK.stallClear ) === FREE ) return { x, z, yaw: Math.atan2( - b.nx, - b.nz ) };

		}

	};
	return {
		start: here, spawn: { position: here.position.clone(), yaw: here.yaw },
		// bow upstream
		boatDock: { position: new Vector3( bx, 0, bz ), heading: Math.atan2( - boat.tx, - boat.tz ) },
		stand: stall( PARK.stand ), chandlery: stall( PARK.chandlery ),
	};

}

// Write the layout into the shared layout object. Each entry is written into the object already
// there, never replaced: the stalls and the boat hold those objects by reference.
export function applyLayout( WORLD, world ) {

	for ( const [ k, v ] of Object.entries( layoutOf( world ) ) ) Object.assign( WORLD[ k ], v );

}
