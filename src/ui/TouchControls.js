// Touch controls for a phone held upright (or any screen without a mouse): a stick under the left
// thumb to walk, a drag anywhere else to look, and the game's actions as buttons under the right
// thumb. They drive the same Input the keyboard and the mouse do (core/Input.js): the stick holds
// the walking keys down, the buttons are keys and mouse buttons, a drag is mouse movement.

// How far the stick's knob travels from its centre (px), how far it has to be pushed before a
// direction counts (share of that travel), and from where it means run.
const TRAVEL = 46, DEAD = 0.3, RUN = 0.92;
// degrees of view per pixel of a look drag, as a multiple of a mouse's
const LOOK = 1.6;

// The buttons: label, and what holding or tapping one does to the Input.
//   key    a key held while the button is (and hit once as it goes down)
//   mouse  a mouse button held while the button is: 'mouseDown' casts and strikes, 'rightDown' reels in
const BUTTONS = [
	{ id: 'cast', label: 'Cast', mouse: 'mouseDown', big: true },
	{ id: 'reel', label: 'Reel', mouse: 'rightDown' },
	{ id: 'use', label: 'Use', key: 'KeyE' },
	{ id: 'rod', label: 'Rod', key: 'KeyR' },
	{ id: 'jump', label: 'Jump', key: 'Space' },
	{ id: 'bag', label: 'Bag', key: 'KeyI' },
];

const CSS = `
.tw-touch { position: fixed; inset: 0; z-index: 30; pointer-events: none; touch-action: none; user-select: none; -webkit-user-select: none; font: 600 13px/1 system-ui, sans-serif; }
.tw-touch * { touch-action: none; -webkit-tap-highlight-color: transparent; }
.tw-touch-stick { position: absolute; left: calc( 22px + env( safe-area-inset-left ) ); bottom: calc( 30px + env( safe-area-inset-bottom ) ); width: 132px; height: 132px; border-radius: 50%; background: rgba( 12, 22, 30, 0.32 ); border: 1.5px solid rgba( 255, 255, 255, 0.35 ); pointer-events: auto; }
.tw-touch-knob { position: absolute; left: 50%; top: 50%; width: 58px; height: 58px; margin: -29px 0 0 -29px; border-radius: 50%; background: rgba( 255, 255, 255, 0.55 ); box-shadow: 0 2px 8px rgba( 0, 0, 0, 0.35 ); }
.tw-touch-pad { position: absolute; right: calc( 14px + env( safe-area-inset-right ) ); bottom: calc( 26px + env( safe-area-inset-bottom ) ); width: 190px; display: grid; grid-template-columns: repeat( 3, 1fr ); gap: 10px; justify-items: center; align-items: center; pointer-events: none; }
.tw-touch-btn { width: 56px; height: 56px; border-radius: 50%; border: 1.5px solid rgba( 255, 255, 255, 0.4 ); background: rgba( 12, 22, 30, 0.38 ); color: #fff; display: flex; align-items: center; justify-content: center; pointer-events: auto; text-shadow: 0 1px 2px rgba( 0, 0, 0, 0.6 ); }
.tw-touch-btn.is-big { grid-column: span 3; width: 84px; height: 84px; font-size: 16px; background: rgba( 64, 176, 160, 0.5 ); justify-self: end; margin-right: 12px; }
.tw-touch-btn.is-down { background: rgba( 255, 255, 255, 0.5 ); color: #0c161e; text-shadow: none; }
`;

export class TouchControls {

	// a screen that is touched and has no fine pointer: a phone, a tablet
	static wanted() {

		return 'ontouchstart' in window && window.matchMedia( '(pointer: coarse)' ).matches;

	}

