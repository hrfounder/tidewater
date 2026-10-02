// The roads of the Site: a graph. Nodes are where roads meet, end, or turn into a bridge; a road is
// one stretch between two nodes, either all bridge or none (tools/geodata/places.py cuts the map's
// segments that way). Coordinates are the patch's metres: x = east, z = south, y above the datum.

// What each class of road the map knows is on the ground here: the carriageway's width in metres,
// what it is surfaced with unless the map says otherwise, and whether houses line it (a street).
// A two-lane country road in this part of Slavonia is about 7 m, a village street 5 m, a field
// track a pair of ruts. Classes that are not listed are not built.
export const ROAD_CLASSES = {
	secondary: { width: 7.0, surface: 'paved', street: true },
	residential: { width: 5.0, surface: 'paved', street: true },
	unclassified: { width: 4.5, surface: 'paved', street: true },
	service: { width: 3.6, surface: 'unpaved', street: false },
	track: { width: 3.0, surface: 'unpaved', street: false },
	cycleway: { width: 2.0, surface: 'paved', street: false },
	footway: { width: 1.4, surface: 'paved', street: false },
	path: { width: 1.2, surface: 'unpaved', street: false },
};

// The gravel shoulder beside a paved carriageway (m).
export const SHOULDER = 0.6;
// The narrowest a carriageway is squeezed to where the buildings beside it leave no more room (m):
// a lane one car wide.
const LANE = 2.5;

// metres between the points of a road once its mapped corners are rounded
const STEP = 2;
// A mapped corner is rounded over this much of the road on each side of it (m), or half the way to
// the next corner if that is nearer.
const FILLET = 12;
// A road's level follows the ground averaged over this much of its length (m), so it rides the
// plain's undulation without taking every bump of the elevation data.
const LEVEL_WINDOW = 40;
// Where a road is moved off a wall, the move eases in over this much of its length (m); it is never
// moved further than SHIFT off the mapped line (the map is a couple of metres out, not ten), and
// keeps WALL_GAP between its shoulder and the wall. RELAX: passes of the solve that finds its line.
const EASE = 16, SHIFT = 3, WALL_GAP = 0.3, RELAX = 60;
// A bridge's deck rises toward the middle of its length by this share of the length: the vertical
// curve every road bridge is built with, which also lifts it clear of the banks it springs from.
const CROWN = 1 / 150;
// What the map draws within this of a bridge's side, alongside it, is on the same structure (m): the
// footway along a road bridge is mapped as a bridge of its own.
const BESIDE = 2;
// side of the buckets the segments are sorted into for `nearest` (m)
const BUCKET = 32;

// how much room a road takes each side of its centreline: the carriageway and its shoulder
export const reachOf = ( road ) => road.half + ( road.surface === 'paved' ? SHOULDER : 0 );

export class Roads {

