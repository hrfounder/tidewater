import { FREE, BUILDING } from './Occupancy.js';

// The park bank: where the game's fixed things stand, and the anglers' platforms along the water.
// Everything is so many metres along the river from the bridge and so far from the bank, and the
// Site says where that bank is; each takes its ground in the occupancy, so nothing is planted on it.
//
//   site.park = { start, boat, stand, chandlery, platforms }
//     start      { x, z, toWater: [ dx, dz ] }       where the player begins, on the bank
//     boat       { x, z, upstream: [ dx, dz ] }      where the boat lies, on the water
//     stand, chandlery   { x, z, toWater }           the two stalls
//     platforms  [ { x, z, toWater } ]               each at its point of the waterline

export const PARK = {
	bridge: 'Most Bosut',
	// looking downstream, the park is on the left bank
	side: - 1,
	// metres upstream of the bridge, along the river's course
	start: 95, boat: 60, stand: 112, chandlery: 76,
	// the player starts this far back from the top of the bank, the stalls this far (m)
	startBack: 1.5, stallBack: 7,
	// the boat lies this far off the waterline (m): clear of the bank's underwater slope
	boatOff: 8,
	// a stall needs this much free ground around its middle (m); where its place is taken (the map
	// has a house on the park) it stands at the next free place up the bank, a step at a time
	stallClear: 4, stallStep: 4,
};

// The anglers' platforms (docs/slavonia/photos/bosut-winter-platforms-bridge.jpg): on both banks,
// from `clear` metres either side of the bridge out to `reach`, one every `spacing` [ least, most ]
// metres of the river's course, where `room` metres of the bank behind are free.
// (The spacing is measured on the orthophoto: ten on the park bank stand 10.0 to 10.3 m apart, those
// on the bank across from the sports ground 9.7.)
export const PLATFORMS = { reach: 320, clear: 14, spacing: [ 9.7, 10.3 ], room: 2 };

// a repeatable stream of numbers in 0..1 (mulberry32)
function random( seed ) {

	let a = seed >>> 0;
	return () => {

		a = ( a + 0x6d2b79f5 ) >>> 0;
		let t = Math.imul( a ^ ( a >>> 15 ), a | 1 );
		t ^= t + Math.imul( t ^ ( t >>> 7 ), t | 61 );
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;

	};

}

// Lay the park out on a Site whose terrain is graded and whose occupancy exists. deck: the kit's
// platform { w, out, back }: how wide it is along the bank, how far it reaches out over the water
// and back onto the bank.
export function layPark( site, deck ) {

	const { water, roads, occupancy } = site;
	const bridge = roads.roads.find( ( r ) => r.bridge && r.name === PARK.bridge );
	const mid = bridge.pts[ bridge.pts.length >> 1 ];
	// the river's course under the bridge, and the point of it nearest the bridge
	let course = null, at = 0, best = Infinity;
	for ( const b of water.bodies ) if ( b.kind === 'line' && b.current ) b.pts.forEach( ( p, i ) => {

		const d = Math.hypot( p[ 0 ] - mid[ 0 ], p[ 1 ] - mid[ 1 ] );
		if ( d < best ) { best = d; course = b; at = i; }

	} );
	const P = course.pts;
	// The bank `along` metres from the bridge ( > 0 upstream: the points run downstream ) on a side
	// ( -1 the left bank looking downstream, 1 the right ): where the water ends, where the plain
	// begins, the way from the water to the land and the way downstream. Null past the course's ends.
	const bank = ( along, side ) => {

		let i = at, left = Math.abs( along );
		const step = along > 0 ? - 1 : 1;
		while ( left > 0 ) {

			if ( i + step < 1 || i + step > P.length - 2 ) return null;
			left -= Math.hypot( P[ i + step ][ 0 ] - P[ i ][ 0 ], P[ i + step ][ 1 ] - P[ i ][ 1 ] );
			i += step;

		}

		const p = P[ i ], q = P[ i + 1 ], l = Math.hypot( q[ 0 ] - p[ 0 ], q[ 1 ] - p[ 1 ] );
		const tx = ( q[ 0 ] - p[ 0 ] ) / l, tz = ( q[ 1 ] - p[ 1 ] ) / l;
		// left of downstream is ( tz, -tx ), right is ( -tz, tx )
		const nx = - tz * side, nz = tx * side;
		return { ...water.bankFrom( p[ 0 ], p[ 1 ], nx, nz ), nx, nz, tx, tz };

	};
	// a square of ground round a point, taken
	const take = ( x, z, r ) => occupancy.claim( [ [ x - r, z - r ], [ x + r, z - r ], [ x + r, z + r ], [ x - r, z + r ] ], BUILDING );

	const start = bank( PARK.start, PARK.side ), boat = bank( PARK.boat, PARK.side );
	const stall = ( up ) => {

		for ( ; ; up += PARK.stallStep ) {

			const b = bank( up, PARK.side ), x = b.top[ 0 ] + b.nx * PARK.stallBack, z = b.top[ 1 ] + b.nz * PARK.stallBack;
			if ( occupancy.within( x, z, PARK.stallClear ) !== FREE ) continue;
			take( x, z, PARK.stallClear );
			return { x, z, toWater: [ - b.nx, - b.nz ] };

		}

	};
	const park = {
		start: { x: start.top[ 0 ] + start.nx * PARK.startBack, z: start.top[ 1 ] + start.nz * PARK.startBack, toWater: [ - start.nx, - start.nz ] },
		boat: { x: boat.edge[ 0 ] - boat.nx * PARK.boatOff, z: boat.edge[ 1 ] - boat.nz * PARK.boatOff, upstream: [ - boat.tx, - boat.tz ] },
		// the chandlery first: it is the nearer to the bridge, and the stand goes past it
		chandlery: stall( PARK.chandlery ), stand: stall( PARK.stand ),
		platforms: [],
	};

	const rnd = random( 7177 ), D = deck;
	for ( const side of [ - 1, 1 ] ) for ( const dir of [ - 1, 1 ] ) {

		for ( let s = PLATFORMS.clear + rnd() * PLATFORMS.spacing[ 0 ]; s < PLATFORMS.reach; s += PLATFORMS.spacing[ 0 ] + rnd() * ( PLATFORMS.spacing[ 1 ] - PLATFORMS.spacing[ 0 ] ) ) {

			const b = bank( s * dir, side );
			if ( ! b ) break;
			const [ x, z ] = b.edge;
			// the bank behind it has to be free ground, and no other platform in the way
			if ( occupancy.within( x + b.nx * ( D.back + PLATFORMS.room ), z + b.nz * ( D.back + PLATFORMS.room ), PLATFORMS.room ) !== FREE ) continue;
			// its deck: from `back` on the bank to `out` over the water, `w` wide along the bank
			const corner = ( t, o ) => [ x + b.tx * t + b.nx * o, z + b.tz * t + b.nz * o ];
			occupancy.claim( [ corner( - D.w / 2, - D.out ), corner( D.w / 2, - D.out ), corner( D.w / 2, D.back ), corner( - D.w / 2, D.back ) ], BUILDING );
			park.platforms.push( { x, z, toWater: [ - b.nx, - b.nz ] } );

		}

	}

	return park;

}
