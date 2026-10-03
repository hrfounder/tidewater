import { project, pointAt } from './Roads.js';
import { insideBuilding, turned } from './Buildings.js';

// The village's street section, wherever no one has surveyed the street: a grass verge along the
// carriageway, then a pavement, and the houses' fronts and yard walls in a line on its back edge (Ivan:
// Kolodvorska ulica, both sides, and most streets of Andrijaševci). The map draws the houses a little
// here and there; the street is one line.
//
// For each side of a paved street, along each run of plots that front it: the line is the median of
// the houses' fronts there; the pavement runs WIDE in front of it, and every house whose front lies
// within FLUSH of the line is brought onto it, turned square to the street first if it stands within
// ALIGN of square (Ivan: a house a few degrees off its pavement leaves a wedge of grass that is not
// there; the imagery has them square where the map has them crooked by as much as ten degrees and more). A house further off (set back behind a garden, or a
// footprint the map put on the verge) stays where it stands, and the pavement stops short of
// whatever stands on it. Where a pavement was surveyed (Survey.js BESIDE, Beside.js) that one is laid
// and this rule keeps off it.
//
//   layStreets( ... ) -> the strips, as Beside.js lays them: { of: 'paving', colour, road, side, inner,
//   outer, ring, rule: true }; the buildings moved onto the line (Buildings.shift)

// metres between a strip's points along its road (as Beside.js lays them)
const STEP = 2;
// the pavement's width (m): Kolodvorska's, 1.0 and 1.1 on its two sides
const WIDE = 1.1;
// a house whose front lies within this of its street's line is on it (m)
const FLUSH = 4;
// a house standing within this of square to its street is turned square (radians)
const ALIGN = 20 * Math.PI / 180;
// plots no further apart than this along the street are one run of them (m)
const MERGE = 25;
// a run needs this many houses for its line to be known
const HOUSES = 3;
// a house front counts for the line only between these distances from the carriageway's edge (m):
// nearer is the map's error, further a house set back behind its garden
const NEAREST = 1.5, FURTHEST = 16;
// the least verge between the carriageway and the pavement (m)
const VERGE = 1.0;
// a strip shorter than this is not laid (m); it keeps this far from what was surveyed (m)
const SHORTEST = 6, KEEP = 2;
// the pavement's colour: Kolodvorska's, as the orthophoto has it at the survey's gain (sRGB)
const COLOUR = [ 96, 93, 88 ];

export function layStreets( { roads, buildings, plots, beside, ground } ) {

	// what was surveyed along each side of each road: the stretches its pavements cover
	const taken = new Map();
	for ( const st of beside ) {

		if ( st.of !== 'paving' ) continue;
		const ss = st.inner.map( ( [ x, z ] ) => project( st.road, x, z ).s );
		const key = st.road.index + ':' + st.side;
		if ( ! taken.has( key ) ) taken.set( key, [] );
		taken.get( key ).push( [ Math.min( ...ss ) - KEEP, Math.max( ...ss ) + KEEP ] );

	}

	// the plots along each side of each paved street, in order along it
	const sides = new Map();
	for ( const p of plots ) {

		if ( ! p.road.street || p.road.bridge || p.road.surface !== 'paved' ) continue;
		const key = p.road.index + ':' + p.side;
		if ( ! sides.has( key ) ) sides.set( key, [] );
		sides.get( key ).push( p );

	}

	const strips = [], moves = [];
	for ( const [ key, all ] of sides ) {

		all.sort( ( p, q ) => p.s0 - q.s0 );
		const runs = [];
		for ( const p of all ) {

			const last = runs[ runs.length - 1 ];
			if ( last && p.s0 - last[ last.length - 1 ].s1 <= MERGE ) last.push( p ); else runs.push( [ p ] );

		}

		for ( const run of runs ) {

			const road = run[ 0 ].road, side = run[ 0 ].side;
			const fronts = run.map( ( p ) => p.front ).filter( ( d ) => d - road.half >= NEAREST && d - road.half <= FURTHEST ).sort( ( a, b ) => a - b );
			if ( fronts.length < HOUSES ) continue;
			const line = Math.max( fronts[ Math.floor( fronts.length / 2 ) ], road.half + VERGE + WIDE );

			// the houses within FLUSH of the line, squared to the street and onto the line
			for ( const p of run ) {

				if ( p.house.edited ) continue;
				const b = p.house, s = b.frontage.s, [ ax, az ] = pointAt( road, s, 0, side ), [ bx, bz ] = pointAt( road, s, 1, side );
				// ( the street's way at the house: its local +z, the side that faces the street, along it )
				const square = Math.atan2( ax - bx, az - bz );
				let turn = square - b.yaw;
				turn = Math.atan2( Math.sin( turn ), Math.cos( turn ) );
				// squared about its mass centre (Ivan) if it can be, else as it stands; neither, if where it
				// would go is taken (the rest is Ivan's to set right in the editor, tools/editor)
				const tries = Math.abs( turn ) <= ALIGN ? [ [ square, centroid( b.ring ) ], [ undefined ] ] : [ [ undefined ] ];
				for ( const [ yaw, pivot ] of tries ) {

					const ring = yaw !== undefined ? turned( b, yaw, pivot ) : b.ring;
					const front = Math.min( ...ring.map( ( [ x, z ] ) => project( road, x, z ).d ) ), off = front - line;
					if ( Math.abs( off ) > FLUSH ) continue;
					if ( Math.abs( off ) < 0.05 && yaw === undefined ) break;
					// ( toward the street by the offset: back, where it stands over the line )
					const dx = ( ax - bx ) * off, dz = ( az - bz ) * off;
					if ( ! free( ring.map( ( [ x, z ] ) => [ x + dx, z + dz ] ), b, roads, buildings ) ) continue;
					moves.push( { b, dx, dz, yaw, pivot } );
					p.front = line;
					break;

				}

			}

			// the pavement along the run, off what was surveyed
			let open = [ [ Math.max( 0, run[ 0 ].s0 ), Math.min( road.length, run[ run.length - 1 ].s1 ) ] ];
			for ( const [ a, b ] of taken.get( key ) || [] ) open = open.flatMap( ( [ s0, s1 ] ) => [ [ s0, Math.min( s1, a ) ], [ Math.max( s0, b ), s1 ] ] ).filter( ( [ s0, s1 ] ) => s1 - s0 >= SHORTEST );
			for ( const [ s0, s1 ] of open ) strips.push( ...lay( road, side, s0, s1, line ) );

		}

	}

	buildings.shift( moves, ground );
	// ( the pavement stops short of what stands on it, the houses now where they stand )
	return { strips: strips.flatMap( ( st ) => clearOf( st, buildings ) ), moved: moves.length };

}

