// The buildings of the Site, from the mapped footprints, each set where the survey of the orthophoto
// found its roof (the map's footprints lie metres from the buildings: tools/geodata/survey.py) and
// carrying what was seen of it: `seen`, { roof: [ r, g, b ] sRGB or null } from the orthophoto, and
// whatever a record of Survey.js adds (is, storeys, walls, form: the kind of building, its storeys,
// its walls, its roof's form). Each one keeps its
// true ring, and what the ring is made of: village footprints are rectilinear (99 % of them have every wall within 5 degrees
// of one pair of axes), so a footprint is cut into the rectangles it is built from, one for a plain
// house, two or three for an L or a T. Coordinates are the patch's metres: x = east, z = south.
//
// A building's frame: `yaw` turns it about y the way the engine turns a mesh, so its local +z points
// along ( sin yaw, cos yaw ) and its local +x along ( cos yaw, -sin yaw ). Local +z is the front: the
// side it shows its street. Pieces are rectangles in that frame, around the building's origin.
//
// A landmark whose model carries a plan is not what the map drew: the mapped outline gives where it
// stands and which way its walls run, the plan everything else. Its ring and pieces are the model's,
// and it has `grounds`: { ring, walls: [ { a, b, height } ], paved: [ ring ], trees: [ { x, z, height } ] },
// its yard, the fence round it, its paving and the trees in it, all in the patch's metres.

// A wall within this of the footprint's axes is one of its straight walls (radians).
const SQUARE = 5 * Math.PI / 180;
// Corners of the ring closer together than this are one corner (m).
const JOG = 0.3;
// A house faces the nearest street within this distance (m); beyond it, it has no street.
export const FRONTAGE_REACH = 80;
// side of the buckets the buildings are sorted into for `near` (m)
const BUCKET = 32;
// the parts of one footprint draw their random choices this far apart (more than there are footprints)
const PART_SEED = 100003;

// What a building is, from its size and where it stands (the archetypes are built from this):
//   landmark     has a model of its own (Landmarks.js)
//   church       mapped as one, no model yet
//   hall         a large footprint that is also wide: a shed of the co-operative, a school, a shop.
//                (A long house with its barns in one row is as large, and narrow: a house.)
//   outbuilding  small, or standing behind another building as seen from its street
//   house        the rest
// A hall is at least HALL_AREA m2 and its main piece at least HALL_SPAN m across.
const HALL_AREA = 300, HALL_SPAN = 11, OUTBUILDING_AREA = 45;

export class Buildings {

