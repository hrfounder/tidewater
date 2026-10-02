// The railway of the Site: each run of track the map has in the block (places.json `rails`), where
// the survey found its ballast (survey.json `rails`), its line curved through the mapped points and
// its level riding the plain.
//
//   site.rails.tracks = [ { name, pts: [ [ x, z, y, s ], ... ], length, bridges: [ { from, to } ] } ]
//     y   the top of the rails; s the distance along the track (m)
//     bridges   the stretches the track is carried over water, by the distance along it
//     bed       the colour of its ballast, as surveyed ( sRGB 0-255 )
//   site.rails.gain   what a colour read off the orthophoto by hand is multiplied by, to stand
//                     beside the surveyed ones
//
// A track is what the footage shows (drone3: the Vinkovci - Županja line past Andrijaševci): a
// single line on sleepers in a bed of grey ballast, hardly above the fields beside it.

// What a track is made of (m): the gauge between the rails' inner faces; a rail's height and the
// width of its head; a sleeper's length, width and height, how far apart they lie and how far their
// tops stand out of the ballast; the ballast's width on top (4.5 m of bed on the orthophoto, its
// sides with it), how far its sides run out and how thick it is; and how far the ground it lies on
// (the formation) stands over the plain: a low bank, for the water to run off.
export const RAIL = {
	gauge: 1.435, rail: { height: 0.15, head: 0.07 },
	sleeper: { length: 2.5, width: 0.24, height: 0.16, every: 0.6, proud: 0.04 },
	ballast: { top: 3.1, run: 0.7, thick: 0.45 },
	bank: 0.15,
};
// from the top of the rails down to the formation; how far the rails' top stands over the plain;
// how far the bed reaches each side of the track's middle
export const FORMATION_UNDER = RAIL.rail.height + RAIL.sleeper.proud + RAIL.ballast.thick;
export const RAIL_TOP = RAIL.bank + FORMATION_UNDER;
export const BED_HALF = RAIL.ballast.top / 2 + RAIL.ballast.run;
// metres between the points of a track, at most; the level follows the ground averaged over this
// much of its length (a railway's gradient is a few per mille)
const STEP = 4, LEVEL_WINDOW = 300;
// Tracks side by side lie on one formation: a track within BESIDE of the middle of a longer one is
// at that one's level, and comes to its own over as much again (m). ( A siding leaves the line and
// joins it again at the line's level. )
const BESIDE = 3 * BED_HALF;

export class Rails {

	// places: places.json; survey: survey.json, its `rails` in the order of the map's;
	// center ( east, north ); ground( x, z ): the dry ground's height
	constructor( places, { center, ground, survey } ) {

		const [ cE, cN ] = center, here = ( [ e, n ] ) => [ e - cE, cN - n ];
		this.gain = survey.gain;
		const tracks = ( places.rails || [] ).map( ( r, k ) => {

			const seen = survey.rails[ k ], pts = curved( seen.pts.map( here ) );
			let along = 0;
			pts.forEach( ( p, i ) => { if ( i ) along += Math.hypot( p[ 0 ] - pts[ i - 1 ][ 0 ], p[ 1 ] - pts[ i - 1 ][ 1 ] ); p[ 3 ] = along; } );
			const track = { name: r.name, pts, length: along, bridges: [], bed: seen.bed };
			// its bridges: each from the point of the track nearest the one mapped end to that nearest the other
			const at = ( p ) => project( track, ...here( p ) ).s;
			track.bridges = seen.bridges.map( ( [ a, b ] ) => ( { from: Math.min( at( a ), at( b ) ), to: Math.max( at( a ), at( b ) ) } ) );
			// the level: the ground under it (across a bridge, straight from the one bank to the other),
			// averaged along it
			const raw = pts.map( ( p ) => ground( p[ 0 ], p[ 1 ] ) );
			for ( const b of track.bridges ) {

				const i0 = pts.findIndex( ( p ) => p[ 3 ] >= b.from ), i1 = pts.findLastIndex( ( p ) => p[ 3 ] <= b.to );
				const lo = Math.max( 0, i0 - 1 ), hi = Math.min( pts.length - 1, i1 + 1 );
				for ( let i = i0; i <= i1; i ++ ) raw[ i ] = raw[ lo ] + ( raw[ hi ] - raw[ lo ] ) * ( pts[ i ][ 3 ] - pts[ lo ][ 3 ] ) / ( pts[ hi ][ 3 ] - pts[ lo ][ 3 ] );

			}

			const sum = [ 0 ];
			for ( const v of raw ) sum.push( sum[ sum.length - 1 ] + v );
			let lo = 0, hi = 0;
			pts.forEach( ( p ) => {

				while ( pts[ lo ][ 3 ] < p[ 3 ] - LEVEL_WINDOW / 2 ) lo ++;
				while ( hi + 1 < pts.length && pts[ hi + 1 ][ 3 ] <= p[ 3 ] + LEVEL_WINDOW / 2 ) hi ++;
				p[ 2 ] = ( sum[ hi + 1 ] - sum[ lo ] ) / ( hi + 1 - lo ) + RAIL_TOP;

			} );
			return track;

		} );
		// the longest first: each of the others at the level of a longer one where it runs beside it
		this.tracks = [];
		for ( const track of tracks.slice().sort( ( a, b ) => b.length - a.length ) ) {

			for ( const p of track.pts ) {

				const f = this.nearest( p[ 0 ], p[ 1 ], 2 * BESIDE );
				if ( ! f ) continue;
				const t = Math.min( 1, Math.max( 0, f.d / BESIDE - 1 ) );
				p[ 2 ] += ( f.y - p[ 2 ] ) * ( 1 - t * t * ( 3 - 2 * t ) );

			}

			this.tracks.push( track );

		}
		// ( in the order the map and the survey have them )
		this.tracks = tracks;

	}

