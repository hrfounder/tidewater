import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { REGIONS, DEFAULT_REGION } from './src/regions/index.js';
import { manifestOf } from './src/offline/manifest.js';

// `npm run dev:lan` and `npm run preview:lan` serve to the local network over https: a phone's
// browser gives a page WebGPU only in a secure context, which plain http from another machine is
// not. TIDEWATER_CERT names a folder holding key.pem and cert.pem.
const cert = process.env.TIDEWATER_CERT;
const https = cert ? { key: readFileSync( cert + '/key.pem' ), cert: readFileSync( cert + '/cert.pem' ) } : undefined;

// What makes a build playable with no network (src/offline/): written into the build once
// everything else is there.
//   sw.js                    the service worker, with a hash of the build and the list of its files
//   manifest[-id].webmanifest  one per region, so the game installed from a region opens in it
function offline() {

	let out = 'dist';
	const walk = ( dir ) => readdirSync( dir ).flatMap( ( name ) => {

		const path = join( dir, name );
		return statSync( path ).isDirectory() ? walk( path ) : [ path ];

	} );
	return {
		name: 'tidewater-offline',
		apply: 'build',
		configResolved( config ) { out = resolve( config.root, config.build.outDir ); },
		closeBundle() {

			for ( const region of Object.values( REGIONS ) ) {

				const start = region.id === DEFAULT_REGION ? './' : `./?region=${ region.id }`;
				writeFileSync( join( out, manifestOf( region.id ) ), JSON.stringify( {
					id: start, start_url: start, scope: './', name: region.name, short_name: 'Tidewater',
					display: 'fullscreen', orientation: 'any', background_color: '#000000', theme_color: '#08121a',
					icons: [ 192, 512 ].map( ( n ) => ( { src: `ui/icon-${ n }.png`, sizes: `${ n }x${ n }`, type: 'image/png', purpose: 'any maskable' } ) ),
				}, null, '\t' ) );

			}

			// every file of the build but the worker itself, and a hash of all their contents
			const hash = createHash( 'sha256' );
			const files = walk( out ).map( ( p ) => relative( out, p ).replace( /\\/g, '/' ) ).filter( ( f ) => f !== 'sw.js' ).sort();
			for ( const f of files ) hash.update( f ).update( readFileSync( join( out, f ) ) );
			const worker = readFileSync( resolve( 'src/offline/sw.js' ), 'utf8' );
			writeFileSync( join( out, 'sw.js' ), `const VERSION = ${ JSON.stringify( hash.digest( 'hex' ).slice( 0, 16 ) ) };\nconst FILES = ${ JSON.stringify( files ) };\n${ worker }` );
			console.log( `offline: sw.js lists ${ files.length } files` );

		},
	};

}

export default defineConfig( {
	// relative asset paths: the build runs from any sub-path (GitHub Pages serves it under /tidewater/)
	base: './',
	build: { target: 'esnext', chunkSizeWarningLimit: 4000 },
	plugins: [ offline() ],
	server: { port: 5188, strictPort: true, host: '127.0.0.1', https },
	preview: { port: 5193, strictPort: true, host: '127.0.0.1', https },
} );
