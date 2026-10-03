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
// A landmark with grounds of its own (Buildings.js) has no plot: its grounds are its land, and the
// plots beside it stop at them. Nor has a building that stands in ground the survey found open (a
// park's pavilion, a school): a park is not fenced into yards.
//
// Real cadastral parcels replace this when they are available; what reads a plot stays the same.

// The frontage a village plot has on its street (m): a šor plot is about ten fathoms wide. A plot
// reaches past its house to the neighbour's, but not across an empty lot further than this.
const PLOT_FRONTAGE = 20;
// the yard behind the last building of a plot (m)
const YARD_BACK = 6;
// a plot is looked at this often along its street for a landmark's grounds in it (m)
const LOOK = 0.5;

export function buildPlots( buildings, roads, open ) {

	const inOpen = ( b ) => open.some( ( o ) => inRing( o.ring, b.x, b.z ) );

	// every building against its street: the stretch it covers and how far out it stands
	const rows = new Map();
	for ( const b of buildings.list ) {

		const f = b.frontage;
		if ( ! f || b.grounds || inOpen( b ) ) continue;
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

	for ( const b of buildings.list ) if ( b.grounds ) for ( const plot of plots ) stopAt( plot, b.grounds.ring );
	for ( const o of open ) for ( const plot of plots ) stopAt( plot, o.ring );
	return plots.filter( ( p ) => p.s1 > p.s0 );

}

// is the point inside the ring?
function inRing( ring, x, z ) {

	let c = false;
	for ( let i = 0, j = ring.length - 1; i < ring.length; j = i ++ ) {

		const a = ring[ j ], b = ring[ i ];
		if ( ( a[ 1 ] <= z ) !== ( b[ 1 ] <= z ) && x < a[ 0 ] + ( b[ 0 ] - a[ 0 ] ) * ( z - a[ 1 ] ) / ( b[ 1 ] - a[ 1 ] ) ) c = ! c;

	}

	return c;

}

// Cut a plot's stretch of the street back to where a ring (a landmark's grounds) begins: the plot
// keeps the part its own house stands in.
function stopAt( plot, ring ) {

	const inside = ( [ x, z ] ) => inRing( ring, x, z );
	// ( every LOOK from the street line back: a landmark that stands on the line itself, the house's
	// front and the plot's both on the pavement, lies between any few fixed depths )
	const depths = []; for ( let d = plot.front + LOOK / 2; d < plot.back; d += LOOK ) depths.push( d );
	const taken = ( s ) => depths.some( ( d ) => inside( pointAt( plot.road, s, d, plot.side ) ) );
	const home = Math.min( plot.s1, Math.max( plot.s0, plot.house.frontage.s ) );
	if ( taken( home ) ) return;
	for ( let s = home; s >= plot.s0; s -= LOOK ) if ( taken( s ) ) { plot.s0 = s + LOOK; break; }
	for ( let s = home; s <= plot.s1; s += LOOK ) if ( taken( s ) ) { plot.s1 = s - LOOK; break; }

}

// the four corners of a plot on the ground: the street line first, from s0 to s1, then the back
export function plotCorners( p ) {

	return [ pointAt( p.road, p.s0, p.front, p.side ), pointAt( p.road, p.s1, p.front, p.side ), pointAt( p.road, p.s1, p.back, p.side ), pointAt( p.road, p.s0, p.back, p.side ) ];

}
