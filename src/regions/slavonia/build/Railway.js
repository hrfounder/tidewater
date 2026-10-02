import { Vector3 } from '../../../engine/index.js';
import { RAIL, frameAt, onBridge } from '../site/Rails.js';
import { reachOf } from '../site/Roads.js';
import { SURFACE } from './VillageMaterial.js';

// The railway's tracks (site/Rails.js), built: the ballast's bed, the sleepers in it and the two
// rails on them. Where a road crosses, the road's own surface is the bed (site/Roads.js lifts it to
// the rails' level): there are no sleepers to see and no ballast, and the rails lie in the road.
// Over water the track is carried by a bridge: its sleepers on a steel deck between two plate
// girders, on an abutment at each end and piers between at even spans.

const lin = ( c ) => c.map( ( v ) => Math.pow( v / 255, 2.2 ) );
// The ballast's colour is the survey's (each track's `bed`). The bridge's are read off the same
// pictures by hand (the sheet at -891, -1334: the girders 66, 77, 75, the deck between the rails
// 74, 77, 81) and brought to the game's brightness by the survey's gain. Sleepers and rails are too
// small to read there: weathered timber, and rusty steel with a bright running face, by eye off drone3.
const BALLAST = { rough: 0.95, surface: SURFACE.concrete, seed: 0.7 };
const SLEEPER = { color: lin( [ 70, 62, 56 ] ), rough: 0.9, surface: SURFACE.boards, seed: 0.3 };
const STEEL = { color: lin( [ 84, 62, 50 ] ), rough: 0.6, metal: 0.6, surface: SURFACE.plain, seed: 0.2 };
const RUNNING = { color: lin( [ 150, 150, 152 ] ), rough: 0.3, metal: 0.9, surface: SURFACE.plain, seed: 0.2 };
const GIRDER = { pictured: [ 66, 77, 75 ], rough: 0.6, metal: 0.4, surface: SURFACE.plain, seed: 0.3 };
const DECK = { pictured: [ 74, 77, 81 ], rough: 0.7, metal: 0.4, surface: SURFACE.plain, seed: 0.3 };
const CONCRETE = { color: lin( [ 158, 155, 148 ] ), rough: 0.95, surface: SURFACE.concrete, seed: 0.5 };

// metres between the cuts of the ballast along a track: it ends at a road's edge to within this
const BED_STEP = 1;
// A railway bridge (m). On the orthophoto the one over the Bosut is 52 m long and 5.5 m over all,
// a green girder along each side of a single track, and shows a joint at its middle: two spans on
// one pier. What cannot be seen from above is the usual: girders a tenth of their span deep,
// standing a little over a metre above the rails (a half-through bridge).
//   between   clear between the girders
//   girder    a girder's thickness over its flanges, its depth, and how far its top stands over the rails
//   floor     the deck under the sleepers, from its top to its underside
//   span      the most it spans between supports
//   support   a pier's or an abutment's thickness along the bridge
export const BRIDGE = { between: 4.6, girder: { thick: 0.45, depth: 2.6, above: 1.1 }, floor: 0.35, span: 27, support: 1.6 };
// supports are founded this far under the ground they stand in (m)
const FOUNDED = 0.8;

