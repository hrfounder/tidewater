// Roofs over a footprint made of rectangles (site/Buildings.js `pieces`), in the building's own frame:
// u and v on the ground, heights above the datum.
//
// Every piece carries a roof of its own: a gable (two slopes off a ridge along the piece), a lean-to
// (one slope down from the wall of the piece it stands against), or a hip (four slopes; only for a
// building that is one piece). Where two roofs meet, each is cut back to the part of it that is the
// higher of the two, so an L or a T comes out with its valleys, and a wing's ridge runs into the
// slope of the main roof instead of stopping at a wall.
//
//   slope   { plane: [ A, B, C ] (height = A u + B v + C), rect: [ u0, u1, v0, v1 ] (its plan),
//             along: 0 | 1 (the axis its eaves run along), eave: the across coordinate of its eaves,
//             up: -1 | 1 (which way across the roof rises from the eaves), cos: cosine of its pitch }
//   roof    { kind, slopes, rect (the plan of all its slopes), piece, axis, He, ... }

// pieces closer than this are touching (m)
const TOUCH = 0.05;
// a polygon smaller than this is no polygon (m2)
const SLIVER = 1e-3;

const along = ( p, axis ) => axis === 0 ? [ p.u - p.hu, p.u + p.hu ] : [ p.v - p.hv, p.v + p.hv ];
const across = ( p, axis ) => along( p, 1 - axis );

// the pieces that stand against the end of `p` at coordinate `at` of `axis` (dir -1: its low end)
function against( p, pieces, axis, dir ) {

	const [ lo, hi ] = along( p, axis ), [ x0, x1 ] = across( p, axis ), at = dir < 0 ? lo : hi;
	return pieces.filter( ( q ) => {

		if ( q === p ) return false;
		const [ qlo, qhi ] = along( q, axis ), [ q0, q1 ] = across( q, axis );
		return Math.abs( ( dir < 0 ? qhi : qlo ) - at ) < TOUCH && Math.min( x1, q1 ) - Math.max( x0, q0 ) > TOUCH;

	} );

}

// A gable over a piece: ridge along its longer side at the middle of its span.
//   eaveY: height of the wall top; tan: the pitch's rise per metre; eave, verge: the overhangs (m)
//   axes: Map( piece -> the axis of its ridge ), for the pieces that have a gable
export function gable( p, pieces, axes, { eaveY, tan, eave, verge } ) {

	const axis = axes.get( p );
	let [ lo, hi ] = along( p, axis );
	const [ x0, x1 ] = across( p, axis ), c = ( x0 + x1 ) / 2, s = ( x1 - x0 ) / 2;
	// an end against another piece: the ridge runs on into that piece's roof as far as its middle
	// (it is cut back to the valley below); a free end overhangs its gable wall by the verge
	const ends = [ - 1, 1 ].map( ( dir ) => {

		const next = against( p, pieces, axis, dir );
		const into = next.filter( ( q ) => axes.has( q ) && axes.get( q ) !== axis );
		const reach = into.length ? Math.max( ...into.map( ( q ) => ( along( q, axis )[ 1 ] - along( q, axis )[ 0 ] ) / 2 ) ) : next.length ? 0 : verge;
		return { free: next.length === 0, reach };

	} );
	lo -= ends[ 0 ].reach; hi += ends[ 1 ].reach;
	const cos = 1 / Math.hypot( 1, tan );
	const slopes = [ - 1, 1 ].map( ( side ) => {

		// height = eaveY + ( s - side * ( x - c ) ) * tan, for x from the ridge out to the eaves on `side`
		const k = eaveY + ( s + side * c ) * tan;
		const a = [ c, c + side * ( s + eave ) ].sort( ( m, n ) => m - n );
		return {
			plane: axis === 0 ? [ 0, - side * tan, k ] : [ - side * tan, 0, k ],
			rect: axis === 0 ? [ lo, hi, a[ 0 ], a[ 1 ] ] : [ a[ 0 ], a[ 1 ], lo, hi ],
			along: axis, eave: c + side * ( s + eave ), up: - side, cos,
		};

	} );
	return {
		kind: 'gable', piece: p, axis, slopes, c, s, tan, eaveY, ridgeY: eaveY + s * tan, lo, hi, free: [ ends[ 0 ].free, ends[ 1 ].free ],
		rect: axis === 0 ? [ lo, hi, c - s - eave, c + s + eave ] : [ c - s - eave, c + s + eave, lo, hi ],
		// the top of the gable wall across the piece
		wallTop: ( x ) => eaveY + ( s - Math.abs( x - c ) ) * tan,
	};

}

