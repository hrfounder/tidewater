import { Vector3 } from '../../../engine/index.js';
import { MeshBuilder } from './MeshBuilder.js';
import { createVillageMaterial, SURFACE } from './VillageMaterial.js';
import { archetypeOf } from './Archetypes.js';
import { gable, leanTo, hip, visible, onSlope, roofHeight } from './Roof.js';
import { LANDMARKS } from '../Landmarks.js';

// Everything built on the Site's footprints: each building raised by its archetype (Archetypes.js)
// on the rectangles its footprint is made of, fitted with the kit's windows and doors in openings
// cut for them, under a roof that follows the footprint (Roof.js); the landmarks set down as the
// models they are. All of it goes into a few meshes, one per cell of the block, in one material.

// the side of the cells the village is drawn in (m): what is behind the camera is not drawn
const CELL = 256;
// the walls run this far below the lowest ground at the building's foot (m): no wall ends in the air
const FOOTING = 0.4;
// the board along the eaves and up the verges of a roof (m)
const FASCIA = 0.16;
// A small piece standing against a larger one is roofed as a lean-to: under this share of the main
// piece's area and no deeper than `depth`; its roof meets the wall `drop` under the eaves, at
// `pitch` degrees or as much less as keeps its own outer wall `wall` high.
const LEAN = { share: 0.3, depth: 4.5, drop: 0.25, pitch: 20, wall: 1.9 };
// a chimney: a brick stack this square, its top this far above the ridge, under a slab (m)
const CHIMNEY = { side: 0.5, above: 0.55, cap: 0.07 };
// a window keeps this far from the corners of its wall and from the eaves (m)
const CORNER = 0.6, HEAD = 0.25;
// the steps up to a door: this deep, a tread's width wider than the door on each side (m)
const STOOP = { out: 0.9, wider: 0.25, under: 0.16 };

const lin = ( c ) => c.map( ( v ) => Math.pow( v / 255, 2.2 ) );
const CONCRETE = { color: lin( [ 150, 147, 140 ] ), rough: 0.95, surface: SURFACE.concrete };
const KIT_PAINT = {
	glass: { color: lin( [ 38, 44, 52 ] ), rough: 0.07, surface: SURFACE.glass },
	sill: CONCRETE,
	plank: { color: lin( [ 112, 96, 78 ] ), rough: 0.9, surface: SURFACE.boards },
	iron: { color: lin( [ 40, 40, 42 ] ), rough: 0.6, metal: 0.8, surface: SURFACE.plain },
};

// a repeatable stream of numbers in 0..1 from a seed (mulberry32)
function random( seed ) {

	let a = ( seed + 0x9e3779b9 ) >>> 0;
	return () => {

		a = ( a + 0x6d2b79f5 ) >>> 0;
		let t = Math.imul( a ^ ( a >>> 15 ), a | 1 );
		t ^= t + Math.imul( t ^ ( t >>> 7 ), t | 61 );
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;

	};

}

// world: { site, terrain, models } (world.js loadWorld). Returns the meshes and what was built.
export function buildVillage( { site, terrain, models }, { scene, colliders } ) {

	const material = createVillageMaterial();
	const cells = new Map();
	const builder = ( x, z ) => {

		const key = Math.floor( x / CELL ) + ',' + Math.floor( z / CELL );
		if ( ! cells.has( key ) ) cells.set( key, new MeshBuilder() );
		return cells.get( key );

	};
	const built = {}, waiting = [];
	for ( const b of site.buildings.list ) {

		const B = builder( b.x, b.z ), A = archetypeOf( b );
		let top;
		if ( b.kind === 'landmark' ) top = setDown( B, b, models.landmarks.get( b.name.toLowerCase() ) );
		else if ( A ) top = raise( B, b, A, models.kit, terrain );
		else { waiting.push( b ); continue; }
		built[ b.kind ] = ( built[ b.kind ] || 0 ) + 1;
		// what the player cannot walk through: each piece of the footprint, from under the ground to its top
		if ( colliders ) for ( const p of b.pieces ) {

			const [ x, , z ] = frame( b ).at( p.u, 0, p.v ), bottom = b.floor - FOOTING;
			colliders.addBox( new Vector3( x, ( bottom + top ) / 2, z ), new Vector3( p.hu, ( top - bottom ) / 2, p.hv ), b.yaw, { tag: 'building' } );

		}

	}

	const meshes = [];
	let triangles = 0;
	for ( const [ key, B ] of cells ) {

		if ( ! B.triangles ) continue;
		const mesh = B.mesh( material, 'village ' + key );
		triangles += B.triangles;
		meshes.push( mesh );
		if ( scene ) scene.add( mesh );

	}

	return { meshes, material, built, waiting, triangles };

}