	// places: places.json; center ( east, north ); ground( x, z ): the dry ground's height;
	// walls: the Site's buildings, for `crossings` and `gap` (Buildings.js)
	constructor( places, { center, ground, walls } ) {

		const [ cE, cN ] = center;
		this.nodes = places.nodes.map( ( [ e, n ] ) => ( { x: e - cE, z: cN - n, y: 0, roads: [] } ) );
		for ( const n of this.nodes ) n.y = ground( n.x, n.z );
		this.roads = [];
		this.skipped = {};
		for ( const r of places.roads ) {

			const cls = ROAD_CLASSES[ r.class ];
			if ( ! cls ) { this.skipped[ r.class ] = ( this.skipped[ r.class ] || 0 ) + 1; continue; }
			// the mapped points, without any the map has twice
			const mapped = r.pts.map( ( [ e, n ] ) => [ e - cE, cN - n ] ).filter( ( p, i, P ) => ! i || p[ 0 ] !== P[ i - 1 ][ 0 ] || p[ 1 ] !== P[ i - 1 ][ 1 ] );
			if ( mapped.length < 2 ) continue;
			const road = {
				index: this.roads.length, class: r.class, name: r.name, bridge: r.bridge, a: r.a, b: r.b,
				half: cls.width / 2, surface: r.surface || cls.surface, street: cls.street && ! r.bridge,
				pts: rounded( mapped ), // [ x, z, y, distance along the road ]
				length: 0,
			};
			clear( road, walls );
			let along = 0;
			road.pts.forEach( ( p, i ) => {

				if ( i ) along += Math.hypot( p[ 0 ] - road.pts[ i - 1 ][ 0 ], p[ 1 ] - road.pts[ i - 1 ][ 1 ] );
				p[ 3 ] = along;

			} );
			road.length = along;
			level( road, this.nodes, ground );
			this.nodes[ r.a ].roads.push( road.index );
			this.nodes[ r.b ].roads.push( road.index );
			this.roads.push( road );

		}

		// The bridges, each with what runs beside it on the same deck:
		//   { main, members: [ { road, offset } ], left, right }  offsets and the deck's two sides in
		//   metres to the right of the main road's direction
		this.bridges = [];
		const spans = this.roads.filter( ( r ) => r.bridge ).sort( ( a, b ) => b.half - a.half ), taken = new Set();
		for ( const main of spans ) {

			if ( taken.has( main ) ) continue;
			taken.add( main );
			const bridge = { main, members: [], left: - main.half, right: main.half };
			for ( const o of spans ) {

				if ( taken.has( o ) ) continue;
				const mid = o.pts[ o.pts.length >> 1 ], f = project( main, mid[ 0 ], mid[ 1 ] );
				if ( f.s <= 0 || f.s >= main.length || f.d > main.half + o.half + BESIDE ) continue;
				taken.add( o );
				bridge.members.push( { road: o, offset: f.d * f.side } );
				bridge.left = Math.min( bridge.left, f.d * f.side - o.half );
				bridge.right = Math.max( bridge.right, f.d * f.side + o.half );

			}

			this.bridges.push( bridge );

		}

		this.buckets = new Map();
		for ( const road of this.roads ) for ( let s = 0; s + 1 < road.pts.length; s ++ ) {

			const a = road.pts[ s ], b = road.pts[ s + 1 ];
			const key = Math.floor( ( a[ 0 ] + b[ 0 ] ) / 2 / BUCKET ) + ',' + Math.floor( ( a[ 1 ] + b[ 1 ] ) / 2 / BUCKET );
			if ( ! this.buckets.has( key ) ) this.buckets.set( key, [] );
			this.buckets.get( key ).push( [ road, s ] );

		}

	}

	// The nearest road to a point within `reach` metres (measured to the centreline), among those
	// `accept( road )` lets through:
	//   { road, s, d, x, z, y, tx, tz, side }  s: metres along the road; d: metres from the centreline;
	//   ( x, z, y ): the point on it; ( tx, tz ): its direction there; side: +1 where the point lies to
	//   the right of that direction, -1 to the left
	// or null.
	nearest( x, z, reach, accept = null ) {

		let best = null;
		const i0 = Math.floor( ( x - reach - STEP ) / BUCKET ), i1 = Math.floor( ( x + reach + STEP ) / BUCKET );
		const j0 = Math.floor( ( z - reach - STEP ) / BUCKET ), j1 = Math.floor( ( z + reach + STEP ) / BUCKET );
		for ( let j = j0; j <= j1; j ++ ) for ( let i = i0; i <= i1; i ++ ) for ( const [ road, s ] of this.buckets.get( i + ',' + j ) || [] ) {

			if ( accept && ! accept( road ) ) continue;
			const f = foot( road, s, x, z );
			if ( f.d < ( best ? best.d : reach ) ) best = f;

		}

		return best;

	}

}

