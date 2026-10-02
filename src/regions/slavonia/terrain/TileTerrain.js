import { Heightfield } from '../../../world/terrain/Heightfield.js';

// The ground of a real place, from the world tiles (tools/geodata/tiles.py): a square patch of the
// map around a centre point at metre resolution, inside the whole exported block at the tiles' own
// 10 m (the heightfield's `far` field), so the land carries on past the patch.
//
// The tiles hold dry ground: no water is cut into them. This class only resamples; whatever is cut
// into the ground (water, roads, building pads) comes from the Site, through terrain/Grade.js, and
// `finish()` is called once that is done.
//
// World axes: x = east, z = south (the engine's north is -z), y = up, in metres from `center`
// ( east, north ) on the tiles' grid (HTRS96/TM, EPSG:3765). Heights are metres above `datum`, the
// level of the patch's water, so the engine's one water plane (y = 0) is that water's surface.

const MAGIC = 0x32545754; // 'TWT2'
// metres between the patch's samples
export const TEXEL = 1;

// ESA WorldCover classes the ground shader tells apart
const COVER = { forest: 10, shrub: 20, cropland: 40, built: 50 };

export function parseTile( buffer ) {

	const v = new DataView( buffer );
	if ( v.getUint32( 0, true ) !== MAGIC ) throw new Error( 'not a TWT2 tile (re-export with tools/geodata/tiles.py)' );
	const n = v.getUint16( 4, true ), res = v.getUint16( 6, true ) / 10;
	const east = v.getInt32( 8, true ), north = v.getInt32( 12, true );
	const m = n * n;
	const h16 = new Uint16Array( buffer.slice( 16, 16 + m * 2 ) );
	const cover = new Uint8Array( buffer.slice( 16 + m * 2, 16 + m * 3 ) );
	const height = new Float32Array( m );
	for ( let k = 0; k < m; k ++ ) height[ k ] = h16[ k ] / 100;
	return { n, res, east, north, height, cover };

}

// Catmull-Rom weights
function cr( t, w ) {

	const t2 = t * t, t3 = t2 * t;
	w[ 0 ] = - 0.5 * t3 + t2 - 0.5 * t;
	w[ 1 ] = 1.5 * t3 - 2.5 * t2 + 1;
	w[ 2 ] = - 1.5 * t3 + 2 * t2 + 0.5 * t;
	w[ 3 ] = 0.5 * t3 - 0.5 * t2;

}

export class TileTerrain extends Heightfield {

	// index: the tiles' index.json; readFile( file ) -> Promise<ArrayBuffer>; size: the patch's side
	// in metres (a power of two: the terrain's quadtree halves it); datum: metres above sea level
	static async load( { index, readFile, center = index.center, size, datum } ) {

		const tiles = await Promise.all( index.tiles.map( ( t ) => readFile( t.file ).then( parseTile ) ) );
		return new TileTerrain( tiles, { tile: index.tile, center, size, datum } );

	}

