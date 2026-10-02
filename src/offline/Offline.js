import { REGION } from '../regions/index.js';
import { manifestOf } from './manifest.js';

// The page's side of playing offline: it names the app's manifest for the region it was opened in
// (installed to a home screen, the game opens where it was installed from), registers the service
// worker that keeps the copy (sw.js), and says on screen when that copy is being saved and when it
// is complete, so nobody leaves the network with half of it.
//
// A page that opens from the copy on the device is the build that was saved, not the one on the
// server: the newer one is fetched behind it and takes over when it is whole. The page then loads it
// by itself if the game has not been started yet, and offers it (a touch on the notice) if it has.
// It also says which build it is when it opens, so that is never a guess.
//
// Only in a build (vite.config.js `offline` writes sw.js and the manifests there): the dev server
// serves modules one by one and a cached copy of those would be stale at the next edit.

// how long the "ready" notice stays up (ms)
const SHOWN = 5000;

const CSS = `
.tw-offline { position: fixed; left: 50%; top: calc( 10px + env( safe-area-inset-top ) ); transform: translateX( -50% ); z-index: 60; padding: 7px 14px; border-radius: 999px;
	font: 600 12px/1 system-ui, sans-serif; color: #eaf6ff; background: rgba( 8, 14, 22, 0.72 ); pointer-events: none; opacity: 0; transition: opacity 0.4s; white-space: nowrap; }
.tw-offline.is-on { opacity: 1; }
.tw-offline.is-ask { pointer-events: auto; cursor: pointer; background: rgba( 30, 120, 110, 0.9 ); }
`;

export function startOffline() {

	if ( ! import.meta.env.PROD || ! ( 'serviceWorker' in navigator ) ) return;

	const link = document.createElement( 'link' );
	link.rel = 'manifest';
	link.href = manifestOf( REGION.id );
	document.head.appendChild( link );

	const style = document.createElement( 'style' );
	style.textContent = CSS;
	document.head.appendChild( style );
	const pill = document.createElement( 'div' );
	pill.className = 'tw-offline';
	document.body.appendChild( pill );
	let hide = 0;
	const say = ( text, stay ) => {

		pill.textContent = text;
		pill.classList.add( 'is-on' );
		clearTimeout( hide );
		if ( ! stay ) hide = setTimeout( () => pill.classList.remove( 'is-on' ), SHOWN );

	};

	say( `Build ${ __BUILD__ }` );
	// a worker that takes this page over from another is a newer build than the one running in it
	const older = navigator.serviceWorker.controller;
	navigator.serviceWorker.addEventListener( 'controllerchange', () => {

		if ( ! older ) return;
		// ( not started: the loader or the start screen is still up )
		if ( document.querySelector( '.tw-root.is-starting' ) || ! document.querySelector( '.tw-root' ) ) { location.reload(); return; }
		pill.classList.add( 'is-ask' );
		pill.addEventListener( 'click', () => location.reload() );
		say( 'New version ready: touch here to load it', true );

	} );

	// what this page has been told so far: said once it is complete, not at every load after
	let saving = false;
	navigator.serviceWorker.addEventListener( 'message', ( e ) => {

		const m = e.data || {};
		if ( m.offline === 'saving' ) { saving = true; say( `Saving for offline ${ Math.round( m.done / m.of * 100 ) }%`, true ); }
		if ( m.offline === 'ready' && saving ) { saving = false; if ( ! pill.classList.contains( 'is-ask' ) ) say( 'Ready to play offline' ); }

	} );
	navigator.serviceWorker.register( './sw.js' ).catch( ( err ) => {

		// most often a certificate the browser does not trust: the game still runs, online only
		console.warn( 'offline copy unavailable:', err );
		say( 'Offline copy unavailable here' );

	} );
	if ( ! navigator.onLine ) say( 'Playing offline' );

}