// a building's frame: local ( u, y, v ) -> world, and local directions -> world
function frame( b ) {

	const c = Math.cos( b.yaw ), s = Math.sin( b.yaw );
	return {
		at: ( u, y, v ) => [ b.x + u * c + v * s, y, b.z - u * s + v * c ],
		dir: ( du, dv ) => [ du * c + dv * s, 0, - du * s + dv * c ],
	};

}

// a landmark's model, stood on its footprint
function setDown( B, b, model ) {

	const F = frame( b ), surfaces = LANDMARKS.find( ( l ) => l.name.toLowerCase() === b.name.toLowerCase() ).surfaces;
	let top = b.floor;
	for ( const part of model.parts ) {

		B.paint( { color: part.color, rough: part.rough, metal: part.metal, surface: SURFACE[ surfaces[ part.material ] || 'plain' ], seed: 0.3 } );
		B.stamp( part, F.dir( 1, 0 ), [ 0, 1, 0 ], F.dir( 0, 1 ), F.at( 0, b.floor, 0 ) );
		for ( let i = 1; i < part.positions.length; i += 3 ) top = Math.max( top, b.floor + part.positions[ i ] );

	}

	return top;

}

// the four walls of a piece: where each starts, the way it runs (left to right, seen from outside),
// the way it faces, its length, and which way that is for the building
function wallsOf( p ) {

	return [
		{ o: [ p.u - p.hu, p.v + p.hv ], d: [ 1, 0 ], n: [ 0, 1 ], len: 2 * p.hu, facing: 'street' },
		{ o: [ p.u + p.hu, p.v - p.hv ], d: [ - 1, 0 ], n: [ 0, - 1 ], len: 2 * p.hu, facing: 'back' },
		{ o: [ p.u + p.hu, p.v + p.hv ], d: [ 0, - 1 ], n: [ 1, 0 ], len: 2 * p.hv, facing: 'side' },
		{ o: [ p.u - p.hu, p.v - p.hv ], d: [ 0, 1 ], n: [ - 1, 0 ], len: 2 * p.hv, facing: 'side' },
	];

}

// the stretches of a wall that no other piece of the building stands against: [ [ t0, t1 ], ... ]
function clearOf( wall, p, pieces ) {

	let free = [ [ 0, wall.len ] ];
	for ( const q of pieces ) {

		if ( q === p ) continue;
		// the other piece in this wall's own coordinates: along it, and out from it
		const du = q.u - wall.o[ 0 ], dv = q.v - wall.o[ 1 ];
		const t = du * wall.d[ 0 ] + dv * wall.d[ 1 ], out = du * wall.n[ 0 ] + dv * wall.n[ 1 ];
		const ht = Math.abs( wall.d[ 0 ] ) * q.hu + Math.abs( wall.d[ 1 ] ) * q.hv, ho = Math.abs( wall.n[ 0 ] ) * q.hu + Math.abs( wall.n[ 1 ] ) * q.hv;
		if ( out - ho > 0.05 || out + ho < 0.05 ) continue;
		free = free.flatMap( ( [ a, b ] ) => [ [ a, Math.min( b, t - ht ) ], [ Math.max( a, t + ht ), b ] ] ).filter( ( [ a, b ] ) => b - a > 1e-3 );

	}

	return free;

}