	// The nearest track to a point within `reach` metres of its middle: { track, s, d, x, z, y, tx, tz }
	// ( the point on it, its level there and its direction ), or null.
	nearest( x, z, reach ) {

		let best = null;
		for ( const track of this.tracks ) {

			const f = project( track, x, z );
			if ( f.d < ( best ? best.d : reach ) ) best = f;

		}

		return best;

	}

	// where the line from a to b ( [ x, z ] each ) crosses a track:
	// [ { t: how far along a-b ( 0..1 ), y: the rails' level there, track, s: how far along the track } ]
	crossings( a, b ) {

		const out = [];
		for ( const track of this.tracks ) for ( let i = 0; i + 1 < track.pts.length; i ++ ) {

			const p = track.pts[ i ], q = track.pts[ i + 1 ];
			const rx = b[ 0 ] - a[ 0 ], rz = b[ 1 ] - a[ 1 ], sx = q[ 0 ] - p[ 0 ], sz = q[ 1 ] - p[ 1 ], den = rx * sz - rz * sx;
			if ( Math.abs( den ) < 1e-9 ) continue;
			const t = ( ( p[ 0 ] - a[ 0 ] ) * sz - ( p[ 1 ] - a[ 1 ] ) * sx ) / den, u = ( ( p[ 0 ] - a[ 0 ] ) * rz - ( p[ 1 ] - a[ 1 ] ) * rx ) / den;
			if ( t >= 0 && t < 1 && u >= 0 && u < 1 ) out.push( { t, y: p[ 2 ] + ( q[ 2 ] - p[ 2 ] ) * u, track, s: p[ 3 ] + ( q[ 3 ] - p[ 3 ] ) * u } );

		}

		return out;

	}

}

// is the track on a bridge at the distance s along it?
export const onBridge = ( track, s ) => track.bridges.some( ( b ) => s >= b.from && s <= b.to );

// The frame of a track at the distance s along it: the point on its middle at the rails' top, its
// direction and its right.
export function frameAt( track, s ) {

	const P = track.pts;
	let lo = 0, hi = P.length - 2;
	while ( lo < hi ) { const mid = ( lo + hi + 1 ) >> 1; if ( P[ mid ][ 3 ] <= s ) lo = mid; else hi = mid - 1; }
	const a = P[ lo ], b = P[ lo + 1 ], len = b[ 3 ] - a[ 3 ], t = Math.min( 1, Math.max( 0, ( s - a[ 3 ] ) / len ) );
	const tx = ( b[ 0 ] - a[ 0 ] ) / len, tz = ( b[ 1 ] - a[ 1 ] ) / len;
	return { x: a[ 0 ] + ( b[ 0 ] - a[ 0 ] ) * t, y: a[ 2 ] + ( b[ 2 ] - a[ 2 ] ) * t, z: a[ 1 ] + ( b[ 1 ] - a[ 1 ] ) * t, tx, tz, nx: - tz, nz: tx };

}