	// places: places.json; center ( east, north ); landmarks: Map( name, lower case -> { faces, plan } );
	// survey: survey.json, { shifts, roofs } in the order of the map's buildings; seen: the records of
	// Survey.js SEEN, each with a point on its building; parted: the records of Survey.js PARTED, the
	// footprints that are several buildings.
	// The footprints only: `settle` does the rest, once the roads exist (the roads need the walls
	// first, to keep clear of them).
	constructor( places, { center, landmarks, survey, seen, parted } ) {

		const [ cE, cN ] = center;
		// ( a landmark stays where the map has it: its model's script was measured against that place,
		// on the orthophoto, by eye, which the survey's fit is not a match for )
		this.list = places.buildings.map( ( b, index ) => footprint( b, index, cE, cN, landmarks.has( ( b.name || '' ).toLowerCase() ) ? [ 0, 0 ] : survey.shifts[ index ], survey.roofs[ index ] ) );
		for ( const b of this.list ) {

			const own = landmarks.get( ( b.name || '' ).toLowerCase() );
			if ( own && own.plan ) plant( b, own, places.roads, cE, cN );

		}

		// a footprint the map draws as one and that is several buildings: cut along each line, every
		// part a building of its own from here on
		for ( const record of parted ) {

			const k = this.list.findIndex( ( b ) => inRing( b.ring, record.at[ 0 ], record.at[ 1 ] ) );
			if ( k < 0 ) throw new Error( `the survey parts a building at ${ record.at } (${ record.source }), and no footprint is there` );
			const whole = this.list[ k ];
			let rings = [ whole.ring ];
			for ( const [ a, b ] of record.cuts ) rings = rings.flatMap( ( ring ) => [ beside( ring, a, b, 1 ), beside( ring, a, b, - 1 ) ].filter( ( r ) => r.length >= 3 ) );
			if ( rings.length !== record.cuts.length + 1 ) throw new Error( `the ${ record.cuts.length } cuts through the building at ${ record.at } (${ record.source }) leave ${ rings.length } parts` );
			this.list.splice( k, 1, ...rings.map( ( ring, part ) => shape( ring, { index: whole.index, part, name: whole.name, class: whole.class, roof: whole.seen.roof } ) ) );

		}

		for ( const record of seen ) {

			const b = this.list.find( ( b ) => inRing( b.ring, record.at[ 0 ], record.at[ 1 ] ) );
			if ( ! b ) throw new Error( `the survey has a building at ${ record.at } (${ record.source }), and no footprint is there` );
			Object.assign( b.seen, record );

		}

		this.buckets = new Map();
		// how far a wall can be from its building's centre
		this.radius = 0;
		for ( const b of this.list ) {

			const key = Math.floor( b.x / BUCKET ) + ',' + Math.floor( b.z / BUCKET );
			if ( ! this.buckets.has( key ) ) this.buckets.set( key, [] );
			this.buckets.get( key ).push( b );
			for ( const [ x, z ] of bounds( b ) ) this.radius = Math.max( this.radius, Math.hypot( x - b.x, z - b.z ) );

		}

	}

	// roads: the Site's Roads; ground( x, z ): the dry ground's height; landmarks: the buildings that
	// have a model, as Map( name, lower case -> { faces: the name of the street it fronts } )
	settle( { roads, ground, landmarks } ) {

		for ( const b of this.list ) {

			// the street it faces: the nearest one (a landmark's own, if it says which), and the local
			// axis that points at it becomes +z
			const own = landmarks.get( ( b.name || '' ).toLowerCase() );
			const f = roads.nearest( b.x, b.z, FRONTAGE_REACH, ( r ) => r.street && ( ! own || r.name === own.faces ) );
			b.frontage = f;
			// ( a planned landmark was faced when its plan was set down )
			if ( f && ! b.grounds ) face( b, f.x - b.x, f.z - b.z );
			// the largest piece first: the main body
			b.pieces.sort( ( p, q ) => q.hu * q.hv - p.hu * p.hv );
			// the floor stands on the highest ground under the walls, so no wall hangs over a dip
			b.floor = Math.max( ...b.ring.map( ( [ x, z ] ) => ground( x, z ) ) );

		}

		for ( const b of this.list ) {

			const key = ( b.name || '' ).toLowerCase();
			b.kind = landmarks.has( key ) ? 'landmark'
				: b.class === 'church' ? 'church'
				: b.seen.is === 'hall' ? 'hall'
				: b.area >= HALL_AREA && 2 * Math.min( b.pieces[ 0 ].hu, b.pieces[ 0 ].hv ) >= HALL_SPAN ? 'hall'
				: b.area < OUTBUILDING_AREA || this.hidden( b ) ? 'outbuilding'
				: 'house';

		}

	}

