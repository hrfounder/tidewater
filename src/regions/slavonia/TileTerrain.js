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
// Rivers, canals and streams come as lines (rivers.json: points with the water level and the bank top)
// and are cut here at the patch's full resolution with a trapezoid section: flat bed, banks at the
// line's slope up to the bank top, then easing into the surrounding ground. The tiles are 10 m data
// and would alias a 30 m channel into steps.
//
// Fields as TerrainData where the terrain shaders read them. `cover` holds the ESA WorldCover class of
// each texel and `water` the water level above the datum (NaN where dry). The material masks carry
// this region's ground for GroundSurface.js, in the island's channel names:
//   sand -> cropland, path -> built-up, gully -> forest, scarp -> bare mud on the channel banks
// (softened over a few metres: the land cover is 10 m data).

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

// The centrelines come from a skeleton of the 10 m water raster, so they carry corners the river
// does not: the points sit 10 m apart and some turn by up to 20 degrees, which the channel cut then
// prints into the banks as facets. Three passes of a 5-point moving average over the easting and
// northing (the ends held, the water level left alone, since it is already a falling fit) take the
// raster's staircase out and leave the meander.
function smoothLine( line ) {

	const P = line.pts;
	if ( P.length < 5 ) return line;
	let cur = P.map( ( p ) => p.slice() );
	for ( let pass = 0; pass < 3; pass ++ ) {

		const next = cur.map( ( p ) => p.slice() );
		for ( let i = 2; i < cur.length - 2; i ++ ) for ( let c = 0; c < 2; c ++ ) {

			next[ i ][ c ] = ( cur[ i - 2 ][ c ] + cur[ i - 1 ][ c ] * 4 + cur[ i ][ c ] * 6 + cur[ i + 1 ][ c ] * 4 + cur[ i + 2 ][ c ] ) / 16;

		}

		cur = next;

	}

	return { ...line, pts: cur };

}

// separable box blur of a res x res byte mask, radius r (in place)
function blur( m, res, r ) {

	const tmp = new Float32Array( res );
	for ( let pass = 0; pass < 2; pass ++ ) {

		for ( let a = 0; a < res; a ++ ) {

			// pass 0: rows, pass 1: columns
			const at = pass ? ( b ) => b * res + a : ( b ) => a * res + b;
			let acc = 0;
			for ( let b = - r; b <= r; b ++ ) acc += m[ at( Math.min( res - 1, Math.max( 0, b ) ) ) ];
			for ( let b = 0; b < res; b ++ ) {

				tmp[ b ] = acc / ( 2 * r + 1 );
				acc += m[ at( Math.min( res - 1, b + r + 1 ) ) ] - m[ at( Math.max( 0, b - r ) ) ];

			}

			for ( let b = 0; b < res; b ++ ) m[ at( b ) ] = Math.round( tmp[ b ] );

		}

	}

}

export class TileTerrain extends Heightfield {

	// index: the tiles' index.json; readFile( file ) -> Promise<ArrayBuffer> (tiles, rivers.json)
	// farSize: how wide a ring of the 10 m tiles to keep as the coarse field around the fine patch
	// (Heightfield `far`), so the rivers and the lie of the land carry on past the metre data
	static async load( { index, readFile, center, size = 2048, res = 2048, datum, farSize = 12288 } ) {

		const T = index.tile, half = Math.max( size, farSize ) / 2;
		const [ cE, cN ] = center;
		const e0 = Math.floor( ( cE - half ) / T ) * T, e1 = Math.ceil( ( cE + half ) / T ) * T;
		const n0 = Math.floor( ( cN - half ) / T ) * T, n1 = Math.ceil( ( cN + half ) / T ) * T;
		const byKey = new Map( index.tiles.map( ( t ) => [ t.east + ',' + t.north, t ] ) );
		const tiles = [];
		// the fine patch has to be covered; the far ring is whatever of it has been exported
		const fh = size / 2;
		for ( let e = e0; e < e1; e += T ) for ( let n = n0; n < n1; n += T ) {

			const t = byKey.get( e + ',' + n );
			const fine = e + T > cE - fh && e < cE + fh && n + T > cN - fh && n < cN + fh;
			if ( ! t ) {

				if ( fine ) throw new Error( `world tile ${ e },${ n } is missing (patch outside the exported tiles)` );
				continue;

			}

			tiles.push( readFile( t.file ).then( parseTile ) );

		}

		const rivers = index.rivers ? JSON.parse( new TextDecoder().decode( await readFile( index.rivers ) ) ).lines : [];
		return new TileTerrain( await Promise.all( tiles ), { e0, n1, cols: ( e1 - e0 ) / T, rows: ( n1 - n0 ) / T, T, center, size, res, datum, rivers, farSize } );

	}

