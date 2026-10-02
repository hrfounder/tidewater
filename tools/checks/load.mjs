// Load the Slavonian world in plain node, through the same loader the browser uses: the files come
// off the disk instead of over fetch. Shared by the checks in this folder.
import { readFileSync } from 'node:fs';
import { loadWorld, TILES } from '../../src/regions/slavonia/world.js';

const pub = new URL( '../../public/', import.meta.url );

const dir = new URL( '../../public/' + TILES, import.meta.url );

// a file under public/, as the game's loader asks for it
export const readFile = async ( path ) => {

	const b = readFileSync( new URL( path, pub ) );
	return b.buffer.slice( b.byteOffset, b.byteOffset + b.byteLength );

};

export const readJSON = ( file ) => JSON.parse( readFileSync( new URL( file, dir ), 'utf8' ) );

export const load = () => loadWorld( readFile );

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