// The point of a track nearest to ( x, z ): { track, s, d, x, z, y, tx, tz }.
export function project( track, x, z ) {

	let best = null;
	for ( let i = 0; i + 1 < track.pts.length; i ++ ) {

		const a = track.pts[ i ], b = track.pts[ i + 1 ], dx = b[ 0 ] - a[ 0 ], dz = b[ 1 ] - a[ 1 ], len = Math.hypot( dx, dz );
		const t = Math.min( 1, Math.max( 0, ( ( x - a[ 0 ] ) * dx + ( z - a[ 1 ] ) * dz ) / ( len * len ) ) );
		const d = Math.hypot( x - a[ 0 ] - dx * t, z - a[ 1 ] - dz * t );
		if ( ! best || d < best.d ) best = { track, s: a[ 3 ] + len * t, d, x: a[ 0 ] + dx * t, z: a[ 1 ] + dz * t, y: ( a[ 2 ] || 0 ) + ( ( b[ 2 ] || 0 ) - ( a[ 2 ] || 0 ) ) * t, tx: dx / len, tz: dz / len };

	}

	return best;

}

// The line a track runs along, from its surveyed points: a point every STEP metres or less, each the
// mean of the surveyed line over EVEN metres about it, taken twice. A track is mapped as it runs, a
// point where a straight ends and points along every curve, unevenly apart and each a few decimetres
// out; a curve drawn through every one of them turns as sharply as two points happen to lie close
// (130 m on a line that turns over 300 m). The mean evens them: a straight stays where it is, and a
// curve of radius R moves EVEN * EVEN / ( 12 R ) toward its inside (0.4 m at 300 m). The two ends stay.
const EVEN = 40;
function curved( P ) {

	// the surveyed line, a point every `step`
	const leg = P.map( ( p, i ) => i ? Math.hypot( p[ 0 ] - P[ i - 1 ][ 0 ], p[ 1 ] - P[ i - 1 ][ 1 ] ) : 0 ), length = leg.reduce( ( a, b ) => a + b, 0 );
	const n = Math.max( 1, Math.ceil( length / STEP ) ), step = length / n;
	let line = [];
	for ( let q = 0, i = 1, before = 0; q <= n; q ++ ) {

		const s = Math.min( length, q * step );
		while ( i + 1 < P.length && before + leg[ i ] < s ) before += leg[ i ++ ];
		const t = leg[ i ] ? ( s - before ) / leg[ i ] : 0;
		line.push( [ P[ i - 1 ][ 0 ] + ( P[ i ][ 0 ] - P[ i - 1 ][ 0 ] ) * t, P[ i - 1 ][ 1 ] + ( P[ i ][ 1 ] - P[ i - 1 ][ 1 ] ) * t ] );

	}

	// the mean over EVEN about each point; beyond an end the line goes on as its mirror image through that end
	const h = Math.min( n, Math.round( EVEN / 2 / step ) );
	for ( let pass = 0; pass < 2; pass ++ ) {

		const at = ( k ) => k < 0 ? [ 2 * line[ 0 ][ 0 ] - line[ - k ][ 0 ], 2 * line[ 0 ][ 1 ] - line[ - k ][ 1 ] ] : k > n ? [ 2 * line[ n ][ 0 ] - line[ 2 * n - k ][ 0 ], 2 * line[ n ][ 1 ] - line[ 2 * n - k ][ 1 ] ] : line[ k ];
		line = line.map( ( _, q ) => {

			let x = 0, z = 0;
			for ( let k = q - h; k <= q + h; k ++ ) { const p = at( k ); x += p[ 0 ]; z += p[ 1 ]; }
			return [ x / ( 2 * h + 1 ), z / ( 2 * h + 1 ) ];

		} );

	}

	return line;

}
