import { project, pointAt } from './Roads.js';

// What lies beside the roads of the Site: the parking and the pavements that were surveyed
// (Survey.js BESIDE), each laid along its stretch of road, so that it follows the road wherever the
// road runs and meets its edge without a gap.
//
//   site.beside = [ { of, road, side, inner: [ [ x, z ], ... ], outer: [ ... ], ring } ]
//     of      'asphalt' or 'paving'
//     inner   the strip's edge nearer the road, a point every STEP metres along it; outer the other
//     ring    the two edges as one outline

// metres between a strip's points along its road
const STEP = 2;
// a strip lies along the stretches of its road that pass within this of it (m)
const REACH = 15;

export function layBeside( roads, strips ) {

	return strips.flatMap( ( strip ) => {

		// every stretch of the road the strip runs along: a road is cut wherever another joins it, and
		// a row of parking does not end there
		const mid = [ ( strip.from[ 0 ] + strip.to[ 0 ] ) / 2, ( strip.from[ 1 ] + strip.to[ 1 ] ) / 2 ], span = Math.hypot( strip.to[ 0 ] - strip.from[ 0 ], strip.to[ 1 ] - strip.from[ 1 ] );
		const laid = [];
		for ( const road of roads.roads ) {

			if ( road.bridge || ( strip.along === null ? road.name : road.name !== strip.along ) ) continue;
			const a = project( road, ...strip.from ), b = project( road, ...strip.to ), m = project( road, ...mid );
			if ( m.d > REACH + span / 2 ) continue;
			const s0 = Math.min( a.s, b.s ), s1 = Math.max( a.s, b.s );
			// ( the strip lies wholly past one end of this stretch: both its ends fall on that end )
			if ( s1 - s0 < STEP ) continue;
			const n = Math.ceil( ( s1 - s0 ) / STEP );
			const edge = ( d ) => Array.from( { length: n + 1 }, ( _, k ) => pointAt( road, s0 + ( s1 - s0 ) * k / n, road.half + d, m.side ) );
			const inner = edge( strip.out[ 0 ] ), outer = edge( strip.out[ 1 ] );
			laid.push( { of: strip.of, road, side: m.side, inner, outer, ring: [ ...inner, ...outer.slice().reverse() ] } );

		}

		if ( ! laid.length ) throw new Error( `a strip beside ${ strip.along || 'an unnamed road' } at ${ mid.map( Math.round ) }: no such road within ${ REACH } m` );
		return laid;

	} );

}
