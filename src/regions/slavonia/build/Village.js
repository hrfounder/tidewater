import { Vector3 } from '../../../engine/index.js';
import { MeshBuilder } from './MeshBuilder.js';
import { createVillageMaterial, SURFACE } from './VillageMaterial.js';
import { archetypeOf, coverSeen, FENCES } from './Archetypes.js';
import { gable, leanTo, hip, visible, onSlope, roofHeight } from './Roof.js';
import { LANDMARKS, keyOf } from '../Landmarks.js';
import { buildBridges, LAMP_PAINT } from './Bridges.js';
import { buildMarina } from './Marina.js';
import { buildRailway } from './Railway.js';

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
// Made ground: how far each kind stands over the ground it lies on (m), its colour (sRGB, by eye off
// the orthophoto) and what it is drawn as. `paving` is the pavement beside a road: the red-grey
// concrete setts of those round St Andrew's.
const MADE = {
	paving: { kerb: 0.12, colour: [ 170, 146, 136 ], surface: SURFACE.concrete },
	concrete: { kerb: 0.08, colour: [ 172, 170, 162 ], surface: SURFACE.concrete },
	gravel: { kerb: 0.03, colour: [ 178, 168, 150 ], surface: SURFACE.concrete },
	track: { kerb: 0.03, colour: [ 150, 62, 52 ], surface: SURFACE.plain },
	court: { kerb: 0.03, colour: [ 118, 158, 194 ], surface: SURFACE.plain },
	sand: { kerb: 0.03, colour: [ 206, 190, 150 ], surface: SURFACE.plain },
	brick: { kerb: 0.3, colour: [ 156, 86, 60 ], surface: SURFACE.brick },
};
const PAVING = MADE.paving;
// a court's fence (m): its posts this far apart, its mesh's uprights this far apart and this thick
const COURT_FENCE = { post: 2.5, wire: 0.15, thread: 0.012 };
// by eye: galvanised posts, the mesh darker (the orthophoto has it as a dark line)
const FENCE_STEEL = [ 150, 154, 156 ], FENCE_MESH = [ 70, 76, 74 ];
// half the thickness of the wall round a landmark's grounds, as the player meets it (m)
const WALL_HALF = 0.15;
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

