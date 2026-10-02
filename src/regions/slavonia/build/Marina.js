import { Vector3 } from '../../../engine/index.js';
import { SURFACE } from './VillageMaterial.js';

// What floats and what stands over the water, as surveyed (Survey.js MARINAS and DECKS):
//
//   a marina   a long pontoon lying off the bank, finger piers standing out from it on the river's
//              side for the boats to lie between, a gangway down to it from the bank, and the
//              boats that lie at it under their covers
//   a deck     a platform on piles at the water's edge, railed on the sides that are not the bank's,
//              and the boat that is moored at it
//
// The forms are from the drone footage of 2025 (drone2 at 0-18 s): a pontoon of pale decking some
// 2.4 m wide on concrete floats, round-ended fingers a boat's length long every six or seven
// metres, a gangway with handrails; by the bridge a square deck of the same decking behind a white
// railing. The sizes are judged from the boats beside them, not measured.

const lin = ( c ) => c.map( ( v ) => Math.pow( v / 255, 2.2 ) );
// A pontoon: how far its deck floats over the water and how deep its floats sit (m), and how thick
// the decking is over them.
const FLOAT = { freeboard: 0.45, draught: 0.4, decking: 0.08 };
// A gangway: its width, the height of its handrails, and the height of each step a walker takes on it (m).
const GANGWAY = { width: 1.2, rail: 1.0, step: 0.18 };
// A deck: the thickness of its platform, its piles' side, the most between two piles (m).
const DECK = { slab: 0.22, pile: 0.3, span: 4 };
// the bank is looked for this far from a pontoon, a step at a time, for ground this high over the
// water to land the gangway on (m)
const BANK = { reach: 30, step: 0.5, height: 1.4 };
const DECKING = { color: lin( [ 186, 172, 150 ] ), rough: 0.85, surface: SURFACE.boards, seed: 0.45 };
const FLOATS = { color: lin( [ 150, 150, 146 ] ), rough: 0.95, surface: SURFACE.concrete, seed: 0.3 };
const STEEL = { color: lin( [ 168, 172, 176 ] ), rough: 0.45, metal: 0.8, surface: SURFACE.plain, seed: 0.2 };
const RAIL_PAINT = { railing: { color: lin( [ 232, 232, 228 ] ), rough: 0.5, metal: 0.2, surface: SURFACE.plain, seed: 0.2 } };
// The covers over the moored boats, one after the other along the pontoon: blue, and the dark covers
// of the newer boats (drone2 at 0-9 s; sRGB). A boat lies this far off what it is moored to (m).
const COVERS = [ [ 60, 110, 170 ], [ 44, 50, 66 ], [ 60, 110, 170 ], [ 96, 100, 104 ] ];
const FENDER = 0.25;

