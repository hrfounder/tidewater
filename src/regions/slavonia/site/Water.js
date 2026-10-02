// The water of the Site: every body the map draws, as vectors in the patch's own metres (x = east,
// z = south from the centre, levels above the datum). tools/geodata/terrain.py makes them:
//
//   areas   a mapped polygon is the bank line itself. The Bosut is one, 33 to 55 m wide here.
//   lines   rivers, canals, streams and ditches as a centreline with a width by class. Where a line
//           runs inside an area it is that area's course (its direction of flow), not a channel.
//
// Everything that needs the water reads it here: the terrain cuts the bodies into the ground
// (terrain/Grade.js), the surface drifts along `flowAt`, the fishing reads `at`.

// How fast the water moves mid-stream, by class, in metres a second. The Bosut is a slow lowland
// river: at summer level it drifts rather than runs. A regulated drainage canal barely moves.
// Everything else here is too small or too still to carry a float along.
export const CURRENT = { river: 0.12, canal: 0.05 };

// side of the buckets the courses are sorted into for `flowAt` (m): wider than half the widest body
const COURSE_BUCKET = 64;

// the level of the water nearest the centre, in the data's own metres above the sea: the datum
export function waterDatum( json, center ) {

	let best = Infinity, datum;
	for ( const l of json.lines ) if ( ! l.dry ) for ( const [ e, n, level ] of l.pts ) {

		const d2 = ( e - center[ 0 ] ) ** 2 + ( n - center[ 1 ] ) ** 2;
		if ( d2 < best ) { best = d2; datum = level; }

	}

	if ( datum === undefined ) throw new Error( 'no water in the block to take the datum from' );
	return datum;

}

export class Water {

	// json: water.json of the block; center ( east, north ) and datum as the terrain has them
	constructor( json, { center, datum } ) {

		const [ cE, cN ] = center;
		this.bodies = [];
		for ( const a of json.areas ) this.bodies.push( {
			kind: 'area', name: a.name, class: a.class, level: a.level - datum, depth: a.depth, slope: a.slope, dry: false,
			current: a.flowing ? CURRENT[ a.class ] || 0 : 0,
			rings: a.rings.map( ( r ) => r.map( ( [ e, n ] ) => [ e - cE, cN - n ] ) ),
		} );
		for ( const l of json.lines ) this.bodies.push( {
			kind: 'line', name: l.name, class: l.class, depth: l.depth, slope: l.slope, dry: l.dry, half: l.width / 2,
			current: l.dry ? 0 : CURRENT[ l.class ] || 0,
			// x, z, level, 1 where the point lies inside an area
			pts: l.pts.map( ( [ e, n, level, inside ] ) => [ e - cE, cN - n, level - datum, inside ] ),
		} );

		// the courses: the segments of every line that carries a current, bucketed
		this.courses = new Map();
		for ( const b of this.bodies ) if ( b.kind === 'line' && b.current ) for ( let s = 0; s + 1 < b.pts.length; s ++ ) {

			const [ ax, az ] = b.pts[ s ], [ bx, bz ] = b.pts[ s + 1 ];
			const len = Math.hypot( bx - ax, bz - az );
			if ( len < 1e-3 ) continue;
			const seg = { ax, az, bx, bz, ux: ( bx - ax ) / len, uz: ( bz - az ) / len };
			const key = bucket( ( ax + bx ) / 2, ( az + bz ) / 2 );
			if ( ! this.courses.has( key ) ) this.courses.set( key, [] );
			this.courses.get( key ).push( seg );

		}

		// which body each texel of the patch belongs to, once the terrain has been cut (`bind`)
		this.owner = null;

	}