	// input: the game's Input; canvas: where a drag looks around
	constructor( input, canvas ) {

		this.input = input;
		const style = document.createElement( 'style' );
		style.textContent = CSS;
		document.head.appendChild( style );
		const root = this.root = document.createElement( 'div' );
		root.className = 'tw-touch';
		root.innerHTML = `<div class="tw-touch-stick"><div class="tw-touch-knob"></div></div><div class="tw-touch-pad">${ BUTTONS.map( ( b ) => `<div class="tw-touch-btn${ b.big ? ' is-big' : '' }" data-id="${ b.id }">${ b.label }</div>` ).join( '' ) }</div>`;
		document.body.appendChild( root );
		// the page itself must not scroll, zoom or select under the thumbs, and a touch on the view is
		// not also a mouse click (the browser sends one after every tap unless it is told not to)
		canvas.style.touchAction = 'none';
		canvas.addEventListener( 'touchstart', ( e ) => e.preventDefault(), { passive: false } );
		document.documentElement.style.overscrollBehavior = 'none';

		this._stick( root.querySelector( '.tw-touch-stick' ), root.querySelector( '.tw-touch-knob' ) );
		for ( const b of BUTTONS ) this._button( root.querySelector( `[data-id="${ b.id }"]` ), b );
		this._look( canvas );

	}

	_stick( pad, knob ) {

		const inp = this.input, held = { KeyW: false, KeyS: false, KeyA: false, KeyD: false, ShiftLeft: false };
		const set = ( want ) => {

			for ( const k in held ) {

				if ( want[ k ] && ! held[ k ] ) { inp.pressed.add( k ); inp.keys.add( k ); }
				if ( ! want[ k ] && held[ k ] ) inp.keys.delete( k );
				held[ k ] = !! want[ k ];

			}

		};
		let id = null;
		const move = ( e ) => {

			if ( e.pointerId !== id ) return;
			const r = pad.getBoundingClientRect();
			let x = ( e.clientX - r.left - r.width / 2 ) / TRAVEL, y = ( e.clientY - r.top - r.height / 2 ) / TRAVEL;
			const l = Math.hypot( x, y );
			if ( l > 1 ) { x /= l; y /= l; }
			knob.style.transform = `translate( ${ x * TRAVEL }px, ${ y * TRAVEL }px )`;
			set( { KeyW: y < - DEAD, KeyS: y > DEAD, KeyA: x < - DEAD, KeyD: x > DEAD, ShiftLeft: Math.min( l, 1 ) > RUN } );
			e.preventDefault();

		};
		const end = ( e ) => {

			if ( e.pointerId !== id ) return;
			id = null;
			knob.style.transform = '';
			set( {} );

		};
		pad.addEventListener( 'pointerdown', ( e ) => { id = e.pointerId; pad.setPointerCapture( id ); move( e ); } );
		pad.addEventListener( 'pointermove', move );
		pad.addEventListener( 'pointerup', end );
		pad.addEventListener( 'pointercancel', end );

	}

	_button( el, b ) {

		const inp = this.input;
		const down = ( e ) => {

			el.setPointerCapture( e.pointerId );
			el.classList.add( 'is-down' );
			if ( b.key ) { inp.pressed.add( b.key ); inp.keys.add( b.key ); }
			if ( b.mouse ) inp[ b.mouse ] = true;
			e.preventDefault();

		};
		const up = () => {

			el.classList.remove( 'is-down' );
			if ( b.key ) inp.keys.delete( b.key );
			if ( b.mouse ) inp[ b.mouse ] = false;

		};
		el.addEventListener( 'pointerdown', down );
		el.addEventListener( 'pointerup', up );
		el.addEventListener( 'pointercancel', up );

	}

	// a finger on the view itself turns it, as a mouse held down does
	_look( canvas ) {

		const inp = this.input, last = new Map();
		canvas.addEventListener( 'pointerdown', ( e ) => { if ( e.pointerType === 'touch' ) last.set( e.pointerId, [ e.clientX, e.clientY ] ); } );
		canvas.addEventListener( 'pointermove', ( e ) => {

			const p = last.get( e.pointerId );
			if ( ! p ) return;
			inp.look.x += ( e.clientX - p[ 0 ] ) * LOOK;
			inp.look.y += ( e.clientY - p[ 1 ] ) * LOOK;
			p[ 0 ] = e.clientX; p[ 1 ] = e.clientY;
			e.preventDefault();

		} );
		const end = ( e ) => last.delete( e.pointerId );
		canvas.addEventListener( 'pointerup', end );
		canvas.addEventListener( 'pointercancel', end );

	}

}