// B: ( x, z ) -> the MeshBuilder of that place; returns what was built
export function buildMarina( B, { site, terrain, models }, colliders ) {

	const built = { pontoons: 0, fingers: 0, gangways: 0, decks: 0, boats: 0 };
	// a boat of the kit on the water: its middle, the way its bow points, and its cover's colour (or null)
	const moor = ( name, x, z, bow, cover ) => {

		const boat = models.kit.get( name ), Z = [ bow[ 0 ], 0, bow[ 1 ] ], X = [ Z[ 2 ], 0, - Z[ 0 ] ], M = B( x, z );
		for ( const part of boat.parts ) M.paint( { color: part.material === 'tarp' && cover ? lin( cover ) : part.color, rough: part.rough, metal: part.metal, surface: SURFACE.plain, seed: 0.5 } ).stamp( part, X, [ 0, 1, 0 ], Z, [ x, 0, z ] );
		if ( colliders ) colliders.addBox( new Vector3( x, boat.h / 2 - 0.2, z ), new Vector3( boat.w / 2, boat.h / 2 + 0.2, boat.length / 2 ), Math.atan2( bow[ 0 ], bow[ 1 ] ), { tag: 'boat' } );
		built.boats ++;

	};
	// a block along a line from a toward the unit direction t: between l0 and l1 along it, o0 and o1
	// to its right, y0 to y1; its top, its four sides, and its underside
	const block = ( a, t, l0, l1, o0, o1, y0, y1, paint, walk ) => {

		const n = [ - t[ 1 ], t[ 0 ] ], M = B( a[ 0 ] + t[ 0 ] * ( l0 + l1 ) / 2, a[ 1 ] + t[ 1 ] * ( l0 + l1 ) / 2 );
		const at = ( l, o, y ) => [ a[ 0 ] + t[ 0 ] * l + n[ 0 ] * o, y, a[ 1 ] + t[ 1 ] * l + n[ 1 ] * o ];
		M.paint( paint );
		M.polygon( [ at( l0, o0, y1 ), at( l0, o1, y1 ), at( l1, o1, y1 ), at( l1, o0, y1 ) ], [ [ o0, l0 ], [ o1, l0 ], [ o1, l1 ], [ o0, l1 ] ] );
		M.polygon( [ at( l0, o0, y0 ), at( l1, o0, y0 ), at( l1, o1, y0 ), at( l0, o1, y0 ) ], [ [ o0, l0 ], [ o0, l1 ], [ o1, l1 ], [ o1, l0 ] ] );
		for ( const [ p, q ] of [ [ [ l0, o0 ], [ l1, o0 ] ], [ [ l1, o0 ], [ l1, o1 ] ], [ [ l1, o1 ], [ l0, o1 ] ], [ [ l0, o1 ], [ l0, o0 ] ] ] ) {

			const w = Math.hypot( q[ 0 ] - p[ 0 ], q[ 1 ] - p[ 1 ] );
			M.polygon( [ at( ...p, y0 ), at( ...q, y0 ), at( ...q, y1 ), at( ...p, y1 ) ], [ [ 0, 0 ], [ w, 0 ], [ w, y1 - y0 ], [ 0, y1 - y0 ] ] );

		}

		if ( colliders ) {

			const c = at( ( l0 + l1 ) / 2, ( o0 + o1 ) / 2, ( y0 + y1 ) / 2 );
			colliders.addBox( new Vector3( ...c ), new Vector3( Math.abs( o1 - o0 ) / 2, ( y1 - y0 ) / 2, Math.abs( l1 - l0 ) / 2 ), Math.atan2( t[ 0 ], t[ 1 ] ), { walkable: walk, tag: 'marina' } );

		}

	};

	for ( const m of site.marinas ) {

		const L = Math.hypot( m.to[ 0 ] - m.from[ 0 ], m.to[ 1 ] - m.from[ 1 ] ), t = [ ( m.to[ 0 ] - m.from[ 0 ] ) / L, ( m.to[ 1 ] - m.from[ 1 ] ) / L ];
		// the river's side: the side of the pontoon the survey's `river` points to
		const n = [ - t[ 1 ], t[ 0 ] ], river = n[ 0 ] * m.river[ 0 ] + n[ 1 ] * m.river[ 1 ] > 0 ? 1 : - 1, h = m.width / 2;
		const top = FLOAT.freeboard, under = top - FLOAT.decking;
		// the pontoon: decking over a float a hand narrower
		block( m.from, t, 0, L, - h, h, under, top, DECKING, true );
		block( m.from, t, 0.1, L - 0.1, - h + 0.1, h - 0.1, - FLOAT.draught, under, FLOATS, false );
		built.pontoons ++;
		// the fingers, from the first full space along it
		const F = m.fingers, out = [ n[ 0 ] * river, n[ 1 ] * river ], skiff = models.kit.get( 'skiff' );
		for ( let s = F.every / 2, k = 0; s < L - F.width; s += F.every, k ++ ) {

			const a = [ m.from[ 0 ] + t[ 0 ] * s + out[ 0 ] * h, m.from[ 1 ] + t[ 1 ] * s + out[ 1 ] * h ];
			block( a, out, 0, F.length, - F.width / 2, F.width / 2, under, top, DECKING, true );
			block( a, out, 0, F.length - 0.1, - F.width / 2 + 0.08, F.width / 2 - 0.08, - FLOAT.draught, under, FLOATS, false );
			built.fingers ++;
			// a boat at this finger, if the survey has one here: alongside it, its bow to the pontoon
			if ( ! m.boats.includes( k ) ) continue;
			const off = F.width / 2 + FENDER + skiff.w / 2, far = FENDER + skiff.length / 2;
			moor( 'skiff', a[ 0 ] + out[ 0 ] * far + t[ 0 ] * off, a[ 1 ] + out[ 1 ] * far + t[ 1 ] * off, [ - out[ 0 ], - out[ 1 ] ], COVERS[ k % COVERS.length ] );

		}

		// the gangway: from the pontoon's bank side to where the bank stands high enough to land it
		const bank = [ - out[ 0 ], - out[ 1 ] ], a = [ m.from[ 0 ] + t[ 0 ] * m.gangway + bank[ 0 ] * h, m.from[ 1 ] + t[ 1 ] * m.gangway + bank[ 1 ] * h ];
		let reach = 0;
		while ( reach < BANK.reach && terrain.heightAt( a[ 0 ] + bank[ 0 ] * reach, a[ 1 ] + bank[ 1 ] * reach ) < BANK.height ) reach += BANK.step;
		if ( reach >= BANK.reach ) throw new Error( `the marina at ${ m.from }: no bank ${ BANK.height } m over the water within ${ BANK.reach } m of its gangway` );
		const land = terrain.heightAt( a[ 0 ] + bank[ 0 ] * reach, a[ 1 ] + bank[ 1 ] * reach );
		// a walker takes it as steps; it is drawn as one ramp with a handrail on each side
		const M = B( a[ 0 ], a[ 1 ] ), w = GANGWAY.width / 2, side = [ - bank[ 1 ], bank[ 0 ] ];
		const at = ( l, o, y ) => [ a[ 0 ] + bank[ 0 ] * l + side[ 0 ] * o, y, a[ 1 ] + bank[ 1 ] * l + side[ 1 ] * o ];
		const slope = Math.hypot( reach, land - top );
		M.paint( DECKING );
		M.polygon( [ at( 0, - w, top ), at( 0, w, top ), at( reach, w, land ), at( reach, - w, land ) ], [ [ 0, 0 ], [ GANGWAY.width, 0 ], [ GANGWAY.width, slope ], [ 0, slope ] ] );
		M.polygon( [ at( 0, - w, top - 0.12 ), at( reach, - w, land - 0.12 ), at( reach, w, land - 0.12 ), at( 0, w, top - 0.12 ) ], [ [ 0, 0 ], [ 0, slope ], [ GANGWAY.width, slope ], [ GANGWAY.width, 0 ] ] );
		M.paint( STEEL );
		for ( const o of [ - w, w ] ) for ( const [ y0, y1 ] of [ [ - 0.12, 0 ], [ GANGWAY.rail - 0.05, GANGWAY.rail ] ] ) for ( const d of [ - 0.02, 0.02 ] ) {

			M.polygon( [ at( 0, o + d, top + y0 ), at( reach, o + d, land + y0 ), at( reach, o + d, land + y1 ), at( 0, o + d, top + y1 ) ], [ [ 0, 0 ], [ slope, 0 ], [ slope, y1 - y0 ], [ 0, y1 - y0 ] ] );

		}

		const posts = Math.max( 2, Math.round( slope / 1.5 ) );
		for ( const o of [ - w, w ] ) for ( let k = 0; k <= posts; k ++ ) {

			const l = reach * k / posts, y = top + ( land - top ) * k / posts;
			for ( const [ dl, dn ] of [ [ 0.02, 0 ], [ 0, 0.02 ] ] ) M.polygon( [ at( l - dl, o - dn, y ), at( l + dl, o + dn, y ), at( l + dl, o + dn, y + GANGWAY.rail ), at( l - dl, o - dn, y + GANGWAY.rail ) ], [ [ 0, 0 ], [ 0.04, 0 ], [ 0.04, GANGWAY.rail ], [ 0, GANGWAY.rail ] ] );

		}

		if ( colliders ) {

			const steps = Math.max( 1, Math.ceil( ( land - top ) / GANGWAY.step ) ), rot = Math.atan2( bank[ 0 ], bank[ 1 ] );
			for ( let k = 0; k < steps; k ++ ) {

				const l0 = reach * k / steps, l1 = reach * ( k + 1 ) / steps, y = top + ( land - top ) * ( k + 1 ) / steps, c = at( ( l0 + l1 ) / 2, 0, y - 0.1 );
				colliders.addBox( new Vector3( ...c ), new Vector3( w, 0.1, ( l1 - l0 ) / 2 + 0.02 ), rot, { walkable: true, tag: 'marina' } );

			}

		}

		built.gangways ++;

	}

	// ---- the decks: a platform at its level on piles founded in the bed, railed on all sides but the bank's
	const piece = models.kit.get( 'railing' );
	for ( const d of site.decks ) {

		const ring = d.ring, n = ring.length, top = d.level;
		const middle = [ ring.reduce( ( s, p ) => s + p[ 0 ], 0 ) / n, ring.reduce( ( s, p ) => s + p[ 1 ], 0 ) / n ];
		const M = B( ring[ 0 ][ 0 ], ring[ 0 ][ 1 ] );
		M.paint( DECKING );
		M.polygon( ring.map( ( [ x, z ] ) => [ x, top, z ] ).reverse(), ring.map( ( p ) => [ p[ 0 ], p[ 1 ] ] ).reverse() );
		M.polygon( ring.map( ( [ x, z ] ) => [ x, top - DECK.slab, z ] ), ring.map( ( p ) => [ p[ 0 ], p[ 1 ] ] ) );
		ring.forEach( ( p, i ) => {

			const q = ring[ ( i + 1 ) % n ], len = Math.hypot( q[ 0 ] - p[ 0 ], q[ 1 ] - p[ 1 ] ), t = [ ( q[ 0 ] - p[ 0 ] ) / len, ( q[ 1 ] - p[ 1 ] ) / len ];
			M.paint( DECKING );
			M.polygon( [ [ p[ 0 ], top - DECK.slab, p[ 1 ] ], [ q[ 0 ], top - DECK.slab, q[ 1 ] ], [ q[ 0 ], top, q[ 1 ] ], [ p[ 0 ], top, p[ 1 ] ] ], [ [ 0, 0 ], [ len, 0 ], [ len, DECK.slab ], [ 0, DECK.slab ] ] );
			// piles along the side, the corner's included
			const piles = Math.max( 1, Math.ceil( len / DECK.span ) );
			for ( let k = 0; k < piles; k ++ ) {

				const x = p[ 0 ] + ( q[ 0 ] - p[ 0 ] ) * k / piles, z = p[ 1 ] + ( q[ 1 ] - p[ 1 ] ) * k / piles;
				const foot = terrain.heightAt( x, z ) - 0.6, h = DECK.pile / 2;
				if ( foot >= top - DECK.slab ) continue;
				M.paint( FLOATS );
				for ( const [ ax, az, bx, bz ] of [ [ - h, - h, h, - h ], [ h, - h, h, h ], [ h, h, - h, h ], [ - h, h, - h, - h ] ] ) M.polygon( [ [ x + ax, foot, z + az ], [ x + bx, foot, z + bz ], [ x + bx, top - DECK.slab, z + bz ], [ x + ax, top - DECK.slab, z + az ] ], [ [ 0, 0 ], [ DECK.pile, 0 ], [ DECK.pile, top - DECK.slab - foot ], [ 0, top - DECK.slab - foot ] ] );

			}

			// the boat that is moored at the deck lies along the side across from the bank's
			if ( d.moored && i === ( d.open + n / 2 ) % n ) {

				const boat = models.kit.get( d.moored ), away = ( - t[ 1 ] ) * ( ( p[ 0 ] + q[ 0 ] ) / 2 - middle[ 0 ] ) + t[ 0 ] * ( ( p[ 1 ] + q[ 1 ] ) / 2 - middle[ 1 ] ) > 0 ? [ - t[ 1 ], t[ 0 ] ] : [ t[ 1 ], - t[ 0 ] ];
				moor( d.moored, ( p[ 0 ] + q[ 0 ] ) / 2 + away[ 0 ] * ( FENDER + boat.w / 2 ), ( p[ 1 ] + q[ 1 ] ) / 2 + away[ 1 ] * ( FENDER + boat.w / 2 ), t, null );

			}

			// the railing, in panels end to end, on the sides that are railed. A panel runs with its
			// outside on its left hand ( its own +z ): the side is walked whichever way puts the water there.
			if ( i === d.open ) return;
			const outward = ( - t[ 1 ] ) * ( ( p[ 0 ] + q[ 0 ] ) / 2 - middle[ 0 ] ) + t[ 0 ] * ( ( p[ 1 ] + q[ 1 ] ) / 2 - middle[ 1 ] ) > 0;
			const [ a, b ] = outward ? [ p, q ] : [ q, p ], u = outward ? t : [ - t[ 0 ], - t[ 1 ] ];
			const panels = Math.max( 1, Math.round( len / piece.w ) ), X = [ u[ 0 ] * len / panels / piece.w, 0, u[ 1 ] * len / panels / piece.w ];
			for ( let k = 0; k < panels; k ++ ) for ( const part of piece.parts ) M.paint( RAIL_PAINT[ part.material ] ).stamp( part, X, [ 0, 1, 0 ], [ - u[ 1 ], 0, u[ 0 ] ], [ a[ 0 ] + ( b[ 0 ] - a[ 0 ] ) * k / panels, top, a[ 1 ] + ( b[ 1 ] - a[ 1 ] ) * k / panels ] );
			if ( colliders ) colliders.addBox( new Vector3( ( p[ 0 ] + q[ 0 ] ) / 2, top + piece.h / 2, ( p[ 1 ] + q[ 1 ] ) / 2 ), new Vector3( 0.06, piece.h / 2, len / 2 ), Math.atan2( t[ 0 ], t[ 1 ] ), { tag: 'marina' } );

		} );
		if ( colliders ) {

			const xs = ring.map( ( p ) => p[ 0 ] ), zs = ring.map( ( p ) => p[ 1 ] );
			// ( a deck's ring is a rectangle on the axes: the survey writes them so )
			colliders.addBox( new Vector3( ( Math.min( ...xs ) + Math.max( ...xs ) ) / 2, top - DECK.slab / 2, ( Math.min( ...zs ) + Math.max( ...zs ) ) / 2 ), new Vector3( ( Math.max( ...xs ) - Math.min( ...xs ) ) / 2, DECK.slab / 2, ( Math.max( ...zs ) - Math.min( ...zs ) ) / 2 ), 0, { walkable: true, tag: 'marina' } );

		}

		built.decks ++;

	}

	return built;

}