// The point of a road's segment s nearest to ( x, z ), as `nearest` describes it.
function foot( road, s, x, z ) {

	const a = road.pts[ s ], b = road.pts[ s + 1 ];
	const dx = b[ 0 ] - a[ 0 ], dz = b[ 1 ] - a[ 1 ], len = Math.hypot( dx, dz );
	const t = Math.min( 1, Math.max( 0, ( ( x - a[ 0 ] ) * dx + ( z - a[ 1 ] ) * dz ) / ( len * len ) ) );
	const px = a[ 0 ] + dx * t, pz = a[ 1 ] + dz * t, tx = dx / len, tz = dz / len;
	// right of the direction of travel: with x east and z south, that is ( -tz, tx )
	return { road, s: a[ 3 ] + len * t, d: Math.hypot( x - px, z - pz ), x: px, z: pz, y: a[ 2 ] + ( b[ 2 ] - a[ 2 ] ) * t, tx, tz, side: ( x - px ) * - tz + ( z - pz ) * tx >= 0 ? 1 : - 1 };

}

// Where a point lies against one road (the same record `nearest` gives).
export function project( road, x, z ) {

	let best = null;
	for ( let s = 0; s + 1 < road.pts.length; s ++ ) {

		const f = foot( road, s, x, z );
		if ( ! best || f.d < best.d ) best = f;

	}

	return best;

}

// The point `d` metres to the side of a road ( side +1: right of its direction ) at `s` metres along it.
export function pointAt( road, s, d, side ) {

	const P = road.pts;
	let i = 0;
	while ( i + 2 < P.length && P[ i + 1 ][ 3 ] < s ) i ++;
	const a = P[ i ], b = P[ i + 1 ], len = b[ 3 ] - a[ 3 ];
	const t = Math.min( 1, Math.max( 0, ( s - a[ 3 ] ) / len ) );
	const tx = ( b[ 0 ] - a[ 0 ] ) / len, tz = ( b[ 1 ] - a[ 1 ] ) / len;
	return [ a[ 0 ] + ( b[ 0 ] - a[ 0 ] ) * t - tz * d * side, a[ 1 ] + ( b[ 1 ] - a[ 1 ] ) * t + tx * d * side ];

}

// Visit every sample of a grid within `reach( road )` metres of a road's centreline, for the roads
// `accept` lets through: visit( k, road, d, y ) with the sample's index, its distance from the
// centreline and the road's level beside it. A sample near several roads is visited once for each.
//   grid: { res, texel, ox, oz }; sample ( i, j ) sits at ox + ( i + 0.5 ) * texel
export function overRoads( roads, grid, reach, accept, visit ) {

	const { res, texel, ox, oz } = grid;
	for ( const road of roads ) {

		if ( ! accept( road ) ) continue;
		const r = reach( road );
		for ( let s = 0; s + 1 < road.pts.length; s ++ ) {

			const a = road.pts[ s ], b = road.pts[ s + 1 ];
			const dx = b[ 0 ] - a[ 0 ], dz = b[ 1 ] - a[ 1 ], len2 = dx * dx + dz * dz;
			const i0 = Math.max( 0, Math.floor( ( Math.min( a[ 0 ], b[ 0 ] ) - r - ox ) / texel ) ), i1 = Math.min( res - 1, Math.ceil( ( Math.max( a[ 0 ], b[ 0 ] ) + r - ox ) / texel ) );
			const j0 = Math.max( 0, Math.floor( ( Math.min( a[ 1 ], b[ 1 ] ) - r - oz ) / texel ) ), j1 = Math.min( res - 1, Math.ceil( ( Math.max( a[ 1 ], b[ 1 ] ) + r - oz ) / texel ) );
			for ( let j = j0; j <= j1; j ++ ) {

				const z = oz + ( j + 0.5 ) * texel;
				for ( let i = i0; i <= i1; i ++ ) {

					const x = ox + ( i + 0.5 ) * texel;
					const t = Math.min( 1, Math.max( 0, ( ( x - a[ 0 ] ) * dx + ( z - a[ 1 ] ) * dz ) / len2 ) );
					const d = Math.hypot( x - a[ 0 ] - dx * t, z - a[ 1 ] - dz * t );
					if ( d <= r ) visit( j * res + i, road, d, a[ 2 ] + ( b[ 2 ] - a[ 2 ] ) * t );

				}

			}

		}

	}

}

