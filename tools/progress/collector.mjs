// Receives the reference shots the in-game bench posts (core/Bench.js `shots()`): raw BGRA8 with an
// 8-byte width / height header, one POST per view. Writes them next to each other in `outDir`, where
// collect.py turns them into the timelapse frames.
//
//   node tools/progress/collector.mjs <outDir> [port]
import { createServer } from 'node:http';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';

const outDir = process.argv[ 2 ];
const port = Number( process.argv[ 3 ] ) || 5190;
if ( ! outDir ) {

	console.error( 'usage: node tools/progress/collector.mjs <outDir> [port]' );
	process.exit( 1 );

}

await mkdir( outDir, { recursive: true } );

createServer( ( req, res ) => {

	const chunks = [];
	req.on( 'data', ( c ) => chunks.push( c ) );
	req.on( 'end', async () => {

		// the name is the bench's own tag-view.bgra; keep only the basename
		const name = basename( decodeURIComponent( req.url ) ) || 'shot.bgra';
		const body = Buffer.concat( chunks );
		await writeFile( join( outDir, name ), body );
		console.log( `${ name }  ${ ( body.length / 1e6 ).toFixed( 1 ) } MB` );
		res.writeHead( 200, { 'access-control-allow-origin': '*' } );
		res.end( 'ok' );

	} );

} ).listen( port, '127.0.0.1', () => console.log( `collecting shots on ${ port } -> ${ outDir }` ) );
