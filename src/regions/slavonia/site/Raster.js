// Shapes onto a grid: { res, texel, ox, oz }, whose sample ( i, j ) sits at
// ( ox + ( i + 0.5 ) * texel, oz + ( j + 0.5 ) * texel ) and has the index j * res + i.

// Visit every sample inside a polygon (one ring of [ x, z ], open or closed): visit( k, x, z ).
export function fillPolygon( grid, ring, visit ) {

	const { res, texel, ox, oz } = grid;
	let z0 = Infinity, z1 = - Infinity;
	for ( const p of ring ) {

		if ( p[ 1 ] < z0 ) z0 = p[ 1 ];
		if ( p[ 1 ] > z1 ) z1 = p[ 1 ];

	}

	const j0 = Math.max( 0, Math.ceil( ( z0 - oz ) / texel - 0.5 ) ), j1 = Math.min( res - 1, Math.floor( ( z1 - oz ) / texel - 0.5 ) );
	const cross = [];
	for ( let j = j0; j <= j1; j ++ ) {

		const z = oz + ( j + 0.5 ) * texel;
		cross.length = 0;
		for ( let e = 0, f = ring.length - 1; e < ring.length; f = e ++ ) {

			const a = ring[ f ], b = ring[ e ];
			if ( ( a[ 1 ] <= z ) !== ( b[ 1 ] <= z ) ) cross.push( a[ 0 ] + ( b[ 0 ] - a[ 0 ] ) * ( z - a[ 1 ] ) / ( b[ 1 ] - a[ 1 ] ) );

		}

		cross.sort( ( p, q ) => p - q );
		for ( let c = 0; c + 1 < cross.length; c += 2 ) {

			const i0 = Math.max( 0, Math.ceil( ( cross[ c ] - ox ) / texel - 0.5 ) ), i1 = Math.min( res - 1, Math.floor( ( cross[ c + 1 ] - ox ) / texel - 0.5 ) );
			for ( let i = i0; i <= i1; i ++ ) visit( j * res + i, ox + ( i + 0.5 ) * texel, z );

		}

	}

}

// the grid of a square terrain patch
export const gridOf = ( terrain ) => ( { res: terrain.res, texel: terrain.texel, ox: terrain.origin, oz: terrain.origin } );