	constructor( tiles, { e0, n1, cols, rows, T, center, size, res, datum, rivers = [], farSize = 0 } ) {

		super();
		const step = tiles[ 0 ].res, per = tiles[ 0 ].n - 1;
		// one mosaic of the 10 m samples, rows from north to south (tiles share their edges)
		const mw = cols * per + 1, mh = rows * per + 1;
		const mH = new Float32Array( mw * mh ).fill( NaN ), mW = new Float32Array( mw * mh ), mC = new Uint8Array( mw * mh );
		for ( const t of tiles ) {

			const c0 = ( t.east - e0 ) / T * per, r0 = ( n1 - ( t.north + T ) ) / T * per;
			for ( let r = 0; r < t.n; r ++ ) for ( let c = 0; c < t.n; c ++ ) {

				const k = ( r0 + r ) * mw + c0 + c, s = r * t.n + c;
				mH[ k ] = t.height[ s ]; mW[ k ] = t.water[ s ]; mC[ k ] = t.cover[ s ];

			}

		}

		if ( datum === undefined ) {

			// the level of the water line nearest the centre (the river the patch is about)
			let best = Infinity;
			for ( const l of rivers ) if ( ! l.dry ) for ( const [ e, nn, lvl ] of l.pts ) {

				const d2 = ( e - center[ 0 ] ) ** 2 + ( nn - center[ 1 ] ) ** 2;
				if ( d2 < best ) { best = d2; datum = lvl; }

			}

		}

		if ( datum === undefined ) {

			// else the water in the middle of the patch (median level), else the lowest ground
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
		this.outside = 0; // replaced below, once the ground is known
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
		// the lowland has no bare rock, seabed rubble or seagrass: the masks stay zero, so that
		// everything reading a TerrainData (the bake, the minimap) finds the same fields here
		this.seagrass = new Uint8Array( n );
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

		// land cover masks, softened (the cover is 10 m blocks)
		for ( let k = 0; k < n; k ++ ) {

			const c = this.cover[ k ];
			this.sand[ k ] = c === 40 ? 255 : 0;
			this.path[ k ] = c === 50 ? 255 : 0;
			this.gully[ k ] = c === 10 || c === 20 ? 255 : 0;

		}

		const r = Math.max( 1, Math.round( 7 / this.texel ) );
		for ( const m of [ this.sand, this.path, this.gully ] ) blur( m, res, r );

		this.lines = rivers.map( smoothLine );
		this.cutChannels( this.lines );

		// The coarse field: the whole 10 m mosaic, relative to the datum, with the same channels cut
		// into it. Past the metre patch the ground, the river and its tributaries carry on from this
		// instead of flattening into a plain (Heightfield `far`).
		if ( farSize ) {

			// where the ring has not been exported the mosaic is blank: those cells take the median of
			// the ground that is there, so the plain carries on at the right level
			const have = [];
			for ( let k = 0; k < mH.length; k += 11 ) if ( mH[ k ] === mH[ k ] ) have.push( mH[ k ] );
			have.sort( ( a, b ) => a - b );
			const fill = have.length ? have[ have.length >> 1 ] : datum;
			const fh = new Float32Array( mw * mh );
			for ( let k = 0; k < fh.length; k ++ ) fh[ k ] = ( mH[ k ] === mH[ k ] ? mH[ k ] : fill ) - datum;
			const far = { heights: fh, res: mw, resZ: mh, texel: step, ox: e0 - center[ 0 ], oz: center[ 1 ] - n1 };
			this.cutChannels( this.lines, far );
			let mn = Infinity, mx = - Infinity;
			for ( let k = 0; k < fh.length; k ++ ) { if ( fh[ k ] < mn ) mn = fh[ k ]; if ( fh[ k ] > mx ) mx = fh[ k ]; }
			far.min = mn; far.max = mx;
			this.far = far;

		}
		blur( this.scarp, res, 1 );

		this.buildFlow( this.lines );

		// Beyond the patch the plain carries on: the height reported outside the domain is the median
		// of the dry ground inside it. The world's one water plane sits at the datum, so leaving this
		// at the datum would flood everything outside the tiles and turn the patch into an island in
		// a sea; at the level of the surrounding fields the plane stays buried under the land and only
		// the carved channels are wet.
		const dry = [];
		for ( let k = 0; k < n; k += 7 ) if ( ! ( this.water[ k ] === this.water[ k ] ) ) dry.push( this.heights[ k ] );
		dry.sort( ( a, b ) => a - b );
		this.outside = dry.length ? dry[ dry.length >> 1 ] : 1;

		this.buildMinMax();

	}

	// Cut the water lines into the heightfield. Every texel takes the section of the line whose bank
	// top it is nearest inside of (so confluences and parallel ditches don't fight), then:
	//   bed      level - depth, flat out to the bed's half width
	//   banks    rising at 1 : slope through the water line up to the bank top
	//   beyond   easing from the bank top into the ground over BLEND m
	// `g` is the grid to cut into: the patch itself by default, or the coarse far field, which has
	// only heights (no masks, and the water plane fills its channels on its own).
	cutChannels( lines, g = null ) {

		const BLEND = 14;
		const datum = this.datum;
		const res = g ? g.res : this.res, texel = g ? g.texel : this.texel;
		const ox = g ? g.ox : this.origin, oz = g ? g.oz : this.origin;
		const heights = g ? g.heights : this.heights;
		const masks = ! g;
		const [ cE, cN ] = this.center;
		const n = res * res;
		const bestS = new Float32Array( n ).fill( Infinity );
		const bestD = new Float32Array( n ), bestL = new Float32Array( n ), bestB = new Float32Array( n );
		const bestI = new Int32Array( n ).fill( - 1 );
		lines.forEach( ( line, li ) => {

			const { width, depth, slope } = line;
			const bh = Math.max( 0.4, width / 2 - depth * slope );
			const P = line.pts;
			for ( let s = 0; s + 1 < P.length; s ++ ) {

				const [ ea, na, la, ba ] = P[ s ], [ eb, nb, lb, bb ] = P[ s + 1 ];
				const ax = ea - cE, az = cN - na, bx = eb - cE, bz = cN - nb;
				const top = bh + ( Math.max( ba, bb ) - Math.min( la, lb ) + depth ) * slope;
				const R = top + BLEND;
				const i0 = Math.max( 0, Math.floor( ( Math.min( ax, bx ) - R - ox ) / texel ) ), i1 = Math.min( res - 1, Math.ceil( ( Math.max( ax, bx ) + R - ox ) / texel ) );
				const j0 = Math.max( 0, Math.floor( ( Math.min( az, bz ) - R - oz ) / texel ) ), j1 = Math.min( res - 1, Math.ceil( ( Math.max( az, bz ) + R - oz ) / texel ) );
				if ( i0 > i1 || j0 > j1 ) continue;
				const dx = bx - ax, dz = bz - az, len2 = Math.max( dx * dx + dz * dz, 1e-6 );
				for ( let j = j0; j <= j1; j ++ ) {

					const z = oz + ( j + 0.5 ) * texel;
					for ( let i = i0; i <= i1; i ++ ) {

						const x = ox + ( i + 0.5 ) * texel;
						const t = Math.min( 1, Math.max( 0, ( ( x - ax ) * dx + ( z - az ) * dz ) / len2 ) );
						const d = Math.hypot( x - ax - dx * t, z - az - dz * t );
						const lvl = la + ( lb - la ) * t, bank = ba + ( bb - ba ) * t;
						const sgn = d - ( bh + ( bank - lvl + depth ) * slope ); // < 0 inside the bank tops
						const k = j * res + i;
						if ( sgn < bestS[ k ] && sgn < BLEND ) {

							bestS[ k ] = sgn; bestD[ k ] = d; bestL[ k ] = lvl - datum; bestB[ k ] = bank - datum; bestI[ k ] = li;

						}

					}

				}

			}

		} );
		for ( let k = 0; k < n; k ++ ) {

			const li = bestI[ k ];
			if ( li < 0 ) continue;
			const { width, depth, slope, dry } = lines[ li ];
			const bh = Math.max( 0.4, width / 2 - depth * slope );
			const s = bestS[ k ];
			if ( s < 0 ) {

				heights[ k ] = bestL[ k ] - depth + Math.max( 0, bestD[ k ] - bh ) / slope;
				if ( masks ) {

					this.water[ k ] = ! dry && bestD[ k ] < width / 2 ? bestL[ k ] : NaN;
					// bare mud from the bed up to a little above the waterline; grass above
					const above = heights[ k ] - bestL[ k ];
					this.scarp[ k ] = Math.round( 255 * Math.min( 1, Math.max( 0, ( 0.7 - above ) / 0.5 ) ) );
					this.sand[ k ] = this.path[ k ] = this.gully[ k ] = 0;

				}

			} else {

				const t = s / BLEND, e = t * t * ( 3 - 2 * t );
				heights[ k ] = bestB[ k ] + ( heights[ k ] - bestB[ k ] ) * e;
				if ( masks && this.water[ k ] === this.water[ k ] && heights[ k ] > this.water[ k ] ) this.water[ k ] = NaN;

			}

		}

	}

	// The surface current over the patch, on a coarse grid (the flow turns over tens of metres, not
	// metres). A lowland river like the Bosut runs about a third of a metre a second mid-stream in
	// summer and a regulated canal less; the flow follows the centreline downstream and falls away
	// toward the bank, where the water is slack. Everything else — ponds, oxbows, flooded pits — is
	// still. The water surface drifts its whole wave pattern along this (ocean/WaterSurface.js).
	buildFlow( lines, texel = 8 ) {

		const res = Math.round( this.size / texel );
		const data = new Float32Array( res * res * 2 );
		const best = new Float32Array( res * res ).fill( Infinity );
		const ox = this.origin, oz = this.origin;
		const [ cE, cN ] = this.center;
		for ( const line of lines ) {

			if ( line.dry ) continue;
			const full = line.class === 'canal' ? 0.12 : 0.34;
			const half = line.width / 2;
			const P = line.pts;
			for ( let k = 0; k + 1 < P.length; k ++ ) {

				const ax = P[ k ][ 0 ] - cE, az = cN - P[ k ][ 1 ];
				const bx = P[ k + 1 ][ 0 ] - cE, bz = cN - P[ k + 1 ][ 1 ];
				const dx = bx - ax, dz = bz - az;
				const len = Math.hypot( dx, dz );
				if ( len < 1e-3 ) continue;
				// the points run downstream (the level is a falling fit), so the segment is the flow
				const ux = dx / len, uz = dz / len;
				const i0 = Math.max( 0, Math.floor( ( Math.min( ax, bx ) - half - ox ) / texel ) );
				const i1 = Math.min( res - 1, Math.ceil( ( Math.max( ax, bx ) + half - ox ) / texel ) );
				const j0 = Math.max( 0, Math.floor( ( Math.min( az, bz ) - half - oz ) / texel ) );
				const j1 = Math.min( res - 1, Math.ceil( ( Math.max( az, bz ) + half - oz ) / texel ) );
				for ( let j = j0; j <= j1; j ++ ) for ( let i = i0; i <= i1; i ++ ) {

					const x = ox + ( i + 0.5 ) * texel, z = oz + ( j + 0.5 ) * texel;
					const t = Math.min( 1, Math.max( 0, ( ( x - ax ) * dx + ( z - az ) * dz ) / ( len * len ) ) );
					const d = Math.hypot( x - ax - dx * t, z - az - dz * t );
					if ( d > half ) continue;
					const q = j * res + i;
					if ( d >= best[ q ] ) continue;
					best[ q ] = d;
					// fastest mid-stream, slack along the bank
					const across = 1 - d / half;
					const v = full * ( 0.3 + 0.7 * across * across );
					data[ q * 2 ] = ux * v;
					data[ q * 2 + 1 ] = uz * v;

				}

			}

		}

		this.flow = { data, res, texel, ox, oz };

	}

	// signed distance (m) to the nearest water's edge: > 0 over water, < 0 on land (searched out to
	// 120 m; farther land reports -120). The island's coastDistance, for the audio.
	coastDistance( x, z ) {

		const wetAt = ( px, pz ) => {

			const i = Math.floor( ( px - this.origin ) / this.texel ), j = Math.floor( ( pz - this.origin ) / this.texel );
			if ( i < 0 || j < 0 || i >= this.res || j >= this.res ) return false;
			const w = this.water[ j * this.res + i ];
			return w === w;

		};
		const wet = wetAt( x, z );
		for ( let r = 2; r <= 120; r *= 1.35 ) {

			for ( let a = 0; a < 16; a ++ ) {

				const ang = a / 16 * Math.PI * 2;
				if ( wetAt( x + Math.cos( ang ) * r, z + Math.sin( ang ) * r ) !== wet ) return { d: wet ? r : - r, beachZone: 0 };

			}

		}

		return { d: wet ? 120 : - 120, beachZone: 0 };

	}

	pathDistance() {

		return Infinity;

	}

}