	// The buildings a line through ( x, z ) along the unit direction ( nx, nz ) crosses within r
	// metres of the point: [ l0, l1 ] for each, where the line enters and leaves its ring (its
	// grounds' ring, if it has grounds), in metres along the direction ( negative behind the point ).
	crossings( x, z, nx, nz, r ) {

		const out = [];
		for ( const b of this.near( x, z, r + this.radius ) ) {

			let l0 = Infinity, l1 = - Infinity;
			const ring = bounds( b );
			for ( let i = 0, j = ring.length - 1; i < ring.length; j = i ++ ) {

				// the wall from a along e, against the line from the point along n
				const ax = ring[ j ][ 0 ] - x, az = ring[ j ][ 1 ] - z, ex = ring[ i ][ 0 ] - ring[ j ][ 0 ], ez = ring[ i ][ 1 ] - ring[ j ][ 1 ];
				const den = ex * nz - ez * nx;
				if ( Math.abs( den ) < 1e-9 ) continue;
				const t = ( az * nx - ax * nz ) / den;
				if ( t < 0 || t > 1 ) continue;
				const l = ( ax + ex * t ) * nx + ( az + ez * t ) * nz;
				if ( l < l0 ) l0 = l;
				if ( l > l1 ) l1 = l;

			}

			if ( l0 < r && l1 > - r && l0 < l1 ) out.push( [ l0, l1 ] );

		}

		return out;

	}

	// the narrowest gap between a segment and any wall within r metres of it ( Infinity if none: 0 if
	// the segment runs through a wall )
	gap( ax, az, bx, bz, r ) {

		let best = Infinity;
		for ( const b of this.near( ( ax + bx ) / 2, ( az + bz ) / 2, r + this.radius + Math.hypot( bx - ax, bz - az ) / 2 ) ) {

			const ring = bounds( b );
			for ( let i = 0, j = ring.length - 1; i < ring.length; j = i ++ ) {

				const d = crossesSegment( ax, az, bx, bz, ring[ j ], ring[ i ] ) ? 0 : Math.min(
					toSegment( ax, az, ring[ j ], ring[ i ] ), toSegment( bx, bz, ring[ j ], ring[ i ] ),
					toSegment( ring[ j ][ 0 ], ring[ j ][ 1 ], [ ax, az ], [ bx, bz ] ), toSegment( ring[ i ][ 0 ], ring[ i ][ 1 ], [ ax, az ], [ bx, bz ] ) );
				if ( d < best ) best = d;

			}

		}

		return best < r ? best : Infinity;

	}

	// the buildings whose centre lies within r of a point
	near( x, z, r ) {

		const out = [];
		const i0 = Math.floor( ( x - r ) / BUCKET ), i1 = Math.floor( ( x + r ) / BUCKET );
		const j0 = Math.floor( ( z - r ) / BUCKET ), j1 = Math.floor( ( z + r ) / BUCKET );
		for ( let j = j0; j <= j1; j ++ ) for ( let i = i0; i <= i1; i ++ ) for ( const b of this.buckets.get( i + ',' + j ) || [] ) {

			if ( Math.hypot( b.x - x, b.z - z ) <= r ) out.push( b );

		}

		return out;

	}

	// does another building stand between this one and its street?
	hidden( b ) {

		const f = b.frontage;
		if ( ! f ) return false;
		const reach = Math.hypot( f.x - b.x, f.z - b.z );
		for ( const o of this.near( ( b.x + f.x ) / 2, ( b.z + f.z ) / 2, reach / 2 + BUCKET ) ) {

			if ( o !== b && crosses( o.ring, b.x, b.z, f.x, f.z ) ) return true;

		}

		return false;

	}

}

// is the point inside the ring?
function inRing( ring, x, z ) {

	let inside = false;
	for ( let i = 0, j = ring.length - 1; i < ring.length; j = i ++ ) {

		const a = ring[ j ], b = ring[ i ];
		if ( ( a[ 1 ] <= z ) !== ( b[ 1 ] <= z ) && x < a[ 0 ] + ( b[ 0 ] - a[ 0 ] ) * ( z - a[ 1 ] ) / ( b[ 1 ] - a[ 1 ] ) ) inside = ! inside;

	}

	return inside;

}

// what a road keeps clear of: a building's walls, or the fence round its grounds
const bounds = ( b ) => b.grounds ? b.grounds.ring : b.ring;