	constructor( tiles, { tile, center, size, datum } ) {

		super();
		const step = tiles[ 0 ].res, per = tiles[ 0 ].n - 1;
		// one mosaic of the 10 m samples, rows from north to south (tiles share their edge samples)
		const e0 = Math.min( ...tiles.map( ( t ) => t.east ) ), n1 = Math.max( ...tiles.map( ( t ) => t.north ) ) + tile;
		const cols = ( Math.max( ...tiles.map( ( t ) => t.east ) ) + tile - e0 ) / tile;
		const rows = ( n1 - Math.min( ...tiles.map( ( t ) => t.north ) ) ) / tile;
		if ( tiles.length !== cols * rows ) throw new Error( `the world tiles do not fill their block (${ tiles.length } of ${ cols * rows })` );
		const mw = cols * per + 1, mh = rows * per + 1;
		const mH = new Float32Array( mw * mh ), mC = new Uint8Array( mw * mh );
		for ( const t of tiles ) {

			const c0 = ( t.east - e0 ) / tile * per, r0 = ( n1 - ( t.north + tile ) ) / tile * per;
			for ( let r = 0; r < t.n; r ++ ) for ( let c = 0; c < t.n; c ++ ) {

				const k = ( r0 + r ) * mw + c0 + c, s = r * t.n + c;
				mH[ k ] = t.height[ s ] - datum;
				mC[ k ] = t.cover[ s ];

			}

		}

		const [ cE, cN ] = center;
		const res = size / TEXEL, half = size / 2;
		// the resampling below reads one sample past the patch on every side
		if ( cE - half < e0 + step || cE + half > e0 + ( mw - 2 ) * step || n1 - ( cN + half ) < step || n1 - ( cN - half ) > ( mh - 2 ) * step ) throw new Error( 'the patch reaches outside the world tiles' );

		this.datum = datum;
		this.center = center;
		this.size = size;
		this.res = res;
		this.texel = TEXEL;
		this.origin = - half;
		const n = res * res;
		this.heights = new Float32Array( n );
		// The land cover class of each texel (its nearest 10 m sample), and soft masks of it for the
		// ground shader: the weight of each class among the four samples around the texel, so the
		// edge of a field is a blend between samples instead of 10 m steps.
		this.cover = new Uint8Array( n );
		this.cropland = new Uint8Array( n );
		this.built = new Uint8Array( n );
		this.forest = new Uint8Array( n );
		// written by the grading pass (terrain/Grade.js): the outlines of the paved and the unpaved roads
		this.road = new Float32Array( n );
		this.track = new Uint8Array( n );

		const wx = new Float32Array( 4 ), wz = new Float32Array( 4 );
		for ( let j = 0; j < res; j ++ ) {

			// texel centre -> mosaic coordinates (fractional sample index)
			const z = this.origin + ( j + 0.5 ) * TEXEL;
			const fr = ( n1 - ( cN - z ) ) / step;
			const r = Math.floor( fr ), tz = fr - r;
			cr( tz, wz );
			for ( let i = 0; i < res; i ++ ) {

				const x = this.origin + ( i + 0.5 ) * TEXEL;
				const fc = ( cE + x - e0 ) / step;
				const c = Math.floor( fc ), tx = fc - c;
				cr( tx, wx );
				let h = 0;
				for ( let b = 0; b < 4; b ++ ) {

					const row = ( r - 1 + b ) * mw + c - 1;
					h += wz[ b ] * ( wx[ 0 ] * mH[ row ] + wx[ 1 ] * mH[ row + 1 ] + wx[ 2 ] * mH[ row + 2 ] + wx[ 3 ] * mH[ row + 3 ] );

				}

				const k = j * res + i, m = r * mw + c;
				this.heights[ k ] = h;
				this.cover[ k ] = mC[ m + ( tz < 0.5 ? 0 : mw ) + ( tx < 0.5 ? 0 : 1 ) ];
				let crop = 0, built = 0, forest = 0;
				for ( let q = 0; q < 4; q ++ ) {

					const cl = mC[ m + ( q >> 1 ) * mw + ( q & 1 ) ];
					const w = ( q & 1 ? tx : 1 - tx ) * ( q >> 1 ? tz : 1 - tz );
					if ( cl === COVER.cropland ) crop += w;
					else if ( cl === COVER.built ) built += w;
					else if ( cl === COVER.forest || cl === COVER.shrub ) forest += w;

				}

				this.cropland[ k ] = Math.round( crop * 255 );
				this.built[ k ] = Math.round( built * 255 );
				this.forest[ k ] = Math.round( forest * 255 );

			}

		}

		// The coarse field: the whole mosaic. Its sample ( i, j ) sits on the grid line e0 + i * step,
		// and the heightfield puts sample i of a field at ox + ( i + 0.5 ) * texel.
		this.far = { heights: mH, res: mw, resZ: mh, texel: step, ox: e0 - cE - step / 2, oz: cN - n1 - step / 2 };

	}