// B: ( x, z ) -> the MeshBuilder of that place; returns what was built
export function buildRailway( B, { site, terrain }, colliders ) {

	const built = { tracks: 0, metres: 0, sleepers: 0, crossings: 0, bridges: [] };
	const { rail, sleeper, ballast, gauge } = RAIL;
	const pictured = ( paint ) => ( { ...paint, color: lin( paint.pictured.map( ( v ) => v * site.rails.gain ) ) } );
	// the widest a road reaches from its middle: how far to look for one across the track
	const widest = Math.max( ...site.roads.roads.map( reachOf ) );
	const point = ( f, off, dy ) => [ f.x + f.nx * off, f.y + dy, f.z + f.nz * off ];
	// a strip of surface between two frames of a track: from o0 at height y0 to o1 at y1 (over the rails' top)
	const quad = ( M, f, g, o0, y0, o1, y1, u0, u1, v0, v1 ) => M.polygon( [ point( f, o0, y0 ), point( f, o1, y1 ), point( g, o1, y1 ), point( g, o0, y0 ) ], [ [ u0, v0 ], [ u1, v0 ], [ u1, v1 ], [ u0, v1 ] ] );
	// a block along the track between two frames: its four long sides and its two ends
	const block = ( M, f, g, o0, o1, y0, y1, v0, v1 ) => {

		quad( M, f, g, o0, y1, o1, y1, o0, o1, v0, v1 );
		quad( M, f, g, o1, y0, o0, y0, o0, o1, v0, v1 );
		quad( M, f, g, o0, y0, o0, y1, 0, y1 - y0, v0, v1 );
		quad( M, f, g, o1, y1, o1, y0, 0, y1 - y0, v0, v1 );
		for ( const e of [ f, g ] ) M.polygon( [ point( e, o0, y0 ), point( e, o1, y0 ), point( e, o1, y1 ), point( e, o0, y1 ) ], [ [ o0, y0 ], [ o1, y0 ], [ o1, y1 ], [ o0, y1 ] ] );

	};
	// is a road across the track at this frame? (a bridge of the road's passes over, and is not)
	const inRoad = ( f ) => { const r = site.roads.nearest( f.x, f.z, widest ); return !! r && ! r.road.bridge && r.d < reachOf( r.road ); };
	for ( const track of site.rails.tracks ) {

		const P = track.pts, L = track.length;

		// ---- the ballast: its top, and its two sides running out to the formation it lies on
		const top = - rail.height - sleeper.proud, h = ballast.top / 2, bed = { ...BALLAST, color: lin( track.bed ) };
		// ( the bed's end, where it stops at a bridge or at a road: its section, closed )
		const end = ( e ) => B( e.x, e.z ).paint( bed ).polygon( [ point( e, - h - ballast.run, top - ballast.thick ), point( e, - h, top ), point( e, h, top ), point( e, h + ballast.run, top - ballast.thick ) ], [ [ - h - ballast.run, 0 ], [ - h, ballast.thick ], [ h, ballast.thick ], [ h + ballast.run, 0 ] ] );
		let was = false, laid = false;
		for ( let s = 0; s < L; s += BED_STEP ) {

			const s1 = Math.min( L, s + BED_STEP ), mid = frameAt( track, ( s + s1 ) / 2 ), crossing = inRoad( mid );
			if ( crossing && ! was ) built.crossings ++;
			was = crossing;
			const lay = ! crossing && ! onBridge( track, ( s + s1 ) / 2 ), f = frameAt( track, s );
			if ( lay !== laid && s > 0 ) end( f );
			laid = lay;
			if ( ! lay ) continue;
			const g = frameAt( track, s1 ), M = B( mid.x, mid.z );
			M.paint( bed );
			quad( M, f, g, - h, top, h, top, - h, h, s, s1 );
			quad( M, f, g, - h - ballast.run, top - ballast.thick, - h, top, - h - ballast.run, - h, s, s1 );
			quad( M, f, g, h, top, h + ballast.run, top - ballast.thick, h, h + ballast.run, s, s1 );

		}

		// ---- the two rails, point to point: a running face on top, a web each side
		for ( let i = 0; i + 1 < P.length; i ++ ) {

			const f = frameAt( track, P[ i ][ 3 ] ), g = frameAt( track, P[ i + 1 ][ 3 ] ), M = B( f.x, f.z ), v0 = P[ i ][ 3 ], v1 = P[ i + 1 ][ 3 ];
			// ( frameAt gives a point where the track turns the frame of the piece that begins there: this
			// piece ends across the way the next begins )
			for ( const side of [ - 1, 1 ] ) {

				const a = side * gauge / 2, b = side * ( gauge / 2 + rail.head ), o0 = Math.min( a, b ), o1 = Math.max( a, b );
				M.paint( RUNNING );
				quad( M, f, g, o0, 0, o1, 0, 0, rail.head, v0, v1 );
				M.paint( STEEL );
				quad( M, f, g, o0, - rail.height, o0, 0, 0, rail.height, v0, v1 );
				quad( M, f, g, o1, 0, o1, - rail.height, 0, rail.height, v0, v1 );

			}

		}

		// ---- the sleepers: each a block across the track, its top under the rails
		for ( let s = sleeper.every / 2; s < L; s += sleeper.every ) {

			const m = frameAt( track, s );
			if ( inRoad( m ) ) continue;
			const f = frameAt( track, s - sleeper.width / 2 ), g = frameAt( track, s + sleeper.width / 2 ), M = B( m.x, m.z );
			M.paint( SLEEPER );
			block( M, f, g, - sleeper.length / 2, sleeper.length / 2, - rail.height - sleeper.height, - rail.height, 0, sleeper.width );
			built.sleepers ++;

		}

		// ---- the bridges
		for ( const b of track.bridges ) {

			const f = frameAt( track, b.from ), g = frameAt( track, b.to ), M = B( ( f.x + g.x ) / 2, ( f.z + g.z ) / 2 ), length = b.to - b.from;
			const G = BRIDGE.girder, half = BRIDGE.between / 2, floorTop = - rail.height - sleeper.height, girderFoot = G.above - G.depth;
			// ( a bridge is straight: its far end looks the way its near end does )
			g.tx = f.tx; g.tz = f.tz; g.nx = f.nx; g.nz = f.nz;
			M.paint( pictured( DECK ) );
			block( M, f, g, - half, half, floorTop - BRIDGE.floor, floorTop, 0, length );
			M.paint( pictured( GIRDER ) );
			for ( const side of [ - 1, 1 ] ) block( M, f, g, Math.min( side * half, side * ( half + G.thick ) ), Math.max( side * half, side * ( half + G.thick ) ), girderFoot, G.above, 0, length );
			if ( colliders ) {

				const rotY = Math.atan2( f.tx, f.tz ), y = ( f.y + g.y ) / 2, x = ( f.x + g.x ) / 2, z = ( f.z + g.z ) / 2;
				colliders.addBox( new Vector3( x, y + floorTop - BRIDGE.floor / 2, z ), new Vector3( half, BRIDGE.floor / 2, length / 2 ), rotY, { walkable: true, tag: 'railway' } );
				for ( const side of [ - 1, 1 ] ) colliders.addBox( new Vector3( x + f.nx * side * ( half + G.thick / 2 ), y + ( girderFoot + G.above ) / 2, z + f.nz * side * ( half + G.thick / 2 ) ), new Vector3( G.thick / 2, G.depth / 2, length / 2 ), rotY, { tag: 'railway' } );

			}

			// what carries it: under the girders, from the ground it is founded in
			const spans = Math.max( 1, Math.ceil( length / BRIDGE.span ) ), wide = half + G.thick, t = BRIDGE.support / 2;
			const support = ( s ) => {

				const e = frameAt( track, s );
				const corners = [ [ - wide, - t ], [ wide, - t ], [ wide, t ], [ - wide, t ] ].map( ( [ o, a ] ) => [ e.x + f.nx * o + f.tx * a, e.z + f.nz * o + f.tz * a ] );
				const foot = Math.min( ...corners.map( ( [ x, z ] ) => terrain.heightAt( x, z ) ) ) - FOUNDED, head = e.y + girderFoot;
				M.paint( CONCRETE );
				corners.forEach( ( c, k ) => {

					const d = corners[ ( k + 1 ) % 4 ], w = Math.hypot( d[ 0 ] - c[ 0 ], d[ 1 ] - c[ 1 ] );
					M.polygon( [ [ c[ 0 ], foot, c[ 1 ] ], [ d[ 0 ], foot, d[ 1 ] ], [ d[ 0 ], head, d[ 1 ] ], [ c[ 0 ], head, c[ 1 ] ] ], [ [ 0, 0 ], [ w, 0 ], [ w, head - foot ], [ 0, head - foot ] ] );

				} );
				M.polygon( corners.map( ( [ x, z ] ) => [ x, head, z ] ), [ [ - wide, - t ], [ wide, - t ], [ wide, t ], [ - wide, t ] ] );
				if ( colliders ) colliders.addBox( new Vector3( e.x, ( foot + head ) / 2, e.z ), new Vector3( wide, ( head - foot ) / 2, t ), Math.atan2( f.tx, f.tz ), { tag: 'railway' } );

			};
			for ( let k = 0; k <= spans; k ++ ) support( b.from + t + ( length - 2 * t ) * k / spans );
			built.bridges.push( { length, spans, width: 2 * wide, clear: Math.min( f.y, g.y ) + girderFoot } );

		}

		built.tracks ++;
		built.metres += L;

	}

	return built;

}
