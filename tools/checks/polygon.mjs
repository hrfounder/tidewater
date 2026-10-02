// A polygon with holes, for the checks: an independent point-in-polygon test (crossing number per
// point), so a check does not grade the game's rasteriser with the game's rasteriser.
export class Polygon {

	// rings: [ [ [ x, z ], ... ], ... ], the outer one first
	constructor( rings ) {

		this.rings = rings;
		this.x0 = this.z0 = Infinity; this.x1 = this.z1 = - Infinity;
		for ( const [ x, z ] of rings[ 0 ] ) {

			if ( x < this.x0 ) this.x0 = x;
			if ( x > this.x1 ) this.x1 = x;
			if ( z < this.z0 ) this.z0 = z;
			if ( z > this.z1 ) this.z1 = z;

		}

	}

	contains( x, z ) {

		if ( x < this.x0 || x > this.x1 || z < this.z0 || z > this.z1 ) return false;
		let inside = false;
		for ( const ring of this.rings ) for ( let i = 0, j = ring.length - 1; i < ring.length; j = i ++ ) {

			const [ ax, az ] = ring[ i ], [ bx, bz ] = ring[ j ];
			if ( ( az > z ) !== ( bz > z ) && x < ax + ( bx - ax ) * ( z - az ) / ( bz - az ) ) inside = ! inside;

		}

		return inside;

	}

}