// raise a building by its archetype; returns the height of its top
function raise( B, b, A, kit, terrain ) {

	const rnd = random( b.index ), pick = ( list ) => list[ Math.floor( rnd() * list.length ) ];
	const F = frame( b ), seed = rnd();
	const storeys = A.storeys[ 0 ] + Math.floor( rnd() * ( A.storeys[ 1 ] - A.storeys[ 0 ] + 1 ) );
	const ground = Math.min( ...b.ring.map( ( [ x, z ] ) => terrain.heightAt( x, z ) ) ) - FOOTING;
	const floorY = b.floor + A.plinth, eaveY = floorY + storeys * A.storey;

	// ---- the building's own paint
	let lot = rnd() * A.walls.reduce( ( s, w ) => s + w[ 2 ], 0 );
	const [ wallSurface, wallColours ] = A.walls.find( ( w ) => ( lot -= w[ 2 ] ) < 0 ) || A.walls[ 0 ];
	const wall = { color: lin( pick( wallColours ) ), rough: 0.92, surface: wallSurface, seed };
	const trim = { color: lin( pick( A.trim ) ), rough: 0.9, surface: SURFACE.render, seed };
	const joinery = { color: lin( pick( A.joinery ) ), rough: 0.55, surface: SURFACE.plain, seed };
	const cover = { color: lin( pick( A.roof.cover[ 1 ] ) ), rough: 0.85, surface: A.roof.cover[ 0 ], seed };
	const infill = A.gable ? { color: lin( pick( A.gable[ 1 ] ) ), rough: 0.9, surface: A.gable[ 0 ], seed } : wall;
	const paints = { ...KIT_PAINT, joinery, surround: trim, leaf: { color: lin( pick( A.doors ) ), rough: 0.6, surface: SURFACE.plain, seed } };
	const plinth = { ...CONCRETE, seed };

	// ---- the roofs: a gable on every piece but the small ones that lean on a larger; a hip on a
	// building of one piece whose archetype has one
	const pieces = b.pieces, main = pieces[ 0 ], size = ( p ) => p.hu * p.hv;
	const touching = ( p, q ) => Math.abs( p.u - q.u ) <= p.hu + q.hu + 0.05 && Math.abs( p.v - q.v ) <= p.hv + q.hv + 0.05;
	const hosts = new Map();
	for ( const p of pieces.slice( 1 ) ) if ( size( p ) < LEAN.share * size( main ) && 2 * Math.min( p.hu, p.hv ) <= LEAN.depth ) {

		const host = pieces.filter( ( q ) => q !== p && size( q ) > size( p ) && touching( p, q ) ).sort( ( m, n ) => size( n ) - size( m ) )[ 0 ];
		if ( host ) hosts.set( p, host );

	}

	const gabled = pieces.filter( ( p ) => ! hosts.has( p ) ), axes = new Map( gabled.map( ( p ) => [ p, p.hu >= p.hv ? 0 : 1 ] ) );
	const tan = Math.tan( A.roof.pitch * Math.PI / 180 );
	const roofs = new Map( pieces.map( ( p ) => [ p,
		hosts.has( p ) ? leanTo( p, hosts.get( p ), { topY: eaveY - LEAN.drop, tan: Math.tan( LEAN.pitch * Math.PI / 180 ), lowest: floorY + LEAN.wall, eave: A.roof.eave / 2, verge: A.roof.verge } )
		: A.roof.form === 'hip' && pieces.length === 1 ? hip( p, { eaveY, tan, eave: A.roof.eave } )
		: gable( p, gabled, axes, { eaveY, tan, eave: A.roof.eave, verge: A.roof.verge } ) ] ) );
	const all = [ ...roofs.values() ];
	let top = eaveY;
	for ( const roof of all ) {

		if ( roof.ridgeY > top ) top = roof.ridgeY;
		for ( const slope of roof.slopes ) for ( const poly of visible( slope, roof, all ) ) {

			// ( wound so that the covered side is the front: the rest of a roof is its underside )
			const on = poly.map( ( [ u, v ] ) => onSlope( slope, u, v ) ).reverse();
			B.paint( cover ).polygon( on.map( ( q ) => F.at( ...q.point ) ), on.map( ( q ) => q.uv ) );
			// a board under the eaves, and up each verge that ends over a gable wall
			B.paint( joinery );
			poly.forEach( ( _, i ) => {

				// ( `on` runs the other way round: its points i and i + 1 are the plan's n - 1 - i and n - 2 - i )
				const n = poly.length, p = poly[ n - 1 - i ], q = poly[ ( 2 * n - 2 - i ) % n ];
				const x = ( m ) => slope.along === 0 ? m[ 1 ] : m[ 0 ], a = ( m ) => slope.along === 0 ? m[ 0 ] : m[ 1 ];
				const eaves = Math.abs( x( p ) - slope.eave ) < 1e-3 && Math.abs( x( q ) - slope.eave ) < 1e-3;
				const verge = roof.kind !== 'hip' && [ roof.lo, roof.hi ].some( ( end, k ) => roof.free[ k ] && Math.abs( a( p ) - end ) < 1e-3 && Math.abs( a( q ) - end ) < 1e-3 );
				if ( ! eaves && ! verge ) return;
				const P = on[ i ].point, Q = on[ ( i + 1 ) % on.length ].point, len = Math.hypot( Q[ 0 ] - P[ 0 ], Q[ 2 ] - P[ 2 ] );
				B.polygon( [ F.at( ...P ), F.at( ...Q ), F.at( Q[ 0 ], Q[ 1 ] - FASCIA, Q[ 2 ] ), F.at( P[ 0 ], P[ 1 ] - FASCIA, P[ 2 ] ) ], [ [ 0, FASCIA ], [ len, FASCIA ], [ len, 0 ], [ 0, 0 ] ] );

			} );

		}

	}

	// ---- the walls: each piece's four, up to its own roof, with the openings its archetype gives them
	// the door goes in the main piece's longest wall that faces the way the archetype says
	const mainWalls = wallsOf( main );
	const doorWall = mainWalls.filter( ( w ) => w.facing === A.door[ 1 ] ).sort( ( m, n ) => n.len - m.len || rnd() - 0.5 )[ 0 ] || mainWalls[ 0 ];
	for ( const p of pieces ) {

		const roof = roofs.get( p );
		( p === main ? mainWalls : wallsOf( p ) ).forEach( ( w ) => {

			const at = ( t, y, out = 0 ) => F.at( w.o[ 0 ] + w.d[ 0 ] * t + w.n[ 0 ] * out, y, w.o[ 1 ] + w.d[ 1 ] * t + w.n[ 1 ] * out );
			const topAt = ( t ) => roofHeight( roof, w.o[ 0 ] + w.d[ 0 ] * t, w.o[ 1 ] + w.d[ 1 ] * t );
			const y0 = topAt( 0 ), y1 = topAt( w.len / 2 ), y2 = topAt( w.len ), square = Math.min( y0, y1, y2 );

			// the openings: windows along the clear stretches of each storey, and the door
			const holes = [];
			const rule = A.windows[ w.facing ], door = w === doorWall ? kit.get( A.door[ 0 ] ) : null;
			for ( const [ a, c ] of clearOf( w, p, pieces ) ) {

				const room = c - a - 2 * CORNER;
				if ( door && ! holes.some( ( h ) => h.piece === door ) && room >= door.w ) holes.push( { piece: door, t: ( a + c ) / 2, y: floorY } );
				if ( ! rule ) continue;
				const piece = kit.get( rule[ 0 ] );
				const n = room < piece.w ? 0 : Math.max( 1, Math.floor( ( c - a ) / rule[ 1 ] ) );
				for ( let s = 0; s < storeys; s ++ ) for ( let i = 0; i < n; i ++ ) {

					const t = a + ( c - a ) * ( i + 0.5 ) / n, y = floorY + s * A.storey + rule[ 2 ];
					if ( y + piece.h + HEAD > square ) continue;
					// not where the door is, nor over it
					if ( holes.some( ( h ) => h.piece === door && Math.abs( h.t - t ) < ( door.w + piece.w ) / 2 + 0.3 && y < h.y + door.h + 0.3 ) ) continue;
					holes.push( { piece, t, y } );

				}

			}

			// the plinth, then the wall up to where it stops being square, in bands between the openings
			B.paint( plinth ).polygon( [ at( 0, ground ), at( w.len, ground ), at( w.len, floorY ), at( 0, floorY ) ], [ [ 0, ground - floorY ], [ w.len, ground - floorY ], [ w.len, 0 ], [ 0, 0 ] ] );
			B.paint( wall );
			const cuts = [ floorY, square, ...holes.flatMap( ( h ) => [ h.y, h.y + h.piece.h ] ) ].filter( ( y ) => y >= floorY && y <= square ).sort( ( m, n ) => m - n );
			for ( let k = 0; k + 1 < cuts.length; k ++ ) {

				const lo = cuts[ k ], hi = cuts[ k + 1 ];
				if ( hi - lo < 1e-4 ) continue;
				const mid = ( lo + hi ) / 2;
				const gaps = holes.filter( ( h ) => mid > h.y && mid < h.y + h.piece.h ).map( ( h ) => [ h.t - h.piece.w / 2, h.t + h.piece.w / 2 ] ).sort( ( m, n ) => m[ 0 ] - n[ 0 ] );
				let t = 0;
				for ( const [ g0, g1 ] of [ ...gaps, [ w.len, w.len ] ] ) {

					if ( g0 - t > 1e-4 ) B.polygon( [ at( t, lo ), at( g0, lo ), at( g0, hi ), at( t, hi ) ], [ [ t, lo - b.floor ], [ g0, lo - b.floor ], [ g0, hi - b.floor ], [ t, hi - b.floor ] ] );
					t = g1;

				}

			}

			// above that, the wall under a raking roof: a gable, or the end of a lean-to
			if ( Math.max( y0, y1, y2 ) - square > 1e-3 ) {

				const rake = [ [ 0, square ], [ w.len, square ], [ w.len, y2 ], [ w.len / 2, y1 ], [ 0, y0 ] ].filter( ( q, i ) => i < 2 || q[ 1 ] - square > 1e-3 );
				B.paint( roof.kind === 'gable' ? infill : wall ).polygon( rake.map( ( [ t, y ] ) => at( t, y ) ), rake.map( ( [ t, y ] ) => [ t, y - b.floor ] ) );
				// the vent in a gable that stands free
				if ( A.vent && roof.kind === 'gable' && y1 - square > 1.2 && clearOf( w, p, pieces ).some( ( [ a, c ] ) => a < w.len / 2 - 0.5 && c > w.len / 2 + 0.5 ) ) {

					const vent = kit.get( 'vent' );
					setPiece( B, vent, at( w.len / 2, square + ( y1 - square ) * 0.4 ), F, w, paints );

				}

			}

			// each opening: its reveal, the piece in it, and steps up to a door that stands over a plinth
			for ( const h of holes ) {

				const { piece } = h, a = h.t - piece.w / 2, c = h.t + piece.w / 2, lo = h.y, hi = h.y + piece.h, d = - piece.depth;
				B.paint( wall );
				for ( const side of [ [ [ a, lo ], [ a, hi ] ], [ [ c, hi ], [ c, lo ] ], [ [ a, hi ], [ c, hi ] ], [ [ c, lo ], [ a, lo ] ] ] ) {

					const [ m, n ] = side;
					B.polygon( [ at( m[ 0 ], m[ 1 ] ), at( n[ 0 ], n[ 1 ] ), at( n[ 0 ], n[ 1 ], d ), at( m[ 0 ], m[ 1 ], d ) ], [ [ 0, 0 ], [ 1, 0 ], [ 1, piece.depth ], [ 0, piece.depth ] ] );

				}

				setPiece( B, piece, at( h.t, h.y ), F, w, paints );
				if ( piece === door && A.plinth > STOOP.under + 0.1 ) {

					const s0 = a - STOOP.wider, s1 = c + STOOP.wider, sy = floorY - STOOP.under;
					B.paint( plinth );
					box( B, ( t, y, out ) => at( t, y, out ), s0, s1, 0, STOOP.out, ground, sy );

				}

			}

		} );

	}

	// ---- the chimneys: brick stacks through the main roof, beside the ridge
	const mainRoof = roofs.get( main );
	const chimneys = A.chimneys[ 0 ] + Math.floor( rnd() * ( A.chimneys[ 1 ] - A.chimneys[ 0 ] + 1 ) );
	for ( let k = 0; k < chimneys; k ++ ) {

		// a third of the way in from one end or the other, a little to one side of the ridge
		const L = mainRoof.axis === 0 ? main.hu : main.hv, S = mainRoof.axis === 0 ? main.hv : main.hu;
		const al = ( k === 0 ? - 1 : 1 ) * L * ( 0.3 + 0.3 * rnd() ), ac = ( rnd() < 0.5 ? - 1 : 1 ) * S * 0.25;
		const u = main.u + ( mainRoof.axis === 0 ? al : ac ), v = main.v + ( mainRoof.axis === 0 ? ac : al ), h = CHIMNEY.side / 2;
		const base = roofHeight( mainRoof, u, v ) - 0.3, cap = mainRoof.ridgeY + CHIMNEY.above;
		const at = ( t, y, out ) => F.at( u + t, y, v + out );
		B.paint( { color: lin( [ 150, 84, 60 ] ), rough: 0.9, surface: SURFACE.brick, seed } );
		box( B, at, - h, h, - h, h, base, cap );
		B.paint( plinth );
		box( B, at, - h - 0.05, h + 0.05, - h - 0.05, h + 0.05, cap, cap + CHIMNEY.cap );
		top = Math.max( top, cap + CHIMNEY.cap );

	}

	return top;

}