	// The signed distance from every sample of a grid to the nearest waterline, as the map has it:
	// negative inside the water, positive on the bank, out to where a bank rising from the waterline
	// at the body's slope would stand `top` metres over the datum. Lines narrower than the grid's
	// spacing are left out (it cannot hold them).
	//   grid: { res, resZ (default res), texel, ox, oz }; sample ( i, j ) sits at ox + ( i + 0.5 ) * texel
	//   -> { s (Infinity beyond every bank), level (of the water there), body (index, -1 for none) }
	field( grid, top ) {

		const res = grid.res, resZ = grid.resZ || res, n = res * resZ;
		const f = { s: new Float32Array( n ).fill( Infinity ), level: new Float32Array( n ), body: new Int16Array( n ).fill( - 1 ) };
		const scratch = new Float32Array( n );
		this.bodies.forEach( ( b, bi ) => {

			if ( b.kind === 'area' ) areaInto( f, scratch, grid, b, bi, top );
			else if ( b.half * 2 >= grid.texel ) lineInto( f, grid, b, bi, top );

		} );
		return f;

	}

	// keep which body owns each texel of the patch (the field the terrain was cut with)
	bind( terrain, field ) {

		this.terrain = terrain;
		this.owner = field.body;

	}

	// the body the water at a point of the patch belongs to, or null on dry land and outside
	bodyAt( x, z ) {

		const T = this.terrain;
		const i = Math.floor( ( x - T.origin ) / T.texel ), j = Math.floor( ( z - T.origin ) / T.texel );
		if ( i < 0 || j < 0 || i >= T.res || j >= T.res ) return null;
		const bi = this.owner[ j * T.res + i ];
		return bi < 0 ? null : this.bodies[ bi ];

	}

	// The surface current at a point, in metres a second ( east, south ), into `out` [ vx, vz ]; zero
	// in still water. The direction is the nearest course's; the speed falls with the depth toward
	// the bank the way a wide channel's does (Manning: speed goes with depth to the two-thirds).
	flowAt( x, z, depth, out ) {

		out[ 0 ] = out[ 1 ] = 0;
		const b = this.bodyAt( x, z );
		if ( ! b || ! b.current || depth <= 0 ) return 0;
		let best = Infinity, seg = null;
		const bi = Math.floor( x / COURSE_BUCKET ), bj = Math.floor( z / COURSE_BUCKET );
		for ( let dj = - 1; dj <= 1; dj ++ ) for ( let di = - 1; di <= 1; di ++ ) for ( const s of this.courses.get( ( bi + di ) + ',' + ( bj + dj ) ) || [] ) {

			const dx = s.bx - s.ax, dz = s.bz - s.az;
			const t = Math.min( 1, Math.max( 0, ( ( x - s.ax ) * dx + ( z - s.az ) * dz ) / ( dx * dx + dz * dz ) ) );
			const d = Math.hypot( x - s.ax - dx * t, z - s.az - dz * t );
			if ( d < best ) { best = d; seg = s; }

		}

		if ( ! seg ) return 0;
		const speed = b.current * Math.pow( Math.min( 1, depth / b.depth ), 2 / 3 );
		out[ 0 ] = seg.ux * speed;
		out[ 1 ] = seg.uz * speed;
		return speed;

	}

}

const bucket = ( x, z ) => Math.floor( x / COURSE_BUCKET ) + ',' + Math.floor( z / COURSE_BUCKET );

// how far from a body's waterline its bank can reach before it meets ground `top` metres high
const reachOf = ( b, level, top, grid ) => Math.max( 0, top - level ) * b.slope + grid.texel;

// index range of the samples within r of [ lo, hi ] along one axis
function span( lo, hi, r, origin, texel, count ) {

	return [ Math.max( 0, Math.floor( ( lo - r - origin ) / texel ) ), Math.min( count - 1, Math.ceil( ( hi + r - origin ) / texel ) ) ];

}

function take( f, k, s, level, bi ) {

	if ( s < f.s[ k ] ) { f.s[ k ] = s; f.level[ k ] = level; f.body[ k ] = bi; }

}

