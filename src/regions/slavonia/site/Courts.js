// The courts of the Site (Survey.js COURTS), as made ground: each court a stack of flat areas, its
// surround first and its markings over it, each a little higher than the one under it, so that from
// above it reads as the orthophoto shows it. The markings are the rules' sizes; the colours are the
// orthophoto's, read at the survey's gain (each court's record has them).
//
// A court is given by its four corners, in order round it; its long sides are the playing length.

// the rules' sizes (m): the field inside the surround, and what is marked on it
const KINDS = {
	basketball: { field: [ 28, 15 ], circle: 1.8, key: [ 5.8, 4.9 ], arc: 6.75 },
	handball: { field: [ 40, 20 ], circle: 1.8, goal: 6 },
};
// a line's width; how far each layer stands over the one under it (m)
const LINE = 0.08, LAYER = 0.004;
// the sides of a circle drawn as a polygon
const ROUND = 20;

// the areas of one court: [ { ring, of: 'court', colour, lift } ], the surround first
export function courtAreas( court ) {

	const K = KINDS[ court.kind ];
	if ( ! K ) throw new Error( `a court at ${ court.corners[ 0 ] } is of no known kind (${ court.kind })` );
	const [ c0, c1, c2, c3 ] = court.corners;
	const l01 = Math.hypot( c1[ 0 ] - c0[ 0 ], c1[ 1 ] - c0[ 1 ] ), l12 = Math.hypot( c2[ 0 ] - c1[ 0 ], c2[ 1 ] - c1[ 1 ] );
	// the court's own frame: its middle, u along its length, v across
	const mid = [ ( c0[ 0 ] + c2[ 0 ] ) / 2, ( c0[ 1 ] + c2[ 1 ] ) / 2 ];
	const [ p, q ] = l01 >= l12 ? [ c0, c1 ] : [ c1, c2 ], len = Math.hypot( q[ 0 ] - p[ 0 ], q[ 1 ] - p[ 1 ] );
	const U = [ ( q[ 0 ] - p[ 0 ] ) / len, ( q[ 1 ] - p[ 1 ] ) / len ], V = [ - U[ 1 ], U[ 0 ] ];
	const at = ( u, v ) => [ mid[ 0 ] + U[ 0 ] * u + V[ 0 ] * v, mid[ 1 ] + U[ 1 ] * u + V[ 1 ] * v ];
	const rect = ( u0, u1, v0, v1 ) => [ at( u0, v0 ), at( u1, v0 ), at( u1, v1 ), at( u0, v1 ) ];
	const disc = ( u, v, r, from = 0, to = 2 * Math.PI ) => Array.from( { length: ROUND + 1 }, ( _, k ) => { const a = from + ( to - from ) * k / ROUND; return at( u + r * Math.cos( a ), v + r * Math.sin( a ) ); } );
	// a line along a path of points ( u, v ), a quad a step
	const stroke = ( pts ) => pts.slice( 1 ).map( ( b, k ) => {

		const a = pts[ k ], l = Math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] ), n = [ - ( b[ 1 ] - a[ 1 ] ) / l * LINE / 2, ( b[ 0 ] - a[ 0 ] ) / l * LINE / 2 ];
		return [ at( a[ 0 ] - n[ 0 ], a[ 1 ] - n[ 1 ] ), at( b[ 0 ] - n[ 0 ], b[ 1 ] - n[ 1 ] ), at( b[ 0 ] + n[ 0 ], b[ 1 ] + n[ 1 ] ), at( a[ 0 ] + n[ 0 ], a[ 1 ] + n[ 1 ] ) ];

	} );
	const arcPts = ( u, v, r, from, to ) => Array.from( { length: ROUND + 1 }, ( _, k ) => { const a = from + ( to - from ) * k / ROUND; return [ u + r * Math.cos( a ), v + r * Math.sin( a ) ]; } );
	const [ L, W ] = K.field, C = court.colours;
	const out = [], add = ( ring, colour, layer ) => out.push( { ring, of: 'court', colour, lift: layer * LAYER, source: court.source } );
	// the surround (the whole court), the field on it, the centre line
	add( [ c0, c1, c2, c3 ], C.surround, 0 );
	add( rect( - L / 2, L / 2, - W / 2, W / 2 ), C.field, 1 );
	for ( const s of stroke( [ [ 0, - W / 2 ], [ 0, W / 2 ] ] ) ) add( s, C.line, 3 );
	for ( const s of stroke( arcPts( 0, 0, K.circle, 0, 2 * Math.PI ) ) ) add( s, C.line, 3 );
	for ( const end of [ - 1, 1 ] ) {

		const u = end * L / 2;
		if ( court.kind === 'basketball' ) {

			// the key, in the surround's colour, and its circle; the three-point line
			add( rect( Math.min( u, u - end * K.key[ 0 ] ), Math.max( u, u - end * K.key[ 0 ] ), - K.key[ 1 ] / 2, K.key[ 1 ] / 2 ), C.key, 2 );
			for ( const s of stroke( arcPts( u - end * K.key[ 0 ], 0, K.circle, 0, 2 * Math.PI ) ) ) add( s, C.line, 3 );
			const hoop = u - end * 1.575, reach = Math.acos( Math.min( 1, ( W / 2 - 0.9 ) / K.arc ) );
			for ( const s of stroke( arcPts( hoop, 0, K.arc, end < 0 ? - Math.PI / 2 + reach : Math.PI / 2 + reach, end < 0 ? Math.PI / 2 - reach : 3 * Math.PI / 2 - reach ) ) ) add( s, C.line, 3 );

		} else {

			// the goal area: a D of the goal area's radius from the goal line, lighter
			const pts = arcPts( u, 0, K.goal, end < 0 ? - Math.PI / 2 : Math.PI / 2, end < 0 ? Math.PI / 2 : 3 * Math.PI / 2 );
			add( pts.map( ( [ a, b ] ) => at( a, b ) ), C.key, 2 );

		}

	}

	return out;

}