// is the point inside the ring?
function inside( ring, x, z ) {

	let c = false;
	for ( let i = 0, j = ring.length - 1; i < ring.length; j = i ++ ) {

		const a = ring[ j ], b = ring[ i ];
		if ( ( a[ 1 ] <= z ) !== ( b[ 1 ] <= z ) && x < a[ 0 ] + ( b[ 0 ] - a[ 0 ] ) * ( z - a[ 1 ] ) / ( b[ 1 ] - a[ 1 ] ) ) c = ! c;

	}

	return c;

}

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
		if ( b.kind === 'landmark' ) top = setDown( B, b, models.landmarks.get( b.landmark ) );
		else if ( A ) top = raise( B, b, A, models.kit, terrain );
		else { waiting.push( b ); continue; }
		built[ b.kind ] = ( built[ b.kind ] || 0 ) + 1;
		// what the player cannot walk through: each piece of the footprint, from under the ground to its
		// top (a landmark's pieces say how high each of them is), and the walls round its grounds
		if ( colliders ) for ( const p of b.pieces ) {

			const [ x, , z ] = frame( b ).at( p.u, 0, p.v ), bottom = b.floor - FOOTING, upTo = p.top === undefined ? top : b.floor + p.top;
			colliders.addBox( new Vector3( x, ( bottom + upTo ) / 2, z ), new Vector3( p.hu, ( upTo - bottom ) / 2, p.hv ), b.yaw, { tag: 'building' } );

		}

		if ( colliders && b.grounds ) for ( const w of b.grounds.walls ) {

			const len = Math.hypot( w.b[ 0 ] - w.a[ 0 ], w.b[ 1 ] - w.a[ 1 ] ), bottom = b.floor - FOOTING, upTo = b.floor + w.height;
			colliders.addBox( new Vector3( ( w.a[ 0 ] + w.b[ 0 ] ) / 2, ( bottom + upTo ) / 2, ( w.a[ 1 ] + w.b[ 1 ] ) / 2 ), new Vector3( WALL_HALF, ( upTo - bottom ) / 2, len / 2 ), Math.atan2( w.b[ 0 ] - w.a[ 0 ], w.b[ 1 ] - w.a[ 1 ] ), { tag: 'fence' } );

		}

	}

	const bridges = buildBridges( builder, { site, terrain, models }, colliders );
	const marina = buildMarina( builder, { site, terrain, models }, colliders );
	const railway = buildRailway( builder, { site, terrain, models }, colliders );

	// the anglers' platforms along the bank: the kit's piece at each of the Site's places for one
	const platform = models.kit.get( 'platform' );
	for ( const p of site.park.platforms ) {

		// the piece's +z is the water's side, its origin on the waterline at the water's level
		const Z = [ p.toWater[ 0 ], 0, p.toWater[ 1 ] ], X = [ Z[ 2 ], 0, - Z[ 0 ] ];
		const B = builder( p.x, p.z );
		for ( const part of platform.parts ) B.paint( { color: part.color, rough: part.rough, surface: SURFACE.plain, seed: 0.6 } ).stamp( part, X, [ 0, 1, 0 ], Z, [ p.x, 0, p.z ] );
		if ( colliders ) {

			const mid = ( platform.out - platform.back ) / 2;
			colliders.addBox( new Vector3( p.x + Z[ 0 ] * mid, platform.h - 0.05, p.z + Z[ 2 ] * mid ), new Vector3( platform.w / 2, 0.05, ( platform.out + platform.back ) / 2 ), Math.atan2( Z[ 0 ], Z[ 2 ] ), { walkable: true, tag: 'platform' } );

		}

	}

	// the fences: each plot's in the style its house's archetype gives it, the house's own colours
	// where the style is a wall of the same render; the kit's gate where the Site put one
	const styles = new Map();
	const styleOf = ( plot ) => {

		if ( ! styles.has( plot ) ) {

			const A = archetypeOf( plot.house ), rnd = random( plot.house.seed + 77 );
			// ( an archetype with no fence styles stands open to its street )
			const fenced = A && A.fence.length > 0;
			let lot = fenced ? rnd() * A.fence.reduce( ( s, f ) => s + f[ 1 ], 0 ) : 0;
			const F = fenced ? FENCES[ ( A.fence.find( ( f ) => ( lot -= f[ 1 ] ) < 0 ) || A.fence[ 0 ] )[ 0 ] ] : null;
			const colours = F && ( F.colours || A.walls[ 0 ][ 1 ] );
			styles.set( plot, F && { ...F, paint: { color: lin( colours[ Math.floor( rnd() * colours.length ) ] ), rough: 0.92, surface: F.surface, seed: rnd() } } );

		}

		return styles.get( plot );

	};
	const fences = { panels: 0, gates: 0, triangles: 0 };
	for ( const p of site.fences.panels ) {

		const F = styleOf( p.plot );
		if ( ! F ) continue;
		const B = builder( p.a[ 0 ], p.a[ 1 ] ), before = B.triangles;
		const len = Math.hypot( p.b[ 0 ] - p.a[ 0 ], p.b[ 1 ] - p.a[ 1 ] ), tx = ( p.b[ 0 ] - p.a[ 0 ] ) / len, tz = ( p.b[ 1 ] - p.a[ 1 ] ) / len;
		const ya = terrain.heightAt( ...p.a ), yb = terrain.heightAt( ...p.b ), foot = Math.min( ya, yb ) - FOOTING, h = F.thick / 2;
		// along the panel, up, and across it: its top follows the ground
		const at = ( t, y, out ) => [ p.a[ 0 ] + tx * t - tz * out, y, p.a[ 1 ] + tz * t + tx * out ];
		B.paint( F.paint );
		for ( const out of [ - h, h ] ) B.polygon( [ at( 0, foot, out ), at( len, foot, out ), at( len, yb + F.height, out ), at( 0, ya + F.height, out ) ], [ [ 0, foot - ya ], [ len, foot - ya ], [ len, F.height ], [ 0, F.height ] ] );
		B.polygon( [ at( 0, ya + F.height, - h ), at( len, yb + F.height, - h ), at( len, yb + F.height, h ), at( 0, ya + F.height, h ) ], [ [ 0, 0 ], [ len, 0 ], [ len, F.thick ], [ 0, F.thick ] ] );
		for ( const [ t, y ] of [ [ 0, ya ], [ len, yb ] ] ) B.polygon( [ at( t, foot, - h ), at( t, foot, h ), at( t, y + F.height, h ), at( t, y + F.height, - h ) ], [ [ 0, foot - y ], [ F.thick, foot - y ], [ F.thick, F.height ], [ 0, F.height ] ] );
		fences.panels ++; fences.triangles += B.triangles - before;
		if ( colliders ) colliders.addBox( new Vector3( ( p.a[ 0 ] + p.b[ 0 ] ) / 2, ( foot + Math.max( ya, yb ) + F.height ) / 2, ( p.a[ 1 ] + p.b[ 1 ] ) / 2 ), new Vector3( h, ( Math.max( ya, yb ) + F.height - foot ) / 2, len / 2 ), Math.atan2( tx, tz ), { tag: 'fence' } );

	}

	// the pavements beside the roads: each a slab a kerb's height over the ground it lies on, its two
	// long edges and its ends closed down to the ground
	let pavements = 0;
	for ( const strip of site.beside ) {

		if ( strip.of !== 'paving' ) continue;
		pavements ++;
		const paving = { color: lin( strip.colour || PAVING.colour ), rough: 0.9, surface: SURFACE.concrete, seed: 0.35 };
		const top = ( [ x, z ] ) => [ x, terrain.heightAt( x, z ) + PAVING.kerb, z ], foot = ( [ x, z ] ) => [ x, terrain.heightAt( x, z ) - FOOTING, z ];
		const n = strip.inner.length, width = Math.hypot( strip.outer[ 0 ][ 0 ] - strip.inner[ 0 ][ 0 ], strip.outer[ 0 ][ 1 ] - strip.inner[ 0 ][ 1 ] );
		let along = 0;
		for ( let k = 0; k + 1 < n; k ++ ) {

			const a = strip.inner[ k ], c = strip.inner[ k + 1 ], d = strip.outer[ k + 1 ], e = strip.outer[ k ];
			const len = Math.hypot( c[ 0 ] - a[ 0 ], c[ 1 ] - a[ 1 ] ), B = builder( a[ 0 ], a[ 1 ] );
			B.paint( paving );
			// ( wound so that the slab's top faces up whichever side of its road the strip lies on )
			const quad = strip.side > 0 ? [ a, c, d, e ] : [ e, d, c, a ], uv = strip.side > 0 ? [ [ 0, along ], [ 0, along + len ], [ width, along + len ], [ width, along ] ] : [ [ width, along ], [ width, along + len ], [ 0, along + len ], [ 0, along ] ];
			B.polygon( quad.map( top ).reverse(), uv.slice().reverse() );
			for ( const [ p, q ] of [ [ a, c ], [ d, e ] ] ) B.polygon( [ foot( p ), foot( q ), top( q ), top( p ) ], [ [ 0, 0 ], [ len, 0 ], [ len, PAVING.kerb + FOOTING ], [ 0, PAVING.kerb + FOOTING ] ] );
			along += len;

		}

		for ( const [ p, q ] of [ [ strip.inner[ 0 ], strip.outer[ 0 ] ], [ strip.inner[ n - 1 ], strip.outer[ n - 1 ] ] ] ) builder( p[ 0 ], p[ 1 ] ).paint( paving ).polygon( [ foot( p ), foot( q ), top( q ), top( p ) ], [ [ 0, 0 ], [ width, 0 ], [ width, PAVING.kerb + FOOTING ], [ 0, PAVING.kerb + FOOTING ] ] );

	}

	// what stands about: a piece of the kit at its place, on whatever ground (or made ground) is there
	const PROP_PAINT = { ...KIT_PAINT, ...LAMP_PAINT, timber: { color: lin( [ 128, 108, 84 ] ), rough: 0.9, surface: SURFACE.boards }, joinery: { color: lin( [ 226, 226, 220 ] ), rough: 0.55, surface: SURFACE.plain } };
	for ( const prop of site.props ) {

		const piece = models.kit.get( prop.piece );
		if ( ! piece ) throw new Error( `the survey has a ${ prop.piece } at ${ prop.at }, and the kit has no such piece` );
		const [ x, z ] = prop.at, yaw = prop.yaw * Math.PI / 180, area = site.areas.find( ( a ) => inside( a.ring, x, z ) );
		const y = area ? area.level + MADE[ area.of ].kerb : terrain.heightAt( x, z );
		// ( the piece's front, its Blender -y, is the game's +z for it: toward the south at yaw 0 )
		const Z = [ Math.sin( yaw ), 0, Math.cos( yaw ) ], X = [ Z[ 2 ], 0, - Z[ 0 ] ], B = builder( x, z );
		for ( const part of piece.parts ) B.paint( { ...PROP_PAINT[ part.material ], seed: 0.4 } ).stamp( part, X, [ 0, 1, 0 ], Z, [ x, y, z ] );
		if ( colliders ) colliders.addBox( new Vector3( x, y + piece.h / 2, z ), new Vector3( piece.w / 2, piece.h / 2, piece.depth / 2 ), yaw, { tag: 'prop' } );

	}

	// made ground: each a flat slab at its area's level, its sides closed down to the ground
	for ( const area of site.areas ) {

		// ( an area may carry its own colour and stand a little over the one under it: a court's markings )
		const M = MADE[ area.of ], B = builder( area.ring[ 0 ][ 0 ], area.ring[ 0 ][ 1 ] ), y = area.level + M.kerb + ( area.lift || 0 );
		B.paint( { color: lin( area.colour || M.colour ), rough: 0.9, surface: M.surface, seed: 0.35 } );
		// ( wound so that its top faces up whichever way the ring was written )
		let turn = 0;
		area.ring.forEach( ( p, i ) => { const q = area.ring[ ( i + 1 ) % area.ring.length ]; turn += p[ 0 ] * q[ 1 ] - q[ 0 ] * p[ 1 ]; } );
		const ring = turn > 0 ? area.ring.slice().reverse() : area.ring;
		B.polygon( ring.map( ( [ x, z ] ) => [ x, y, z ] ), ring.map( ( [ x, z ] ) => [ x, z ] ) );
		ring.forEach( ( p, i ) => {

			const q = ring[ ( i + 1 ) % ring.length ], len = Math.hypot( q[ 0 ] - p[ 0 ], q[ 1 ] - p[ 1 ] );
			B.polygon( [ [ q[ 0 ], area.level - FOOTING, q[ 1 ] ], [ p[ 0 ], area.level - FOOTING, p[ 1 ] ], [ p[ 0 ], y, p[ 1 ] ], [ q[ 0 ], y, q[ 1 ] ] ], [ [ 0, 0 ], [ len, 0 ], [ len, M.kerb + FOOTING ], [ 0, M.kerb + FOOTING ] ] );

		} );

	}

	// the courts' fences: posts, a rail along the top and the foot, and the mesh drawn as its uprights
	// (from a few metres off a mesh is its wires' shimmer and its frame)
	const courtFences = { runs: 0, triangles: 0 };
	for ( const f of site.courtFences ) for ( const [ a, b ] of f.runs ) {

		const l = Math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] ), t = [ ( b[ 0 ] - a[ 0 ] ) / l, ( b[ 1 ] - a[ 1 ] ) / l ], n = [ - t[ 1 ], t[ 0 ] ];
		const B = builder( a[ 0 ], a[ 1 ] ), before = B.triangles, y0 = Math.min( terrain.heightAt( ...a ), terrain.heightAt( ...b ) );
		const bar = ( s0, s1, w, z0, z1 ) => box( B, ( s, y, o ) => [ a[ 0 ] + t[ 0 ] * s + n[ 0 ] * o, y, a[ 1 ] + t[ 1 ] * s + n[ 1 ] * o ], s0, s1, - w / 2, w / 2, z0, z1 );
		B.paint( { color: lin( FENCE_STEEL ), rough: 0.5, metal: 0.7, surface: SURFACE.plain, seed: 0.2 } );
		for ( let k = 0, m = Math.max( 1, Math.round( l / COURT_FENCE.post ) ); k <= m; k ++ ) bar( l * k / m - 0.03, l * k / m + 0.03, 0.06, y0 - FOOTING, y0 + f.height );
		for ( const z of [ 0.1, f.height - 0.05 ] ) bar( 0, l, 0.04, y0 + z - 0.02, y0 + z + 0.02 );
		B.paint( { color: lin( FENCE_MESH ), rough: 0.6, metal: 0.5, surface: SURFACE.plain, seed: 0.2 } );
		for ( let s = COURT_FENCE.wire; s < l; s += COURT_FENCE.wire ) {

			const p = [ a[ 0 ] + t[ 0 ] * s, a[ 1 ] + t[ 1 ] * s ], h = COURT_FENCE.thread / 2;
			B.polygon( [ [ p[ 0 ] - t[ 0 ] * h, y0, p[ 1 ] - t[ 1 ] * h ], [ p[ 0 ] + t[ 0 ] * h, y0, p[ 1 ] + t[ 1 ] * h ], [ p[ 0 ] + t[ 0 ] * h, y0 + f.height, p[ 1 ] + t[ 1 ] * h ], [ p[ 0 ] - t[ 0 ] * h, y0 + f.height, p[ 1 ] - t[ 1 ] * h ] ], [ [ 0, 0 ], [ 1, 0 ], [ 1, 1 ], [ 0, 1 ] ] );

		}

		if ( colliders ) colliders.addBox( new Vector3( ( a[ 0 ] + b[ 0 ] ) / 2, y0 + f.height / 2, ( a[ 1 ] + b[ 1 ] ) / 2 ), new Vector3( WALL_HALF, f.height / 2, l / 2 ), Math.atan2( t[ 0 ], t[ 1 ] ), { tag: 'fence' } );
		courtFences.runs ++; courtFences.triangles += B.triangles - before;

	}

	const gate = models.kit.get( 'gate_yard' );
	for ( const g of site.fences.gates ) {

		const F = styleOf( g.plot );
		if ( ! F ) continue;
		const B = builder( g.x, g.z ), before = B.triangles, y = terrain.heightAt( g.x, g.z );
		// the piece's +z is the street's side
		const Z = [ g.out[ 0 ], 0, g.out[ 1 ] ], X = [ Z[ 2 ], 0, - Z[ 0 ] ];
		const paints = { ...KIT_PAINT, surround: F.surface === SURFACE.render ? F.paint : { color: lin( [ 198, 190, 172 ] ), rough: 0.92, surface: SURFACE.render, seed: F.paint.seed } };
		for ( const part of gate.parts ) B.paint( paints[ part.material ] ).stamp( part, X, [ 0, 1, 0 ], Z, [ g.x, y, g.z ] );
		fences.gates ++; fences.triangles += B.triangles - before;
		if ( colliders ) colliders.addBox( new Vector3( g.x, y + gate.h / 2, g.z ), new Vector3( 0.1, gate.h / 2, gate.w / 2 ), Math.atan2( g.along[ 0 ], g.along[ 1 ] ), { tag: 'fence' } );

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

	return { meshes, material, built, waiting, bridges, platforms: site.park.platforms.length, fences, pavements, marina, railway, courtFences, triangles };

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

	const F = frame( b ), surfaces = LANDMARKS.find( ( l ) => keyOf( l ) === b.landmark ).surfaces;
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

	const rnd = random( b.seed ), pick = ( list ) => list[ Math.floor( rnd() * list.length ) ];
	const F = frame( b ), seed = rnd();
	// ( every pick is made whether or not the survey then says otherwise: what is not surveyed of a
	// building must not change with what is )
	const lotStoreys = A.storeys[ 0 ] + Math.floor( rnd() * ( A.storeys[ 1 ] - A.storeys[ 0 ] + 1 ) ), storeys = b.seen.storeys || lotStoreys;
	const ground = Math.min( ...b.ring.map( ( [ x, z ] ) => terrain.heightAt( x, z ) ) ) - FOOTING;
	const floorY = b.floor + A.plinth, eaveY = floorY + storeys * A.storey;

	// ---- the building's own paint
	let lot = rnd() * A.walls.reduce( ( s, w ) => s + w[ 2 ], 0 );
	const [ wallSurface, wallColours ] = A.walls.find( ( w ) => ( lot -= w[ 2 ] ) < 0 ) || A.walls[ 0 ];
	const wallPicked = pick( wallColours );
	const wall = b.seen.walls ? { color: lin( b.seen.walls[ 1 ] ), rough: 0.92, surface: SURFACE[ b.seen.walls[ 0 ] ], seed } : { color: lin( wallPicked ), rough: 0.92, surface: wallSurface, seed };
	const trim = { color: lin( pick( A.trim ) ), rough: 0.9, surface: SURFACE.render, seed };
	const joinery = { color: lin( pick( A.joinery ) ), rough: 0.55, surface: SURFACE.plain, seed };
	// the roof as the survey saw it, or as the archetype has it where it was not seen (the pick is
	// made either way: what a building is otherwise must not turn on whether its roof was seen)
	const picked = pick( A.roof.cover[ 1 ] ), seen = b.seen.roof;
	const cover = { color: lin( seen || picked ), rough: 0.85, surface: seen ? coverSeen( seen ) : A.roof.cover[ 0 ], seed };
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
	const tan = Math.tan( ( b.seen.pitch || ( A.roof.tiled && cover.surface === SURFACE.tile ? A.roof.tiled : A.roof.pitch ) ) * Math.PI / 180 );
	const roofs = new Map( pieces.map( ( p ) => [ p,
		hosts.has( p ) ? leanTo( p, hosts.get( p ), { topY: eaveY - LEAN.drop, tan: Math.tan( LEAN.pitch * Math.PI / 180 ), lowest: floorY + LEAN.wall, eave: A.roof.eave / 2, verge: A.roof.verge } )
		: ( b.seen.form || A.roof.form ) === 'hip' && pieces.length === 1 ? hip( p, { eaveY, tan, eave: A.roof.eave } )
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
