import { Vector3 } from '../../../engine/index.js';
import { SURFACE } from './VillageMaterial.js';

// The bridges of the Site (site/Roads.js `bridges`): each a deck carried along its road from node to
// node, so it meets the road at both ends by construction, with what runs beside the road on the same
// structure (the footway the map draws along Most Bosut) on the one deck. Under it: piers at even
// spans and an abutment at each end; along its edges the kit's railing; lamps where its kind has them.
//
// What a bridge is, by what it carries:
//   footway  the walk a road bridge carries on each side of its carriageway (m). The map draws
//            Most Bosut's as a footway beside the road, on one side only; the bridge has one on
//            both, and a deck is at least this wide whatever the map drew beside it
//   edge     the strip outside the outermost lane, where the railing stands (m)
//   kerb     how far everything but the carriageway stands above it (m)
//   depth    the deck from its top to its underside (m)
//   span     the most it spans between supports (m)
//   pier     a pier's thickness along the bridge, and how far in from the deck's edges it stands (m)
//   lamps    metres between lamps, or 0 for none; `lit`: the side they stand on, as the way it
//            faces ( x, z ). Most Bosut's stand along its west side.
//   surface  [ pattern, sRGB ] of the carriageway (or of the whole deck, without one)
// The forms are from docs/slavonia/photos/bosut-winter-platforms-bridge.jpg (a low beam bridge on
// blade piers) and from the drone footage of 2025 (drone2 at 21-30 s): three spans on two piers, a
// kerbed walk and a plain galvanised railing on each side, lamps along the west side. The sizes are
// the usual ones for such a bridge, not measured.
const lin = ( c ) => c.map( ( v ) => Math.pow( v / 255, 2.2 ) );
const KINDS = {
	road: { footway: 1.5, edge: 0.35, kerb: 0.15, depth: 0.95, span: 24, pier: [ 0.8, 0.6 ], lamps: 26, lit: [ - 1, 0 ], surface: [ SURFACE.concrete, [ 92, 92, 94 ] ] },
	foot: { footway: 0, edge: 0.12, kerb: 0, depth: 0.3, span: 10, pier: [ 0.3, 0.1 ], lamps: 0, surface: [ SURFACE.boards, [ 122, 102, 80 ] ] },
};
const CONCRETE = { color: lin( [ 158, 155, 148 ] ), rough: 0.95, surface: SURFACE.concrete, seed: 0.5 };
const RAIL_PAINT = { railing: { color: lin( [ 168, 172, 176 ] ), rough: 0.45, metal: 0.8, surface: SURFACE.plain, seed: 0.2 } };
export const LAMP_PAINT = { zinc: { color: lin( [ 150, 154, 156 ] ), rough: 0.45, metal: 0.9, surface: SURFACE.plain, seed: 0.2 }, lens: { color: lin( [ 230, 226, 210 ] ), rough: 0.2, surface: SURFACE.plain, seed: 0.2 } };
// a railing stands this far in from the deck's edge; a collider under a deck is this thick (m)
const RAIL_IN = 0.12, SLAB = 0.25;
// supports are founded this far under the ground they stand in (m)
const FOUNDED = 0.8;

