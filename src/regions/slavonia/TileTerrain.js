import { Heightfield } from '../../world/terrain/Heightfield.js';

// Real-world terrain from the world tiles (tools/geodata/tiles.py): a square patch of the map
// around a centre point, resampled onto the engine's heightfield (1 m texels by default). The
// tiles are 10 m data; between their samples the patch is a smooth Catmull-Rom surface.
//
// World axes: x = east, z = south (the engine's north is -z), y = up. The patch is centred on
// `center` ( east, north ) in the tiles' grid (HTRS96/TM, EPSG:3765), and heights are metres above
// `datum`: by default the level of the water in the patch, so the engine's single water plane
// (G.seaLevel = 0) is that river's surface.
//
// Fields as TerrainData where the terrain shaders read them: the material masks are empty for now
// (no beach sand, reef or footpaths here); `cover` holds the ESA WorldCover class of each texel and
// `water` the water level above the datum (NaN where dry).

const MAGIC = 0x31545754; // 'TWT1'

export function parseTile( buffer ) {

	const v = new DataView( buffer );
	if ( v.getUint32( 0, true ) !== MAGIC ) throw new Error( 'not a TWT1 tile' );
	const n = v.getUint16( 4, true ), res = v.getUint16( 6, true ) / 10;
	const east = v.getInt32( 8, true ), north = v.getInt32( 12, true );
	const m = n * n;
	const h16 = new Uint16Array( buffer.slice( 16, 16 + m * 2 ) );
	const w16 = new Uint16Array( buffer.slice( 16 + m * 2, 16 + m * 4 ) );
	const cover = new Uint8Array( buffer.slice( 16 + m * 4, 16 + m * 5 ) );
	const height = new Float32Array( m ), water = new Float32Array( m );
	for ( let k = 0; k < m; k ++ ) {

		height[ k ] = h16[ k ] / 100;
		water[ k ] = w16[ k ] ? w16[ k ] / 100 : NaN;

	}

	return { n, res, east, north, height, water, cover };

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

	// index: the tiles' index.json; readTile( file ) -> Promise<ArrayBuffer>
	static async load( { index, readTile, center, size = 2048, res = 2048, datum } ) {

		const T = index.tile, half = size / 2;
		const [ cE, cN ] = center;
		const e0 = Math.floor( ( cE - half ) / T ) * T, e1 = Math.ceil( ( cE + half ) / T ) * T;
		const n0 = Math.floor( ( cN - half ) / T ) * T, n1 = Math.ceil( ( cN + half ) / T ) * T;
		const byKey = new Map( index.tiles.map( ( t ) => [ t.east + ',' + t.north, t ] ) );
		const tiles = [];
		for ( let e = e0; e < e1; e += T ) for ( let n = n0; n < n1; n += T ) {

			const t = byKey.get( e + ',' + n );
			if ( ! t ) throw new Error( `world tile ${ e },${ n } is missing (patch outside the exported tiles)` );
			tiles.push( readTile( t.file ).then( parseTile ) );

		}

		return new TileTerrain( await Promise.all( tiles ), { e0, n1, cols: ( e1 - e0 ) / T, rows: ( n1 - n0 ) / T, T, center, size, res, datum } );

	}

	constructor( tiles, { e0, n1, cols, rows, T, center, size, res, datum } ) {

		super();
		const step = tiles[ 0 ].res, per = tiles[ 0 ].n - 1;
		// one mosaic of the 10 m samples, rows from north to south (tiles share their edges)
		const mw = cols * per + 1, mh = rows * per + 1;
		const mH = new Float32Array( mw * mh ), mW = new Float32Array( mw * mh ), mC = new Uint8Array( mw * mh );
		for ( const t of tiles ) {

			const c0 = ( t.east - e0 ) / T * per, r0 = ( n1 - ( t.north + T ) ) / T * per;
			for ( let r = 0; r < t.n; r ++ ) for ( let c = 0; c < t.n; c ++ ) {

				const k = ( r0 + r ) * mw + c0 + c, s = r * t.n + c;
				mH[ k ] = t.height[ s ]; mW[ k ] = t.water[ s ]; mC[ k ] = t.cover[ s ];

			}

		}

		if ( datum === undefined ) {

			// the water in the middle of the patch (median level), else the lowest ground
			const lv = [];
			const q = Math.round( size / 4 / step );
			const mc = Math.round( ( center[ 0 ] - e0 ) / step ), mr = Math.round( ( n1 - center[ 1 ] ) / step );
			for ( let r = mr - q; r <= mr + q; r ++ ) for ( let c = mc - q; c <= mc + q; c ++ ) {

				const w = mW[ r * mw + c ];
				if ( w === w ) lv.push( w );

			}

			lv.sort( ( a, b ) => a - b );
			datum = lv.length ? lv[ lv.length >> 1 ] : Math.min( ...mH );

		}

		// water within two samples (20 m): the bank and channel edges between the 10 m water samples
		const nearWater = new Uint8Array( mw * mh );
		for ( let r = 0; r < mh; r ++ ) for ( let c = 0; c < mw; c ++ ) {

			if ( mW[ r * mw + c ] !== mW[ r * mw + c ] ) continue;
			for ( let b = Math.max( 0, r - 2 ); b <= Math.min( mh - 1, r + 2 ); b ++ ) for ( let a = Math.max( 0, c - 2 ); a <= Math.min( mw - 1, c + 2 ); a ++ ) nearWater[ b * mw + a ] = 1;

		}

		this.datum = datum;
		this.center = center;
		this.size = size;
		this.res = res;
		this.texel = size / res;
		this.origin = - size / 2;
		this.outside = 0;
		const n = res * res;
		this.heights = new Float32Array( n );
		this.water = new Float32Array( n );
		this.cover = new Uint8Array( n );
		this.rock = new Float32Array( n );
		this.sand = new Uint8Array( n );
		this.path = new Uint8Array( n );
		this.gully = new Uint8Array( n );
		this.rubble = new Uint8Array( n );
		this.scarp = new Uint8Array( n );
		this.seagrass = null;
		this.pads = [];
		this.paths = [];
		this.rockSites = [];

		const wx = new Float32Array( 4 ), wz = new Float32Array( 4 );
		for ( let j = 0; j < res; j ++ ) {

			// texel centre -> mosaic coordinates (fractional sample index)
			const z = this.origin + ( j + 0.5 ) * this.texel;
			const fr = ( n1 - ( center[ 1 ] - z ) ) / step;
			const r = Math.floor( fr );
			cr( fr - r, wz );
			for ( let i = 0; i < res; i ++ ) {

				const x = this.origin + ( i + 0.5 ) * this.texel;
				const fc = ( center[ 0 ] + x - e0 ) / step;
				const c = Math.floor( fc );
				cr( fc - c, wx );
				let h = 0;
				for ( let b = 0; b < 4; b ++ ) {

					const row = Math.min( mh - 1, Math.max( 0, r - 1 + b ) ) * mw;
					let s = 0;
					for ( let a = 0; a < 4; a ++ ) s += wx[ a ] * mH[ row + Math.min( mw - 1, Math.max( 0, c - 1 + a ) ) ];
					h += wz[ b ] * s;

				}

				const near = Math.min( mh - 1, Math.round( fr ) ) * mw + Math.min( mw - 1, Math.round( fc ) );
				const k = j * res + i;
				const wl = mW[ near ];
				this.water[ k ] = wl === wl ? wl - datum : NaN;
				this.cover[ k ] = mC[ near ];
				h -= datum;
				// one water plane: dry land the data puts below the patch's water (behind a levee, or
				// a lower stream nearby) would flood; keep it just above the water
				if ( ! nearWater[ near ] && h < 0.25 ) h = 0.25 + 0.05 * Math.tanh( h );
				this.heights[ k ] = h;

			}

		}

		this.buildMinMax();

	}

	pathDistance() {

		return Infinity;

	}

}