// A lean-to over a piece that stands against `host`: one slope, falling away from the host's wall.
//   topY: the height it meets the host's wall at; lowest: the least height of its own outer wall
//   (the pitch gives way to that)
export function leanTo( p, host, { topY, tan, lowest, eave, verge } ) {

	// which of the piece's four sides the host is on
	const du = host.u - p.u, dv = host.v - p.v;
	const axis = Math.abs( du ) / ( p.hu + host.hu ) > Math.abs( dv ) / ( p.hv + host.hv ) ? 1 : 0; // the eaves run along this axis
	const [ lo, hi ] = along( p, axis ), [ x0, x1 ] = across( p, axis );
	const side = ( axis === 1 ? du : dv ) > 0 ? - 1 : 1; // the eaves are on the side away from the host
	const top = side > 0 ? x0 : x1, low = side > 0 ? x1 : x0;
	tan = Math.max( 0.02, Math.min( tan, ( topY - lowest ) / Math.abs( low - top ) ) );
	// height = topY - | x - top | * tan
	const k = topY + side * top * tan;
	const a = [ top, low + side * eave ].sort( ( m, n ) => m - n );
	const slope = {
		plane: axis === 0 ? [ 0, - side * tan, k ] : [ - side * tan, 0, k ],
		rect: axis === 0 ? [ lo - verge, hi + verge, a[ 0 ], a[ 1 ] ] : [ a[ 0 ], a[ 1 ], lo - verge, hi + verge ],
		along: axis, eave: low + side * eave, up: - side, cos: 1 / Math.hypot( 1, tan ),
	};
	return {
		kind: 'lean', piece: p, axis, slopes: [ slope ], rect: slope.rect, tan, topY, eaveY: topY - Math.abs( low - top ) * tan, lo: lo - verge, hi: hi + verge, free: [ true, true ],
		// the top of each wall: the two end walls rake with the slope
		wallTop: ( x ) => topY - Math.abs( x - top ) * tan,
	};

}

// A hip over a building that is one piece: four slopes at one pitch.
export function hip( p, { eaveY, tan, eave } ) {

	const axis = p.hu >= p.hv ? 0 : 1;
	const [ lo, hi ] = along( p, axis ), [ x0, x1 ] = across( p, axis ), c = ( x0 + x1 ) / 2, s = ( x1 - x0 ) / 2;
	const cos = 1 / Math.hypot( 1, tan );
	const slopes = [];
	// the two long slopes, then the two hipped ends: each a plane rising inward from its own eaves
	for ( const side of [ - 1, 1 ] ) slopes.push( { plane: axis === 0 ? [ 0, - side * tan, eaveY + ( s + side * c ) * tan ] : [ - side * tan, 0, eaveY + ( s + side * c ) * tan ], along: axis, eave: c + side * ( s + eave ), up: - side, cos } );
	for ( const side of [ - 1, 1 ] ) {

		const end = side < 0 ? lo : hi;
		slopes.push( { plane: axis === 0 ? [ - side * tan, 0, eaveY + side * end * tan ] : [ 0, - side * tan, eaveY + side * end * tan ], along: 1 - axis, eave: end + side * eave, up: - side, cos } );

	}

	const rect = axis === 0 ? [ lo - eave, hi + eave, x0 - eave, x1 + eave ] : [ x0 - eave, x1 + eave, lo - eave, hi + eave ];
	for ( const sl of slopes ) sl.rect = rect;
	return { kind: 'hip', piece: p, axis, slopes, rect, tan, eaveY, ridgeY: eaveY + s * tan, free: [ false, false ], wallTop: () => eaveY };

}