// is the point inside any of the building's pieces? (margin: metres added around each piece)
export function insideBuilding( b, x, z, margin = 0 ) {

	const c = Math.cos( b.yaw ), s = Math.sin( b.yaw );
	const dx = x - b.x, dz = z - b.z;
	const u = dx * c - dz * s, v = dx * s + dz * c;
	for ( const p of b.pieces ) if ( Math.abs( u - p.u ) <= p.hu + margin && Math.abs( v - p.v ) <= p.hv + margin ) return true;
	return false;

}

// local ( u, v ) of a building -> world ( x, z )
export function toWorld( b, u, v ) {

	const c = Math.cos( b.yaw ), s = Math.sin( b.yaw );
	return [ b.x + u * c + v * s, b.z - u * s + v * c ];

}

// The part of a ring that lies on one side of the line through a and b (side 1: to its left as one
// goes from a to b on the map, x east and z south; - 1: to its right): the ring cut straight along it.
function beside( ring, a, b, side ) {

	const off = ( p ) => side * ( ( b[ 0 ] - a[ 0 ] ) * ( p[ 1 ] - a[ 1 ] ) - ( b[ 1 ] - a[ 1 ] ) * ( p[ 0 ] - a[ 0 ] ) ), out = [];
	ring.forEach( ( p, i ) => {

		const q = ring[ ( i + 1 ) % ring.length ], dp = off( p ), dq = off( q );
		if ( dp >= 0 ) out.push( p );
		if ( ( dp > 0 && dq < 0 ) || ( dp < 0 && dq > 0 ) ) out.push( [ p[ 0 ] + ( q[ 0 ] - p[ 0 ] ) * dp / ( dp - dq ), p[ 1 ] + ( q[ 1 ] - p[ 1 ] ) * dp / ( dp - dq ) ] );

	} );
	return out;

}

// src: the map's building; shift: [ east, north ], the metres the survey moves it by; roof: what the
// survey saw of its roof
function footprint( src, index, cE, cN, shift, roof ) {

	// the ring, open, in the patch's metres
	const ring = src.ring.slice( 0, - 1 ).map( ( [ e, n ] ) => [ e + shift[ 0 ] - cE, cN - n - shift[ 1 ] ] );
	return shape( ring, { index, part: 0, name: src.name, class: src.class, roof } );

}

// A building from its ring ( open, in the patch's metres ). index: its footprint's in the map; part:
// which part of that footprint it is ( 0 for the whole of it ).
function shape( ring, { index, part, name, class: cls, roof } ) {

	// without doubled corners
	ring = ring.filter( ( p, i ) => Math.hypot( p[ 0 ] - ring[ ( i + 1 ) % ring.length ][ 0 ], p[ 1 ] - ring[ ( i + 1 ) % ring.length ][ 1 ] ) > JOG );
	let area = 0;
	for ( let i = 0; i < ring.length; i ++ ) {

		const a = ring[ i ], b = ring[ ( i + 1 ) % ring.length ];
		area += a[ 0 ] * b[ 1 ] - b[ 0 ] * a[ 1 ];

	}

	area = Math.abs( area ) / 2;

	// the footprint's axes: the direction of its walls modulo a quarter turn, weighted by their length
	let sx = 0, sz = 0;
	for ( let i = 0; i < ring.length; i ++ ) {

		const a = ring[ i ], b = ring[ ( i + 1 ) % ring.length ];
		const dx = b[ 0 ] - a[ 0 ], dz = b[ 1 ] - a[ 1 ], l = Math.hypot( dx, dz ), ang = Math.atan2( dz, dx ) * 4;
		sx += Math.cos( ang ) * l; sz += Math.sin( ang ) * l;

	}

	// u runs along ( cos t, sin t ), v along ( -sin t, cos t ); the engine's yaw for that frame is -t
	const t = Math.atan2( sz, sx ) / 4, c = Math.cos( t ), s = Math.sin( t );
	const local = ring.map( ( [ x, z ] ) => [ x * c + z * s, - x * s + z * c ] );
	let u0 = Infinity, u1 = - Infinity, v0 = Infinity, v1 = - Infinity;
	for ( const [ u, v ] of local ) {

		if ( u < u0 ) u0 = u; if ( u > u1 ) u1 = u; if ( v < v0 ) v0 = v; if ( v > v1 ) v1 = v;

	}

	const ou = ( u0 + u1 ) / 2, ov = ( v0 + v1 ) / 2;
	const rects = rectangles( local.map( ( [ u, v ] ) => [ u - ou, v - ov ] ) );
	return {
		// ( seed: what its random choices are drawn from, its own for every part of a footprint )
		index, part, seed: index + PART_SEED * part, name, class: cls, ring, area,
		x: ou * c - ov * s, z: ou * s + ov * c, yaw: - t,
		// exact: the pieces are the footprint. Otherwise the footprint has walls off its axes (26 of
		// 3065 here: apses, chamfered corners) and the one piece is the rectangle around it.
		exact: rects !== null,
		pieces: rects || [ { u: 0, v: 0, hu: ( u1 - u0 ) / 2, hv: ( v1 - v0 ) / 2 } ],
		frontage: null, floor: 0, kind: null, grounds: null, seen: { roof },
	};

}

