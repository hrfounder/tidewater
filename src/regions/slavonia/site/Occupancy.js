import { overRoads, reachOf } from './Roads.js';
import { toWorld } from './Buildings.js';
import { plotCorners } from './Plots.js';
import { fillPolygon, gridOf } from './Raster.js';

// Who owns each square metre of the patch. This is the one thing plants, grass and props consult
// before they stand anywhere: nothing keeps a keep-out list of its own.
//
// What a texel can be, in rising priority: a yard gives way to water, water to a road (a culvert, a
// bridge), a road to a building.
export const FREE = 0, YARD = 1, WATER = 2, ROAD = 3, BUILDING = 4;

export class Occupancy {

	// terrain: the patch, already graded (water is where its ground is under the plane)
	constructor( terrain, site ) {

		const grid = this.grid = gridOf( terrain );
		const n = grid.res * grid.res;
		const of = this.of = new Uint8Array( n );
		const claim = ( k, what ) => { if ( of[ k ] < what ) of[ k ] = what; };
		for ( const p of site.plots ) fillPolygon( grid, plotCorners( p ), ( k ) => claim( k, YARD ) );
		for ( let k = 0; k < n; k ++ ) if ( terrain.heights[ k ] < 0 ) claim( k, WATER );
		// every texel a road touches, not only those whose centre is on it (a footpath is narrower
		// than a texel): the road's reach and half a texel's diagonal
		overRoads( site.roads.roads, grid, ( r ) => reachOf( r ) + grid.texel * Math.SQRT1_2, () => true, ( k ) => claim( k, ROAD ) );
		for ( const b of site.buildings.list ) for ( const p of b.pieces ) {

			const corners = [ [ - 1, - 1 ], [ 1, - 1 ], [ 1, 1 ], [ - 1, 1 ] ].map( ( [ a, c ] ) => toWorld( b, p.u + a * p.hu, p.v + c * p.hv ) );
			fillPolygon( grid, corners, ( k ) => claim( k, BUILDING ) );

		}

	}

	// take the ground inside a polygon [ [ x, z ], ... ] for `what`, where nothing higher has it
	claim( polygon, what ) {

		fillPolygon( this.grid, polygon, ( k ) => { if ( this.of[ k ] < what ) this.of[ k ] = what; } );

	}

	at( x, z ) {

		const { res, texel, ox, oz } = this.grid;
		const i = Math.floor( ( x - ox ) / texel ), j = Math.floor( ( z - oz ) / texel );
		return i < 0 || j < 0 || i >= res || j >= res ? FREE : this.of[ j * res + i ];

	}

	// the highest claim on any texel within r metres of a point (FREE if the whole disc is free)
	within( x, z, r ) {

		const { res, texel, ox, oz } = this.grid;
		const i0 = Math.max( 0, Math.floor( ( x - r - ox ) / texel ) ), i1 = Math.min( res - 1, Math.floor( ( x + r - ox ) / texel ) );
		const j0 = Math.max( 0, Math.floor( ( z - r - oz ) / texel ) ), j1 = Math.min( res - 1, Math.floor( ( z + r - oz ) / texel ) );
		let top = FREE;
		for ( let j = j0; j <= j1; j ++ ) for ( let i = i0; i <= i1; i ++ ) {

			const dx = Math.max( 0, Math.abs( ox + ( i + 0.5 ) * texel - x ) - texel / 2 ), dz = Math.max( 0, Math.abs( oz + ( j + 0.5 ) * texel - z ) - texel / 2 );
			if ( dx * dx + dz * dz <= r * r && this.of[ j * res + i ] > top ) top = this.of[ j * res + i ];

		}

		return top;

	}

}
