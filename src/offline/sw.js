// The service worker: keeps a whole copy of the built game on the device, so it opens with no
// network at all. The build puts two lines above this file (vite.config.js `offline`): VERSION, a
// hash of everything in the build, and FILES, every file of it.
//
//   install    fetch every file into the cache named for this version, a few at a time, telling
//              the open pages how far it has got
//   activate   drop the caches of older versions and take the open pages over
//   fetch      a page load is the cached index.html whatever its query (?region=...); any other
//              file of the build comes from the cache; what is not ours (the web fonts) is kept
//              as it is first fetched; the network is only the fallback

const CACHE = 'tidewater-' + VERSION, FOREIGN = 'tidewater-foreign';
// how many files are fetched at once while installing
const AT_ONCE = 6;

const tell = async ( message ) => {

	for ( const c of await self.clients.matchAll( { includeUncontrolled: true } ) ) c.postMessage( message );

};

self.addEventListener( 'install', ( event ) => event.waitUntil( ( async () => {

	const cache = await caches.open( CACHE );
	let done = 0;
	const queue = FILES.slice();
	const worker = async () => {

		for ( let file = queue.pop(); file !== undefined; file = queue.pop() ) {

			// what is already there (an install that was cut short) is not fetched again
			if ( ! await cache.match( file ) ) {

				const res = await fetch( file, { cache: 'no-cache' } );
				if ( ! res.ok ) throw new Error( `${ file }: ${ res.status }` );
				await cache.put( file, res );

			}

			done ++;
			tell( { offline: 'saving', done, of: FILES.length } );

		}

	};
	await Promise.all( Array.from( { length: AT_ONCE }, worker ) );
	await self.skipWaiting();

} )() ) );

self.addEventListener( 'activate', ( event ) => event.waitUntil( ( async () => {

	for ( const name of await caches.keys() ) if ( name !== CACHE && name !== FOREIGN ) await caches.delete( name );
	await self.clients.claim();
	tell( { offline: 'ready', version: VERSION } );

} )() ) );

// a page asks whether its copy is complete
self.addEventListener( 'message', ( event ) => {

	if ( event.data === 'offline?' ) event.source.postMessage( { offline: 'ready', version: VERSION } );

} );

self.addEventListener( 'fetch', ( event ) => {

	const req = event.request;
	if ( req.method !== 'GET' ) return;
	const url = new URL( req.url );
	event.respondWith( ( async () => {

		if ( url.origin === self.location.origin ) {

			const cache = await caches.open( CACHE );
			// ( whatever the query, and whatever headers the server said its answer varies by: a script
			// asked for by the page carries an Origin the install's own request did not )
			const hit = await cache.match( req.mode === 'navigate' ? 'index.html' : req, { ignoreSearch: true, ignoreVary: true } );
			return hit || fetch( req );

		}

		// not ours: kept as first fetched, refreshed whenever the network is there
		const cache = await caches.open( FOREIGN ), hit = await cache.match( req );
		const fresh = fetch( req ).then( ( res ) => { cache.put( req, res.clone() ); return res; } );
		if ( ! hit ) return fresh;
		fresh.catch( () => {} );
		return hit;

	} )() );

} );
