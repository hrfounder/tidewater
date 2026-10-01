// A square heightfield on the xz plane and the queries every terrain source shares: bilinear height
// and normal, and the min/max pyramid the CDLOD terrain culls with.
//
// Subclasses fill:
//   res, texel, origin, size   res x res samples, texel metres apart; sample (i, j) sits at
//                              ( origin + ( i + 0.5 ) * texel, origin + ( j + 0.5 ) * texel )
//   heights                    Float32Array( res * res ), row j = z
// then call buildMinMax(). `outside` is the height reported beyond the domain.
export class Heightfield {

	constructor() {

		this.outside = - 90;

	}

	heightAt( x, z ) {

		const { res, texel, origin, heights } = this;
		const fx = ( x - origin ) / texel - 0.5, fz = ( z - origin ) / texel - 0.5;
		if ( fx < 0 || fz < 0 || fx >= res - 1 || fz >= res - 1 ) return this.outside;
		const i = Math.floor( fx ), j = Math.floor( fz );
		const tx = fx - i, tz = fz - j;
		const k = j * res + i;
		const a = heights[ k ], b = heights[ k + 1 ], c = heights[ k + res ], d = heights[ k + res + 1 ];
		return ( a * ( 1 - tx ) + b * tx ) * ( 1 - tz ) + ( c * ( 1 - tx ) + d * tx ) * tz;

	}

	normalAt( x, z, out ) {

		const e = this.texel;
		const hx = this.heightAt( x + e, z ) - this.heightAt( x - e, z );
		const hz = this.heightAt( x, z + e ) - this.heightAt( x, z - e );
		out.set( - hx, 2 * e, - hz ).normalize();
		return out;

	}

	// min/max pyramid for CDLOD culling bounds
	buildMinMax() {

		const tile = 8; // texels per tile at the finest level
		const n = this.res / tile;
		this.mmTile = tile;
		this.mmN = n;
		const mn0 = new Float32Array( n * n ), mx0 = new Float32Array( n * n );
		const H = this.heights, res = this.res;
		for ( let tj = 0; tj < n; tj ++ ) for ( let ti = 0; ti < n; ti ++ ) {

			let mn = Infinity, mx = - Infinity;
			const jEnd = Math.min( res - 1, ( tj + 1 ) * tile ), iEnd = Math.min( res - 1, ( ti + 1 ) * tile );
			for ( let j = tj * tile; j <= jEnd; j ++ ) {

				const row = j * res;
				for ( let i = ti * tile; i <= iEnd; i ++ ) {

					const h = H[ row + i ];
					if ( h < mn ) mn = h;
					if ( h > mx ) mx = h;

				}

			}

			mn0[ tj * n + ti ] = mn;
			mx0[ tj * n + ti ] = mx;

		}

		this.mmMin = mn0;
		this.mmMax = mx0;
		// coarser levels: level l has n >> l tiles per side
		this.mmLevels = [ { n, min: mn0, max: mx0 } ];
		let cur = this.mmLevels[ 0 ];
		while ( cur.n > 1 ) {

			const m = cur.n >> 1;
			const mn = new Float32Array( m * m ), mx = new Float32Array( m * m );
			for ( let j = 0; j < m; j ++ ) for ( let i = 0; i < m; i ++ ) {

				const a = ( 2 * j ) * cur.n + 2 * i, b = a + cur.n;
				mn[ j * m + i ] = Math.min( cur.min[ a ], cur.min[ a + 1 ], cur.min[ b ], cur.min[ b + 1 ] );
				mx[ j * m + i ] = Math.max( cur.max[ a ], cur.max[ a + 1 ], cur.max[ b ], cur.max[ b + 1 ] );

			}

			cur = { n: m, min: mn, max: mx };
			this.mmLevels.push( cur );

		}

	}

	boundsFor( x0, z0, x1, z1 ) {

		const { origin, texel, mmTile } = this;
		// pick the pyramid level where the box spans only a few tiles per side
		const span = Math.max( x1 - x0, z1 - z0 ) / ( texel * mmTile );
		const l = Math.max( 0, Math.min( this.mmLevels.length - 1, Math.ceil( Math.log2( Math.max( 1, span / 2 ) ) ) ) );
		const L = this.mmLevels[ l ];
		const ts = texel * mmTile * ( 1 << l );
		const i0 = Math.floor( ( x0 - origin ) / ts ), i1 = Math.floor( ( x1 - origin ) / ts );
		const j0 = Math.floor( ( z0 - origin ) / ts ), j1 = Math.floor( ( z1 - origin ) / ts );
		let mn = Infinity, mx = - Infinity;
		let outside = false;
		for ( let j = j0; j <= j1; j ++ ) for ( let i = i0; i <= i1; i ++ ) {

			if ( i < 0 || j < 0 || i >= L.n || j >= L.n ) {

				outside = true;
				continue;

			}

			const k = j * L.n + i;
			if ( L.min[ k ] < mn ) mn = L.min[ k ];
			if ( L.max[ k ] > mx ) mx = L.max[ k ];

		}

		if ( outside ) {

			mn = Math.min( mn, this.outside );
			mx = Math.max( mx, this.outside );

		}

		return [ mn - 1, mx + 2 ];

	}

}