// The mapped line of a road with its corners rounded, sampled every STEP metres. Each corner is
// replaced by a curve that leaves the one leg and joins the other FILLET from the corner (a
// quadratic Bezier on the corner), so the road never strays outside the corners the map drew, and
// its two ends stay where the nodes are.
function rounded( P ) {

	const out = [];
	const line = ( a, b ) => {

		const n = Math.max( 1, Math.ceil( Math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] ) / STEP ) );
		for ( let q = out.length ? 1 : 0; q <= n; q ++ ) out.push( [ a[ 0 ] + ( b[ 0 ] - a[ 0 ] ) * q / n, a[ 1 ] + ( b[ 1 ] - a[ 1 ] ) * q / n ] );

	};
	let from = P[ 0 ];
	for ( let i = 1; i + 1 < P.length; i ++ ) {

		const v = P[ i ], a = P[ i - 1 ], b = P[ i + 1 ];
		const la = Math.hypot( v[ 0 ] - a[ 0 ], v[ 1 ] - a[ 1 ] ), lb = Math.hypot( b[ 0 ] - v[ 0 ], b[ 1 ] - v[ 1 ] );
		const t = Math.min( FILLET, la / 2, lb / 2 );
		const p0 = [ v[ 0 ] + ( a[ 0 ] - v[ 0 ] ) * t / la, v[ 1 ] + ( a[ 1 ] - v[ 1 ] ) * t / la ];
		const p1 = [ v[ 0 ] + ( b[ 0 ] - v[ 0 ] ) * t / lb, v[ 1 ] + ( b[ 1 ] - v[ 1 ] ) * t / lb ];
		if ( Math.hypot( p0[ 0 ] - from[ 0 ], p0[ 1 ] - from[ 1 ] ) > 1e-6 || ! out.length ) line( from, p0 );
		const n = Math.max( 2, Math.ceil( 2 * t / STEP ) );
		for ( let q = 1; q <= n; q ++ ) {

			const u = q / n, w0 = ( 1 - u ) * ( 1 - u ), w1 = 2 * u * ( 1 - u ), w2 = u * u;
			out.push( [ p0[ 0 ] * w0 + v[ 0 ] * w1 + p1[ 0 ] * w2, p0[ 1 ] * w0 + v[ 1 ] * w1 + p1[ 1 ] * w2 ] );

		}

		from = p1;

	}

	if ( Math.hypot( P[ P.length - 1 ][ 0 ] - from[ 0 ], P[ P.length - 1 ][ 1 ] - from[ 1 ] ) > 1e-6 || ! out.length ) line( from, P[ P.length - 1 ] );
	return out;

}