// Set a landmark's plan down on its mapped footprint: the frame turned to face its street (found on
// the mapped roads: the Site's own are not made yet, and they keep clear of what is set down here),
// then the ring, the pieces and the grounds from the plan.
function plant( b, own, roads, cE, cN ) {

	let near = null, d = Infinity;
	for ( const r of roads ) {

		if ( r.name !== own.faces ) continue;
		for ( let i = 0; i + 1 < r.pts.length; i ++ ) {

			const p = [ r.pts[ i ][ 0 ] - cE, cN - r.pts[ i ][ 1 ] ], q = [ r.pts[ i + 1 ][ 0 ] - cE, cN - r.pts[ i + 1 ][ 1 ] ];
			const dx = q[ 0 ] - p[ 0 ], dz = q[ 1 ] - p[ 1 ], t = Math.min( 1, Math.max( 0, ( ( b.x - p[ 0 ] ) * dx + ( b.z - p[ 1 ] ) * dz ) / ( dx * dx + dz * dz || 1 ) ) );
			const at = [ p[ 0 ] + dx * t, p[ 1 ] + dz * t ], l = Math.hypot( at[ 0 ] - b.x, at[ 1 ] - b.z );
			if ( l < d ) { d = l; near = at; }

		}

	}

	if ( ! near || d > FRONTAGE_REACH ) throw new Error( `${ b.name } is said to face ${ own.faces }, and the map has no such street within ${ FRONTAGE_REACH } m of it` );
	face( b, near[ 0 ] - b.x, near[ 1 ] - b.z );
	const P = own.plan, W = ( [ u, v ] ) => toWorld( b, u, v );
	b.ring = P.outline.map( W );
	b.pieces = P.boxes.map( ( [ x0, x1, z0, z1, top ] ) => ( { u: ( x0 + x1 ) / 2, v: ( z0 + z1 ) / 2, hu: ( x1 - x0 ) / 2, hv: ( z1 - z0 ) / 2, top } ) );
	// ( its pieces are what the model says cannot be walked through, not its footprint cut up )
	b.exact = false;
	b.area = Math.abs( b.ring.reduce( ( s, p, i ) => { const q = b.ring[ ( i + 1 ) % b.ring.length ]; return s + p[ 0 ] * q[ 1 ] - q[ 0 ] * p[ 1 ]; }, 0 ) ) / 2;
	b.grounds = {
		ring: P.yard.map( W ),
		walls: P.walls.map( ( [ ax, az, bx, bz, height ] ) => ( { a: W( [ ax, az ] ), b: W( [ bx, bz ] ), height } ) ),
		paved: P.paved.map( ( ring ) => ring.map( W ) ),
		trees: P.trees.map( ( [ x, z, height ] ) => ( { x: W( [ x, z ] )[ 0 ], z: W( [ x, z ] )[ 1 ], height } ) ),
	};

}

