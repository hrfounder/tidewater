import { pointAt } from './Roads.js';
import { YARD, BUILDING, WALL_STRIP, strip } from './Occupancy.js';
import { insideBuilding } from './Buildings.js';

// The fences of the Site: along each plot's street line, from the plot's one side to the other,
// wherever the house itself does not stand on that line; and in the widest gap, the yard's gate.
// The fence line takes its ground in the occupancy, so nothing is planted on it.
//
//   site.fences = { panels: [ { a, b, plot } ], gates: [ { x, z, along, out, plot } ] }
//     panel   a stretch of fence from a to b ( [ x, z ] each ), no longer than PANEL
//     gate    its middle, the unit direction it runs along and the one it faces (the street)

// the longest a panel of fence runs straight (m): the street line bends and the ground rises under it
const PANEL = 2.5;
// the fence line is looked at this often for what stands in its way (m)
const LOOK = 0.25;
// how far a fence keeps from a wall it does not join (m)
const OFF_WALL = 0.15;

// gate: the kit's yard gate { w }
export function layFences( site, gate ) {

	const { occupancy, buildings } = site, panels = [], gates = [];
	// the occupancy is a raster of metres: against walls the footprints themselves are asked
	const walled = ( x, z ) => buildings.near( x, z, buildings.radius ).some( ( b ) => insideBuilding( b, x, z, OFF_WALL ) );
	for ( const plot of site.plots ) {

		const at = ( s, d = plot.front ) => pointAt( plot.road, s, d, plot.side );
		// the stretches of the street line that are free: nothing but yard or open ground on them
		const runs = [];
		let from = null;
		for ( let s = plot.s0; ; s += LOOK ) {

			const end = s >= plot.s1, free = ! end && occupancy.at( ...at( s ) ) <= YARD && ! walled( ...at( s ) );
			if ( free && from === null ) from = s;
			if ( ! free && from !== null ) { if ( s - LOOK - from > LOOK ) runs.push( [ from, s - LOOK ] ); from = null; }
			if ( end ) break;

		}

		// the gate: in the longest stretch that has room for it, at the end nearer the house
		const mid = plot.house.frontage.s;
		const wide = runs.filter( ( [ a, b ] ) => b - a >= gate.w ).sort( ( m, n ) => ( n[ 1 ] - n[ 0 ] ) - ( m[ 1 ] - m[ 0 ] ) )[ 0 ];
		const fence = ( a, b ) => {

			const n = Math.max( 1, Math.ceil( ( b - a ) / PANEL ) );
			for ( let k = 0; k < n; k ++ ) panels.push( { a: at( a + ( b - a ) * k / n ), b: at( a + ( b - a ) * ( k + 1 ) / n ), plot } );

		};
		for ( const run of runs ) {

			if ( run !== wide ) { fence( run[ 0 ], run[ 1 ] ); continue; }
			const nearA = Math.abs( run[ 0 ] - mid ) < Math.abs( run[ 1 ] - mid );
			const g0 = nearA ? run[ 0 ] : run[ 1 ] - gate.w, g1 = g0 + gate.w;
			const p = at( g0 ), q = at( g1 ), l = Math.hypot( q[ 0 ] - p[ 0 ], q[ 1 ] - p[ 1 ] );
			const c = at( ( g0 + g1 ) / 2 ), o = at( ( g0 + g1 ) / 2, plot.front - 1 ), ol = Math.hypot( o[ 0 ] - c[ 0 ], o[ 1 ] - c[ 1 ] );
			gates.push( { x: ( p[ 0 ] + q[ 0 ] ) / 2, z: ( p[ 1 ] + q[ 1 ] ) / 2, along: [ ( q[ 0 ] - p[ 0 ] ) / l, ( q[ 1 ] - p[ 1 ] ) / l ], out: [ ( o[ 0 ] - c[ 0 ] ) / ol, ( o[ 1 ] - c[ 1 ] ) / ol ], plot } );
			if ( g0 - run[ 0 ] > LOOK ) fence( run[ 0 ], g0 );
			if ( run[ 1 ] - g1 > LOOK ) fence( g1, run[ 1 ] );

		}

	}

	// the line is taken
	const take = ( a, b ) => occupancy.claim( strip( a, b, WALL_STRIP ), BUILDING );
	for ( const p of panels ) take( p.a, p.b );
	for ( const g of gates ) take( [ g.x - g.along[ 0 ] * gate.w / 2, g.z - g.along[ 1 ] * gate.w / 2 ], [ g.x + g.along[ 0 ] * gate.w / 2, g.z + g.along[ 1 ] * gate.w / 2 ] );
	return { panels, gates };

}