// a kit piece set in a wall at a point of it: across the wall, up, and out of it
function setPiece( B, piece, origin, F, wall, paints ) {

	const X = F.dir( wall.d[ 0 ], wall.d[ 1 ] ), Z = F.dir( wall.n[ 0 ], wall.n[ 1 ] );
	for ( const part of piece.parts ) {

		B.paint( paints[ part.material ] );
		B.stamp( part, X, [ 0, 1, 0 ], Z, origin );

	}

}

// a box from t0..t1, out0..out1 and y0..y1 in a wall's coordinates: its four sides and its top
function box( B, at, t0, t1, o0, o1, y0, y1 ) {

	const w = t1 - t0, d = o1 - o0, h = y1 - y0;
	const side = ( a, c, len ) => B.polygon( [ at( a[ 0 ], y0, a[ 1 ] ), at( c[ 0 ], y0, c[ 1 ] ), at( c[ 0 ], y1, c[ 1 ] ), at( a[ 0 ], y1, a[ 1 ] ) ], [ [ 0, 0 ], [ len, 0 ], [ len, h ], [ 0, h ] ] );
	side( [ t0, o1 ], [ t1, o1 ], w ); side( [ t1, o1 ], [ t1, o0 ], d ); side( [ t1, o0 ], [ t0, o0 ], w ); side( [ t0, o0 ], [ t0, o1 ], d );
	B.polygon( [ at( t0, y1, o1 ), at( t1, y1, o1 ), at( t1, y1, o0 ), at( t0, y1, o0 ) ], [ [ 0, 0 ], [ w, 0 ], [ w, d ], [ 0, d ] ] );

}