// Turn a building's frame by quarter turns so that its local +z is the axis nearest ( dx, dz ).
function face( b, dx, dz ) {

	const c = Math.cos( b.yaw ), s = Math.sin( b.yaw );
	const u = dx * c - dz * s, v = dx * s + dz * c;
	// quarter turns q: the new +z is the old +z, +x, -z or -x
	const q = Math.abs( v ) >= Math.abs( u ) ? ( v >= 0 ? 0 : 2 ) : ( u >= 0 ? 1 : 3 );
	for ( let k = 0; k < q; k ++ ) for ( const p of b.pieces ) {

		// one quarter turn: what was +x becomes +z
		[ p.u, p.v, p.hu, p.hv ] = [ - p.v, p.u, p.hv, p.hu ];

	}

	b.yaw += q * Math.PI / 2;

}

// The rectangles a rectilinear ring is made of, as { u, v, hu, hv } (centre and half extents), or
// null if the ring has a wall off the axes. The ring is cut into strips at every corner along one
// axis; strips with the same span join. Both axes are tried and the cut with fewer pieces wins (an L
// is two either way: then the one that keeps the larger piece whole).
function rectangles( ring ) {

	const n = ring.length;
	// each wall is along u or along v; snap its ends onto its line
	const along = [];
	for ( let i = 0; i < n; i ++ ) {

		const a = ring[ i ], b = ring[ ( i + 1 ) % n ];
		const ang = Math.atan2( b[ 1 ] - a[ 1 ], b[ 0 ] - a[ 0 ] );
		const off = Math.abs( ( ( ang % ( Math.PI / 2 ) ) + Math.PI / 2 ) % ( Math.PI / 2 ) );
		if ( Math.min( off, Math.PI / 2 - off ) > SQUARE ) return null;
		along.push( Math.abs( b[ 0 ] - a[ 0 ] ) >= Math.abs( b[ 1 ] - a[ 1 ] ) ? 'u' : 'v' );

	}

	// corners: where a wall along u meets one along v, at the u of the one and the v of the other
	const P = [];
	for ( let i = 0; i < n; i ++ ) {

		const prev = ( i + n - 1 ) % n;
		if ( along[ prev ] === along[ i ] ) continue; // a straight run: no corner here
		const wallV = along[ i ] === 'v' ? i : prev, wallU = along[ i ] === 'u' ? i : prev;
		// a wall's line: the mean of its two ends across it
		const u = ( ring[ wallV ][ 0 ] + ring[ ( wallV + 1 ) % n ][ 0 ] ) / 2;
		const v = ( ring[ wallU ][ 1 ] + ring[ ( wallU + 1 ) % n ][ 1 ] ) / 2;
		P.push( [ u, v ] );

	}

	if ( P.length < 4 || P.length % 2 ) return null;
	// walls that are one line in the building come out of the map a few centimetres apart: put
	// every corner on the mean of the lines within JOG of each other
	for ( const ax of [ 0, 1 ] ) {

		const order = P.map( ( _, i ) => i ).sort( ( i, j ) => P[ i ][ ax ] - P[ j ][ ax ] );
		for ( let i = 0; i < order.length; ) {

			let j = i, sum = 0;
			while ( j < order.length && P[ order[ j ] ][ ax ] - P[ order[ i ] ][ ax ] <= JOG ) sum += P[ order[ j ++ ] ][ ax ];
			for ( let k = i; k < j; k ++ ) P[ order[ k ] ][ ax ] = sum / ( j - i );
			i = j;

		}

	}

	const a = strips( P, 0 ), b = strips( P, 1 );
	if ( ! a || ! b ) return a || b;
	if ( a.length !== b.length ) return a.length < b.length ? a : b;
	const biggest = ( R ) => Math.max( ...R.map( ( r ) => r.hu * r.hv ) );
	return biggest( a ) >= biggest( b ) ? a : b;

}

