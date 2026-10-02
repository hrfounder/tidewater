import { project, pointAt } from './Roads.js';

// The plots of the Site: the strip of land each street-front building stands on. A Slavonian street
// (a šor) is a row of long narrow plots side by side; the house stands on the street line with its
// yard beside and behind it, and the fence runs along the street line from one house to the next.
//
// The map has no parcels here, so a plot is laid out from the row itself, in the coordinates of its
// street: `s` metres along the road, `d` metres out from its centreline on the plot's side.
//
//   { road, side, s0, s1, front, back, house, buildings }
//     s0..s1   its stretch of the street: halfway to the neighbour on each side
//     front    the street line: where the front wall of its house stands
//     back     as far back as its buildings reach, and a yard's width more
//
// Real cadastral parcels replace this when they are available; what reads a plot stays the same.

// The frontage a village plot has on its street (m): a šor plot is about ten fathoms wide. A plot
// reaches past its house to the neighbour's, but not across an empty lot further than this.
const PLOT_FRONTAGE = 20;
// the yard behind the last building of a plot (m)
const YARD_BACK = 6;

export function buildPlots( buildings, roads ) {

	// every building against its street: the stretch it covers and how far out it stands
	const rows = new Map();
	for ( const b of buildings.list ) {

		const f = b.frontage;
		if ( ! f ) continue;
		let s0 = Infinity, s1 = - Infinity, d0 = Infinity, d1 = - Infinity;
		for ( const [ x, z ] of b.ring ) {

			const p = project( f.road, x, z );
			if ( p.s < s0 ) s0 = p.s; if ( p.s > s1 ) s1 = p.s;
			if ( p.d < d0 ) d0 = p.d; if ( p.d > d1 ) d1 = p.d;

		}

		const key = f.road.index + ':' + f.side;
		if ( ! rows.has( key ) ) rows.set( key, { road: f.road, side: f.side, all: [] } );
		rows.get( key ).all.push( { b, s0, s1, d0, d1, mid: ( s0 + s1 ) / 2 } );

	}

	const plots = [];
	for ( const row of rows.values() ) {

		// the street front: what is not an outbuilding
		const front = row.all.filter( ( e ) => e.b.kind !== 'outbuilding' ).sort( ( p, q ) => p.mid - q.mid );
		front.forEach( ( e, i ) => {

			const slack = Math.max( 0, PLOT_FRONTAGE - ( e.s1 - e.s0 ) );
			const toward = ( o ) => o.s0 > e.s1 || o.s1 < e.s0 ? ( o.mid > e.mid ? ( e.s1 + o.s0 ) / 2 : ( o.s1 + e.s0 ) / 2 ) : ( e.mid + o.mid ) / 2;
			const lo = i ? toward( front[ i - 1 ] ) : - Infinity, hi = i + 1 < front.length ? toward( front[ i + 1 ] ) : Infinity;
			const plot = {
				road: row.road, side: row.side, house: e.b,
				s0: Math.max( 0, lo, e.s0 - slack ), s1: Math.min( row.road.length, hi, e.s1 + slack ),
				front: e.d0, back: e.d1 + YARD_BACK, buildings: [ e.b ],
			};
			// squeezed out by its neighbours: a building without a plot of its own
			if ( plot.s1 <= plot.s0 ) return;
			e.b.plot = plot;
			plots.push( plot );

		} );
		// the outbuildings of the row go to the plot whose stretch they stand in
		for ( const e of row.all ) {

			if ( e.b.kind !== 'outbuilding' ) continue;
			const plot = front.map( ( f ) => f.b.plot ).find( ( p ) => p && e.mid >= p.s0 && e.mid <= p.s1 );
			if ( ! plot ) continue;
			e.b.plot = plot;
			plot.buildings.push( e.b );
			plot.back = Math.max( plot.back, e.d1 + YARD_BACK );

		}

	}

	return plots;

}

// the four corners of a plot on the ground: the street line first, from s0 to s1, then the back
export function plotCorners( p ) {

	return [ pointAt( p.road, p.s0, p.front, p.side ), pointAt( p.road, p.s1, p.front, p.side ), pointAt( p.road, p.s1, p.back, p.side ), pointAt( p.road, p.s0, p.back, p.side ) ];

}
