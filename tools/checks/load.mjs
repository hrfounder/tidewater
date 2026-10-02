// Load the Slavonian region's data in plain node, the way the browser does over fetch: the terrain
// patch from the world tiles and the places of the block. Shared by the checks in this folder.
import { readFileSync } from 'node:fs';
import { TileTerrain } from '../../src/regions/slavonia/TileTerrain.js';
import { TILES } from '../../src/regions/slavonia/world.js';

const dir = new URL( '../../public/' + TILES, import.meta.url );

export const readJSON = ( file ) => JSON.parse( readFileSync( new URL( file, dir ), 'utf8' ) );

export async function loadTerrain( options = {} ) {

	const index = readJSON( 'index.json' );
	return TileTerrain.load( { index, center: index.center, ...options, readFile: async ( f ) => {

		const b = readFileSync( new URL( f, dir ) );
		return b.buffer.slice( b.byteOffset, b.byteOffset + b.byteLength );

	} } );

}

export const loadPlaces = () => readJSON( 'places.json' );

// a check: prints one line, and counts the failures for the exit code
let failures = 0;
export function check( pass, what, value ) {

	if ( ! pass ) failures ++;
	console.log( `${ pass ? 'ok  ' : 'FAIL' } ${ what }: ${ value }` );

}

export function finish() {

	console.log( failures ? `${ failures } failed` : 'all passed' );
	process.exit( failures ? 1 : 0 );

}