// the fence round a court: its points, outside the surround by `out`, open for `gap` metres where
// the record says ( [ x, z ] near the fence ), and its height
export function courtFence( court ) {

	if ( ! court.fence ) return null;
	const { out, height, gap, at } = court.fence, c = court.corners;
	const mid = [ ( c[ 0 ][ 0 ] + c[ 2 ][ 0 ] ) / 2, ( c[ 0 ][ 1 ] + c[ 2 ][ 1 ] ) / 2 ];
	const ring = c.map( ( p ) => { const d = Math.hypot( p[ 0 ] - mid[ 0 ], p[ 1 ] - mid[ 1 ] ); return [ p[ 0 ] + ( p[ 0 ] - mid[ 0 ] ) / d * out * Math.SQRT2, p[ 1 ] + ( p[ 1 ] - mid[ 1 ] ) / d * out * Math.SQRT2 ]; } );
	// the runs round it, the one nearest the gate cut by the gate
	const runs = [];
	ring.forEach( ( a, i ) => {

		const b = ring[ ( i + 1 ) % ring.length ], l = Math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] ), t = [ ( b[ 0 ] - a[ 0 ] ) / l, ( b[ 1 ] - a[ 1 ] ) / l ];
		const s = Math.max( 0, Math.min( l, ( at[ 0 ] - a[ 0 ] ) * t[ 0 ] + ( at[ 1 ] - a[ 1 ] ) * t[ 1 ] ) ), d = Math.hypot( a[ 0 ] + t[ 0 ] * s - at[ 0 ], a[ 1 ] + t[ 1 ] * s - at[ 1 ] );
		runs.push( { a, b, l, t, s, d } );

	} );
	const near = runs.reduce( ( m, r ) => r.d < m.d ? r : m );
	return { height, runs: runs.flatMap( ( r ) => r !== near ? [ [ r.a, r.b ] ] : [
		[ r.a, [ r.a[ 0 ] + r.t[ 0 ] * Math.max( 0, r.s - gap / 2 ), r.a[ 1 ] + r.t[ 1 ] * Math.max( 0, r.s - gap / 2 ) ] ],
		[ [ r.a[ 0 ] + r.t[ 0 ] * Math.min( r.l, r.s + gap / 2 ), r.a[ 1 ] + r.t[ 1 ] * Math.min( r.l, r.s + gap / 2 ) ], r.b ],
	] ).filter( ( [ a, b ] ) => Math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] ) > 0.1 ) };

}