	// Call once the ground has its final shape (terrain/Grade.js has cut the Site into it).
	finish() {

		const { far } = this;
		// The engine's terrain bake reads the island's field names: the four channels of the splat map
		// and the rock channel beside the normal. Here they carry this region's ground (GroundSurface.js).
		this.sand = this.cropland;
		this.path = this.built;
		this.gully = this.forest;
		this.scarp = this.track;
		this.rock = this.road;

		let mn = Infinity, mx = - Infinity;
		for ( let k = 0; k < far.heights.length; k ++ ) {

			const h = far.heights[ k ];
			if ( h < mn ) mn = h;
			if ( h > mx ) mx = h;

		}

		far.min = mn; far.max = mx;
		// Beyond the tiles the plain carries on at the level of the ground along their edge: the one
		// water plane of the world sits at the datum, and anything lower out there would read as sea.
		const edge = [];
		for ( let i = 0; i < far.res; i ++ ) edge.push( far.heights[ i ], far.heights[ ( far.resZ - 1 ) * far.res + i ] );
		for ( let j = 0; j < far.resZ; j ++ ) edge.push( far.heights[ j * far.res ], far.heights[ j * far.res + far.res - 1 ] );
		edge.sort( ( a, b ) => a - b );
		this.outside = edge[ edge.length >> 1 ];

		this.buildMinMax();
		this.shore = shoreDistance( this.heights, this.res );

	}

	// signed distance (m) to the nearest waterline: > 0 over water, < 0 on land (the coastDistance of
	// the island, which the audio asks for)
	coastDistance( x, z ) {

		const s = this.shore;
		const i = Math.min( s.res - 1, Math.max( 0, Math.floor( ( x - this.origin ) / s.cell ) ) );
		const j = Math.min( s.res - 1, Math.max( 0, Math.floor( ( z - this.origin ) / s.cell ) ) );
		return { d: s.d[ j * s.res + i ], beachZone: 0 };

	}

	// the worn footpaths of the island: none here (the roads are in the Site)
	pathDistance() {

		return Infinity;

	}

}

// metres between the samples of the shore distance field, and how far the distance is carried
const SHORE_CELL = 4, SHORE_REACH = 120;

// Distance to the waterline over the patch, on a coarse grid: water is where the ground is under the
// plane. Two sweeps of a chamfer transform, one for each side of the line.
function shoreDistance( heights, res ) {

	const cell = SHORE_CELL, n = res / cell, mid = cell >> 1;
	const wet = new Uint8Array( n * n );
	for ( let j = 0; j < n; j ++ ) for ( let i = 0; i < n; i ++ ) wet[ j * n + i ] = heights[ ( j * cell + mid ) * res + i * cell + mid ] < 0 ? 1 : 0;
	const diagonal = cell * Math.SQRT2;
	const sweep = ( side ) => {

		const d = new Float32Array( n * n );
		for ( let k = 0; k < n * n; k ++ ) d[ k ] = wet[ k ] === side ? SHORE_REACH : 0;
		const relax = ( k, a, b, w ) => {

			if ( a < 0 || b < 0 || a >= n || b >= n ) return;
			const v = d[ b * n + a ] + w;
			if ( v < d[ k ] ) d[ k ] = v;

		};
		for ( let j = 0; j < n; j ++ ) for ( let i = 0; i < n; i ++ ) {

			const k = j * n + i;
			relax( k, i - 1, j, cell ); relax( k, i, j - 1, cell ); relax( k, i - 1, j - 1, diagonal ); relax( k, i + 1, j - 1, diagonal );

		}

		for ( let j = n - 1; j >= 0; j -- ) for ( let i = n - 1; i >= 0; i -- ) {

			const k = j * n + i;
			relax( k, i + 1, j, cell ); relax( k, i, j + 1, cell ); relax( k, i + 1, j + 1, diagonal ); relax( k, i - 1, j + 1, diagonal );

		}

		return d;

	};
	const over = sweep( 1 ), land = sweep( 0 );
	const d = new Float32Array( n * n );
	for ( let k = 0; k < n * n; k ++ ) d[ k ] = wet[ k ] ? over[ k ] : - land[ k ];
	return { d, res: n, cell };

}