// cut a rectilinear polygon into strips across axis `ax` (0: strips side by side along u)
function strips( P, ax ) {

	const o = 1 - ax, n = P.length;
	const cuts = [ ...new Set( P.map( ( p ) => p[ ax ] ) ) ].sort( ( p, q ) => p - q );
	const open = new Map(), out = [];
	for ( let c = 0; c + 1 < cuts.length; c ++ ) {

		const mid = ( cuts[ c ] + cuts[ c + 1 ] ) / 2;
		// the walls that cross the strip, by where they lie across it
		const at = [];
		for ( let i = 0; i < n; i ++ ) {

			const p = P[ i ], q = P[ ( i + 1 ) % n ];
			if ( ( p[ ax ] < mid ) !== ( q[ ax ] < mid ) ) at.push( p[ o ] );

		}

		if ( at.length % 2 ) return null;
		at.sort( ( p, q ) => p - q );
		const seen = new Set();
		for ( let k = 0; k < at.length; k += 2 ) {

			const key = at[ k ] + ':' + at[ k + 1 ];
			seen.add( key );
			// the same span as in the strip before: one rectangle carries on
			if ( open.has( key ) ) open.get( key ).hi = cuts[ c + 1 ];
			else open.set( key, { lo: cuts[ c ], hi: cuts[ c + 1 ], a: at[ k ], b: at[ k + 1 ] } );

		}

		for ( const [ key, r ] of open ) if ( ! seen.has( key ) ) { out.push( r ); open.delete( key ); }

	}

	out.push( ...open.values() );
	return out.map( ( r ) => {

		const along = { c: ( r.lo + r.hi ) / 2, h: ( r.hi - r.lo ) / 2 }, across = { c: ( r.a + r.b ) / 2, h: ( r.b - r.a ) / 2 };
		const U = ax === 0 ? along : across, V = ax === 0 ? across : along;
		return { u: U.c, v: V.c, hu: U.h, hv: V.h };

	} );

}

// do the segments a-b and p-q cross?
function crossesSegment( ax, az, bx, bz, p, q ) {

	const side = ( px, pz, qx, qz, rx, rz ) => ( qx - px ) * ( rz - pz ) - ( qz - pz ) * ( rx - px );
	return side( ax, az, bx, bz, p[ 0 ], p[ 1 ] ) * side( ax, az, bx, bz, q[ 0 ], q[ 1 ] ) < 0
		&& side( p[ 0 ], p[ 1 ], q[ 0 ], q[ 1 ], ax, az ) * side( p[ 0 ], p[ 1 ], q[ 0 ], q[ 1 ], bx, bz ) < 0;

}

// does the segment a-b cross the ring?
function crosses( ring, ax, az, bx, bz ) {

	for ( let i = 0; i < ring.length; i ++ ) if ( crossesSegment( ax, az, bx, bz, ring[ i ], ring[ ( i + 1 ) % ring.length ] ) ) return true;
	return false;

}

// distance from a point to the segment p-q
function toSegment( x, z, p, q ) {

	const dx = q[ 0 ] - p[ 0 ], dz = q[ 1 ] - p[ 1 ];
	const t = Math.min( 1, Math.max( 0, ( ( x - p[ 0 ] ) * dx + ( z - p[ 1 ] ) * dz ) / ( dx * dx + dz * dz || 1 ) ) );
	return Math.hypot( x - p[ 0 ] - dx * t, z - p[ 1 ] - dz * t );

}