// an area: distance to its rings near them, and the side of them by even-odd crossings per row
function areaInto( f, scratch, grid, b, bi, top ) {

	const { res, texel, ox, oz } = grid, resZ = grid.resZ || res;
	const r = reachOf( b, b.level, top, grid );
	let x0 = Infinity, x1 = - Infinity, z0 = Infinity, z1 = - Infinity;
	for ( const ring of b.rings ) for ( const [ x, z ] of ring ) {

		if ( x < x0 ) x0 = x; if ( x > x1 ) x1 = x; if ( z < z0 ) z0 = z; if ( z > z1 ) z1 = z;

	}

	const [ i0, i1 ] = span( x0, x1, r, ox, texel, res ), [ j0, j1 ] = span( z0, z1, r, oz, texel, resZ );
	if ( i0 > i1 || j0 > j1 ) return;
	for ( let j = j0; j <= j1; j ++ ) scratch.fill( Infinity, j * res + i0, j * res + i1 + 1 );
	for ( const ring of b.rings ) for ( let e = 0; e + 1 < ring.length; e ++ ) {

		const [ ax, az ] = ring[ e ], [ bx, bz ] = ring[ e + 1 ];
		const dx = bx - ax, dz = bz - az, len2 = Math.max( dx * dx + dz * dz, 1e-9 );
		const [ a0, a1 ] = span( Math.min( ax, bx ), Math.max( ax, bx ), r, ox, texel, res );
		const [ b0, b1 ] = span( Math.min( az, bz ), Math.max( az, bz ), r, oz, texel, resZ );
		for ( let j = b0; j <= b1; j ++ ) {

			const z = oz + ( j + 0.5 ) * texel;
			for ( let i = a0; i <= a1; i ++ ) {

				const x = ox + ( i + 0.5 ) * texel;
				const t = Math.min( 1, Math.max( 0, ( ( x - ax ) * dx + ( z - az ) * dz ) / len2 ) );
				const d = Math.hypot( x - ax - dx * t, z - az - dz * t );
				const k = j * res + i;
				if ( d < scratch[ k ] ) scratch[ k ] = d;

			}

		}

	}

	const cross = [];
	for ( let j = j0; j <= j1; j ++ ) {

		const z = oz + ( j + 0.5 ) * texel;
		cross.length = 0;
		for ( const ring of b.rings ) for ( let e = 0; e + 1 < ring.length; e ++ ) {

			const [ ax, az ] = ring[ e ], [ bx, bz ] = ring[ e + 1 ];
			if ( ( az <= z ) !== ( bz <= z ) ) cross.push( ax + ( bx - ax ) * ( z - az ) / ( bz - az ) );

		}

		cross.sort( ( p, q ) => p - q );
		let c = 0;
		for ( let i = i0; i <= i1; i ++ ) {

			const x = ox + ( i + 0.5 ) * texel;
			while ( c < cross.length && cross[ c ] <= x ) c ++;
			const k = j * res + i, d = scratch[ k ];
			if ( c & 1 ) take( f, k, - d, b.level, bi );
			else if ( d <= r ) take( f, k, d, b.level, bi );

		}

	}

}

// a line: a band of its width around the centreline, except where it runs inside an area
function lineInto( f, grid, b, bi, top ) {

	const { res, texel, ox, oz } = grid, resZ = grid.resZ || res;
	const P = b.pts;
	for ( let s = 0; s + 1 < P.length; s ++ ) {

		const [ ax, az, la, ia ] = P[ s ], [ bx, bz, lb, ib ] = P[ s + 1 ];
		if ( ia && ib ) continue;
		const r = b.half + reachOf( b, Math.min( la, lb ), top, grid );
		const dx = bx - ax, dz = bz - az, len2 = Math.max( dx * dx + dz * dz, 1e-9 );
		const [ i0, i1 ] = span( Math.min( ax, bx ), Math.max( ax, bx ), r, ox, texel, res );
		const [ j0, j1 ] = span( Math.min( az, bz ), Math.max( az, bz ), r, oz, texel, resZ );
		for ( let j = j0; j <= j1; j ++ ) {

			const z = oz + ( j + 0.5 ) * texel;
			for ( let i = i0; i <= i1; i ++ ) {

				const x = ox + ( i + 0.5 ) * texel;
				const t = Math.min( 1, Math.max( 0, ( ( x - ax ) * dx + ( z - az ) * dz ) / len2 ) );
				const d = Math.hypot( x - ax - dx * t, z - az - dz * t ) - b.half;
				if ( d <= r - b.half ) take( f, j * res + i, d, la + ( lb - la ) * t, bi );

			}

		}

	}

}