// B: ( x, z ) -> the MeshBuilder of that place; returns what was built
export function buildBridges( B, { site, terrain, models }, colliders ) {

	const built = [];
	for ( const bridge of site.roads.bridges ) {

		const main = bridge.main, K = main.half >= 1.5 ? KINDS.road : KINDS.foot, P = main.pts, L = main.length;
		const M = B( P[ P.length >> 1 ][ 0 ], P[ P.length >> 1 ][ 1 ] );
		// the deck across: from left to right of the road's direction, the carriageway level and
		// everything else a kerb higher
		const left = Math.min( bridge.left, - main.half - K.footway ) - K.edge, right = Math.max( bridge.right, main.half + K.footway ) + K.edge;
		const lane = K === KINDS.road ? [ - main.half, main.half ] : [ left, right ];
		const strips = [ [ left, lane[ 0 ], K.kerb ], [ lane[ 0 ], lane[ 1 ], 0 ], [ lane[ 1 ], right, K.kerb ] ].filter( ( [ a, b ] ) => b - a > 1e-3 );
		// the frame at a distance along the road: the point on its centreline, its direction, its right
		const at = ( s ) => {

			let i = 0;
			while ( i + 2 < P.length && P[ i + 1 ][ 3 ] < s ) i ++;
			const a = P[ i ], b = P[ i + 1 ], len = b[ 3 ] - a[ 3 ], t = Math.min( 1, Math.max( 0, ( s - a[ 3 ] ) / len ) );
			const tx = ( b[ 0 ] - a[ 0 ] ) / len, tz = ( b[ 1 ] - a[ 1 ] ) / len;
			return { x: a[ 0 ] + ( b[ 0 ] - a[ 0 ] ) * t, y: a[ 2 ] + ( b[ 2 ] - a[ 2 ] ) * t, z: a[ 1 ] + ( b[ 1 ] - a[ 1 ] ) * t, tx, tz, nx: - tz, nz: tx };

		};
		const point = ( f, off, dy = 0 ) => [ f.x + f.nx * off, f.y + dy, f.z + f.nz * off ];

		// ---- the deck, station to station
		const paving = { color: lin( K.surface[ 1 ] ), rough: 0.85, surface: K.surface[ 0 ], seed: 0.4 };
		for ( let i = 0; i + 1 < P.length; i ++ ) {

			const f = at( P[ i ][ 3 ] ), g = at( P[ i + 1 ][ 3 ] ), s0 = P[ i ][ 3 ], s1 = P[ i + 1 ][ 3 ];
			const quad = ( o0, y0, o1, y1 ) => M.polygon( [ point( f, o0, y0 ), point( f, o1, y1 ), point( g, o1, y1 ), point( g, o0, y0 ) ], [ [ o0, s0 ], [ o1, s0 ], [ o1, s1 ], [ o0, s1 ] ] );
			strips.forEach( ( [ a, b, dy ], k ) => {

				M.paint( dy ? CONCRETE : paving );
				quad( a, dy, b, dy );
				// the kerb's face, where the next strip stands at another height
				const next = strips[ k + 1 ];
				if ( next && next[ 2 ] !== dy ) { M.paint( CONCRETE ); quad( b, dy, b, next[ 2 ] ); }

			} );
			M.paint( CONCRETE );
			quad( left, strips[ 0 ][ 2 ], left, - K.depth );
			quad( right, strips[ strips.length - 1 ][ 2 ], right, - K.depth );
			quad( left, - K.depth, right, - K.depth );
			if ( colliders ) {

				const rotY = Math.atan2( f.tx, f.tz ), len = Math.hypot( g.x - f.x, g.z - f.z ), y = ( f.y + g.y ) / 2;
				const box = ( o0, o1, top, thick, opts ) => colliders.addBox( new Vector3( ( f.x + g.x ) / 2 + f.nx * ( o0 + o1 ) / 2, top - thick / 2, ( f.z + g.z ) / 2 + f.nz * ( o0 + o1 ) / 2 ), new Vector3( ( o1 - o0 ) / 2, thick / 2, len / 2 + 0.05 ), rotY, opts );
				for ( const [ a, b, dy ] of strips ) box( a, b, y + dy, SLAB, { walkable: true, tag: 'bridge' } );
				// the railings: nobody walks off the side
				const rail = models.kit.get( 'railing' ).h, top = y + K.kerb + rail;
				box( left, left + 2 * RAIL_IN, top, rail, { tag: 'bridge' } );
				box( right - 2 * RAIL_IN, right, top, rail, { tag: 'bridge' } );

			}

		}

		// ---- what carries it: an abutment under each end, piers between at even spans
		const spans = Math.max( 1, Math.ceil( L / K.span ) );
		const support = ( s, thick, inset ) => {

			const f = at( s ), a = left + inset, b = right - inset, h = thick / 2;
			const corners = [ [ a, - h ], [ b, - h ], [ b, h ], [ a, h ] ].map( ( [ o, t ] ) => [ f.x + f.nx * o + f.tx * t, f.z + f.nz * o + f.tz * t ] );
			const foot = Math.min( ...corners.map( ( [ x, z ] ) => terrain.heightAt( x, z ) ) ) - FOUNDED, top = f.y - K.depth;
			M.paint( CONCRETE );
			corners.forEach( ( c, k ) => {

				const d = corners[ ( k + 1 ) % 4 ], w = Math.hypot( d[ 0 ] - c[ 0 ], d[ 1 ] - c[ 1 ] );
				M.polygon( [ [ c[ 0 ], foot, c[ 1 ] ], [ d[ 0 ], foot, d[ 1 ] ], [ d[ 0 ], top, d[ 1 ] ], [ c[ 0 ], top, c[ 1 ] ] ], [ [ 0, 0 ], [ w, 0 ], [ w, top - foot ], [ 0, top - foot ] ] );

			} );
			if ( colliders ) colliders.addBox( new Vector3( f.x + f.nx * ( a + b ) / 2, ( foot + top ) / 2, f.z + f.nz * ( a + b ) / 2 ), new Vector3( ( b - a ) / 2, ( top - foot ) / 2, h ), Math.atan2( f.tx, f.tz ), { tag: 'bridge' } );

		};
		support( K.pier[ 0 ] / 2, K.pier[ 0 ], 0 );
		support( L - K.pier[ 0 ] / 2, K.pier[ 0 ], 0 );
		for ( let k = 1; k < spans; k ++ ) support( L * k / spans, K.pier[ 0 ], K.pier[ 1 ] );

		// ---- the railings, in panels end to end along each edge, and the lamps
		const piece = models.kit.get( 'railing' ), panels = Math.max( 1, Math.round( L / piece.w ) );
		for ( const side of [ - 1, 1 ] ) {

			const off = side < 0 ? left + RAIL_IN : right - RAIL_IN, dy = side < 0 ? strips[ 0 ][ 2 ] : strips[ strips.length - 1 ][ 2 ];
			for ( let k = 0; k < panels; k ++ ) {

				// a panel runs with its outside on its right hand: down the right edge, back up the left
				const f = at( L * ( side > 0 ? k : k + 1 ) / panels ), g = at( L * ( side > 0 ? k + 1 : k ) / panels );
				const a = point( f, off, dy ), b = point( g, off, dy );
				const X = [ ( b[ 0 ] - a[ 0 ] ) / piece.w, ( b[ 1 ] - a[ 1 ] ) / piece.w, ( b[ 2 ] - a[ 2 ] ) / piece.w ];
				for ( const part of piece.parts ) M.paint( RAIL_PAINT[ part.material ] ).stamp( part, X, [ 0, 1, 0 ], [ f.nx * side, 0, f.nz * side ], a );

			}

		}

		const lamp = models.kit.get( 'lamp' );
		let lamps = 0;
		if ( K.lamps ) for ( let s = K.lamps / 2; s < L; s += K.lamps ) {

			// all along the side that faces the way the kind says, the arm out over the road
			const f = at( s ), side = f.nx * K.lit[ 0 ] + f.nz * K.lit[ 1 ] > 0 ? 1 : - 1, dy = side < 0 ? strips[ 0 ][ 2 ] : strips[ strips.length - 1 ][ 2 ];
			const o = point( f, side < 0 ? left + 3 * RAIL_IN : right - 3 * RAIL_IN, dy );
			for ( const part of lamp.parts ) M.paint( LAMP_PAINT[ part.material ] ).stamp( part, [ f.tx * side, 0, f.tz * side ], [ 0, 1, 0 ], [ f.nx * side, 0, f.nz * side ], o );
			lamps ++;

		}

		// ( walks: the raised strip on each side of the carriageway, inside the railing )
		built.push( { name: main.name, class: main.class, length: L, width: right - left, walks: [ lane[ 0 ] - left - K.edge, right - lane[ 1 ] - K.edge ], spans, panels: 2 * panels, lamps } );

	}

	return built;

}