// The map's roads and its buildings were drawn apart, and are a couple of metres out against each
// other: here and there a carriageway as wide as its class would run through a wall. The wall is
// where the wall is, so the road gives. At every point along it the walls to its left and right
// bound how far it may sit to either side of the mapped line; the road takes the gentlest line
// inside those bounds that returns to the mapped one over EASE. Where the walls on both sides leave
// less room than its class, it runs down the middle of the gap and is as narrow as the gap.
function clear( road, walls ) {

	if ( road.bridge ) return;
	const P = road.pts, n = P.length;
	const need = reachOf( road ) + WALL_GAP;
	// the left normal at each point ( the direction of travel turned a quarter turn to the left )
	const N = P.map( ( p, i ) => {

		const a = P[ Math.max( 0, i - 1 ) ], b = P[ Math.min( n - 1, i + 1 ) ], l = Math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] );
		return [ ( b[ 1 ] - a[ 1 ] ) / l, - ( b[ 0 ] - a[ 0 ] ) / l ];

	} );
	// how far left ( + ) the road may sit at each point: lo..hi
	const lo = new Float64Array( n ).fill( - SHIFT ), hi = new Float64Array( n ).fill( SHIFT );
	let any = false;
	for ( let i = 0; i < n; i ++ ) {

		for ( const [ l0, l1 ] of walls.crossings( P[ i ][ 0 ], P[ i ][ 1 ], N[ i ][ 0 ], N[ i ][ 1 ], need + SHIFT ) ) {

			// a building between l0 and l1 along the normal: a wall to the left, to the right, or (the
			// mapped line runs through it) to whichever side most of it lies
			if ( l0 + l1 > 0 ) hi[ i ] = Math.min( hi[ i ], l0 - need ); else lo[ i ] = Math.max( lo[ i ], l1 + need );

		}

		if ( lo[ i ] > hi[ i ] ) lo[ i ] = hi[ i ] = ( lo[ i ] + hi[ i ] ) / 2;

		if ( lo[ i ] > 0 || hi[ i ] < 0 ) any = true;

	}

	if ( ! any ) return;
	// the ends stay on their nodes
	lo[ 0 ] = hi[ 0 ] = lo[ n - 1 ] = hi[ n - 1 ] = 0;
	// The offset: each point drawn toward the mean of its neighbours and toward the mapped line, inside
	// its bounds. The pull toward the mapped line makes a move die away over EASE.
	const o = new Float64Array( n ), pull = 2 + ( STEP / EASE ) ** 2;
	for ( let pass = 0; pass < RELAX; pass ++ ) for ( let i = 1; i + 1 < n; i ++ ) o[ i ] = Math.min( hi[ i ], Math.max( lo[ i ], ( o[ i - 1 ] + o[ i + 1 ] ) / pull ) );
	P.forEach( ( p, i ) => { p[ 0 ] += N[ i ][ 0 ] * o[ i ]; p[ 1 ] += N[ i ][ 1 ] * o[ i ]; } );
	// what room the walls still do not leave, the carriageway gives up, down to a lane
	let room = Infinity;
	for ( let i = 0; i + 1 < n; i ++ ) room = Math.min( room, walls.gap( P[ i ][ 0 ], P[ i ][ 1 ], P[ i + 1 ][ 0 ], P[ i + 1 ][ 1 ], need ) );
	if ( room < reachOf( road ) ) road.half = Math.max( Math.min( road.half, LANE / 2 ), road.half - ( reachOf( road ) - room ) );

}

// The level of a road along its length: the ground under it, averaged over LEVEL_WINDOW, then
// shifted so that it meets its two nodes at their own level (every road at a junction agrees there).
// A bridge runs from one node to the other over a crown.
function level( road, nodes, ground ) {

	const P = road.pts, ya = nodes[ road.a ].y, yb = nodes[ road.b ].y;
	if ( road.bridge ) {

		for ( const p of P ) {

			const u = road.length ? p[ 3 ] / road.length : 0;
			p[ 2 ] = ya + ( yb - ya ) * u + CROWN * road.length * 4 * u * ( 1 - u );

		}

		return;

	}

	const raw = P.map( ( p ) => ground( p[ 0 ], p[ 1 ] ) );
	const sum = [ 0 ];
	for ( const v of raw ) sum.push( sum[ sum.length - 1 ] + v );
	let lo = 0, hi = 0;
	const smooth = P.map( ( p ) => {

		while ( P[ lo ][ 3 ] < p[ 3 ] - LEVEL_WINDOW / 2 ) lo ++;
		while ( hi + 1 < P.length && P[ hi + 1 ][ 3 ] <= p[ 3 ] + LEVEL_WINDOW / 2 ) hi ++;
		return ( sum[ hi + 1 ] - sum[ lo ] ) / ( hi + 1 - lo );

	} );
	const da = ya - smooth[ 0 ], db = yb - smooth[ smooth.length - 1 ];
	// the correction at each end dies away over the window (or over the road, if it is shorter)
	// instead of tilting the whole road
	const fade = Math.min( LEVEL_WINDOW, road.length ) || 1;
	P.forEach( ( p, i ) => {

		const wa = Math.max( 0, 1 - p[ 3 ] / fade ), wb = Math.max( 0, 1 - ( road.length - p[ 3 ] ) / fade );
		p[ 2 ] = smooth[ i ] + da * wa * wa * ( 3 - 2 * wa ) + db * wb * wb * ( 3 - 2 * wb );

	} );

}