// the centre of mass of a ring's area
function centroid( ring ) {

	let a = 0, cx = 0, cz = 0;
	ring.forEach( ( p, i ) => {

		const q = ring[ ( i + 1 ) % ring.length ], k = p[ 0 ] * q[ 1 ] - q[ 0 ] * p[ 1 ];
		a += k; cx += ( p[ 0 ] + q[ 0 ] ) * k; cz += ( p[ 1 ] + q[ 1 ] ) * k;

	} );
	return [ cx / ( 3 * a ), cz / ( 3 * a ) ];

}

// is a building's ring free to stand where it is: no corner on a carriageway or its shoulder, in a
// modelled house's grounds, or in another building ( each a little inside: CLEAR )
const CLEAR = 0.1;
function free( ring, b, roads, buildings ) {

	for ( const [ x, z ] of ring ) {

		const f = roads.nearest( x, z, 20 );
		if ( f && f.d < f.road.half + f.road.shoulder - CLEAR ) return false;
		for ( const o of buildings.near( x, z, buildings.radius ) ) {

			if ( o === b ) continue;
			if ( o.grounds ? inRing( o.grounds.ring, x, z ) : insideBuilding( o, x, z, - CLEAR ) ) return false;

		}

	}

	return true;

}

function inRing( ring, x, z ) {

	let c = false;
	for ( let i = 0, j = ring.length - 1; i < ring.length; j = i ++ ) {

		const a = ring[ j ], q = ring[ i ];
		if ( ( a[ 1 ] <= z ) !== ( q[ 1 ] <= z ) && x < a[ 0 ] + ( q[ 0 ] - a[ 0 ] ) * ( z - a[ 1 ] ) / ( q[ 1 ] - a[ 1 ] ) ) c = ! c;

	}

	return c;

}

// a strip from s0 to s1 along a road, its back edge on the line: its points every STEP along it
function lay( road, side, s0, s1, line ) {

	const n = Math.max( 1, Math.ceil( ( s1 - s0 ) / STEP ) ), at = ( k ) => s0 + ( s1 - s0 ) * k / n;
	const inner = [], outer = [];
	for ( let k = 0; k <= n; k ++ ) { inner.push( pointAt( road, at( k ), line - WIDE, side ) ); outer.push( pointAt( road, at( k ), line, side ) ); }
	return [ { of: 'paving', colour: COLOUR, road, side, inner, outer, rule: true } ];

}

// a strip cut where a building stands on it, into the pieces between ( each SHORTEST long or more )
function clearOf( st, buildings ) {

	const free = st.inner.map( ( a, k ) => {

		const b = st.outer[ k ], m = [ ( a[ 0 ] + b[ 0 ] ) / 2, ( a[ 1 ] + b[ 1 ] ) / 2 ];
		return ! [ a, m, b ].some( ( [ x, z ] ) => buildings.near( x, z, buildings.radius ).some( ( o ) => insideBuilding( o, x, z, 0.3 ) ) );

	} );
	const pieces = [];
	let k = 0;
	while ( k < free.length ) {

		if ( ! free[ k ] ) { k ++; continue; }
		let j = k;
		while ( j + 1 < free.length && free[ j + 1 ] ) j ++;
		if ( ( j - k ) * STEP >= SHORTEST ) {

			const inner = st.inner.slice( k, j + 1 ), outer = st.outer.slice( k, j + 1 );
			pieces.push( { ...st, inner, outer, ring: [ ...inner, ...outer.slice().reverse() ] } );

		}

		k = j + 1;

	}

	return pieces;

}