const heightOn = ( plane, u, v ) => plane[ 0 ] * u + plane[ 1 ] * v + plane[ 2 ];

// the height of a roof over a point of its plan: the lowest of its slopes there
export function roofHeight( roof, u, v ) {

	let h = Infinity;
	for ( const sl of roof.slopes ) h = Math.min( h, heightOn( sl.plane, u, v ) );
	return h;

}

// a convex polygon [ [ u, v ], ... ] cut to the side of a line where a u + b v + c >= 0
function clip( poly, a, b, c ) {

	const out = [];
	for ( let i = 0; i < poly.length; i ++ ) {

		const p = poly[ i ], q = poly[ ( i + 1 ) % poly.length ];
		const dp = a * p[ 0 ] + b * p[ 1 ] + c, dq = a * q[ 0 ] + b * q[ 1 ] + c;
		if ( dp >= 0 ) out.push( p );
		if ( ( dp >= 0 ) !== ( dq >= 0 ) ) {

			const t = dp / ( dp - dq );
			out.push( [ p[ 0 ] + ( q[ 0 ] - p[ 0 ] ) * t, p[ 1 ] + ( q[ 1 ] - p[ 1 ] ) * t ] );

		}

	}

	return out;

}

function area( poly ) {

	let a = 0;
	for ( let i = 0; i < poly.length; i ++ ) {

		const p = poly[ i ], q = poly[ ( i + 1 ) % poly.length ];
		a += p[ 0 ] * q[ 1 ] - q[ 0 ] * p[ 1 ];

	}

	return Math.abs( a ) / 2;

}

// The part of a slope that is seen: its own plan, less wherever another roof stands higher (and,
// on a hip, wherever another of its own slopes is the lower one). Convex polygons in ( u, v ).
export function visible( slope, roof, roofs ) {

	const [ u0, u1, v0, v1 ] = slope.rect;
	let parts = [ [ [ u0, v0 ], [ u1, v0 ], [ u1, v1 ], [ u0, v1 ] ] ];
	// a roof is the lowest of its own slopes
	for ( const other of roof.slopes ) if ( other !== slope ) {

		const d = [ other.plane[ 0 ] - slope.plane[ 0 ], other.plane[ 1 ] - slope.plane[ 1 ], other.plane[ 2 ] - slope.plane[ 2 ] ];
		if ( d[ 0 ] === 0 && d[ 1 ] === 0 ) continue;
		parts = parts.map( ( poly ) => clip( poly, d[ 0 ], d[ 1 ], d[ 2 ] ) ).filter( ( poly ) => poly.length > 2 && area( poly ) > SLIVER );

	}

	for ( const other of roofs ) {

		if ( other === roof ) continue;
		// where the other roof is higher: inside its plan, and under every one of its slopes
		const [ p0, p1, q0, q1 ] = other.rect;
		const hidden = [ [ 1, 0, - p0 ], [ - 1, 0, p1 ], [ 0, 1, - q0 ], [ 0, - 1, q1 ] ];
		for ( const sl of other.slopes ) hidden.push( [ sl.plane[ 0 ] - slope.plane[ 0 ], sl.plane[ 1 ] - slope.plane[ 1 ], sl.plane[ 2 ] - slope.plane[ 2 ] - 1e-4 ] );
		const next = [];
		for ( let poly of parts ) {

			// the polygon less the convex region: what lies outside each of the region's edges in turn
			for ( const [ a, b, c ] of hidden ) {

				const outside = clip( poly, - a, - b, - c );
				if ( outside.length > 2 && area( outside ) > SLIVER ) next.push( outside );
				poly = clip( poly, a, b, c );
				if ( poly.length < 3 ) break;

			}

		}

		parts = next;

	}

	return parts;

}

// a point of a slope's plan lifted onto it, with its place on the surface: [ u, y, v ] and
// [ metres along the eaves, metres up the slope ]
export function onSlope( slope, u, v ) {

	const a = slope.along === 0 ? u : v, x = slope.along === 0 ? v : u;
	return { point: [ u, heightOn( slope.plane, u, v ), v ], uv: [ a, Math.abs( x - slope.eave ) / slope.cos ] };

}
