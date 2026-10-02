// Numbers on what is built on the Site (docs/slavonia/DESIGN.md, section 7).
//   node tools/checks/village.mjs
import { load, check, finish } from './load.mjs';
import { buildVillage } from '../../src/regions/slavonia/build/Village.js';
import { Colliders } from '../../src/world/Colliders.js';
import { archetypeOf, ARCHETYPES } from '../../src/regions/slavonia/build/Archetypes.js';

const world = await load(), { site, terrain: T } = world;
const boxes = [];
const t = performance.now();
const village = buildVillage( world, { scene: null, colliders: { addBox: ( center, half, rotY, opts = {} ) => boxes.push( { center, half, rotY, opts } ) } } );
console.log( `     built in ${ ( performance.now() - t ).toFixed( 0 ) } ms: ${ JSON.stringify( village.built ) }; ${ village.triangles } triangles in ${ village.meshes.length } meshes` );

const names = new Map( Object.entries( ARCHETYPES ).map( ( [ k, v ] ) => [ v, k ] ) ), by = {};
for ( const b of site.buildings.list ) { const k = names.get( archetypeOf( b ) ) || b.kind; by[ k ] = ( by[ k ] || 0 ) + 1; }
console.log( `     by archetype: ${ JSON.stringify( by ) }` );
check( village.waiting.every( ( b ) => b.kind === 'church' ), 'buildings left unbuilt', `${ village.waiting.length }${ village.waiting.length ? ': ' + village.waiting.map( ( b ) => `${ b.kind } ${ b.name || '' }` ).join( '; ' ) + ' (waits for its model)' : '' }` );

// ---- the bridges: each deck starts and ends on its road's nodes, and clears the water
for ( const br of site.roads.bridges ) {

	const P = br.main.pts, a = site.roads.nodes[ br.main.a ], b = site.roads.nodes[ br.main.b ];
	const ends = Math.max( Math.abs( P[ 0 ][ 2 ] - a.y ), Math.abs( P.at( - 1 )[ 2 ] - b.y ) );
	// the least room under the deck over the water
	let room = Infinity;
	for ( const p of P ) if ( T.heightAt( p[ 0 ], p[ 1 ] ) < 0 ) room = Math.min( room, p[ 2 ] );
	const made = village.bridges.find( ( m ) => m.length === br.main.length );
	check( ends < 0.02, `bridge ${ br.main.name || br.main.class }: deck against the road at its two ends`, `${ ( ends * 100 ).toFixed( 1 ) } cm; ${ made.length.toFixed( 1 ) } m long, ${ made.width.toFixed( 1 ) } m wide, ${ made.spans } spans, ${ made.panels } railing panels, ${ made.lamps } lamps; ${ br.members.length } lanes beside it; deck top ${ room === Infinity ? 'not over water' : room.toFixed( 2 ) + ' m over the water at its lowest' }` );

}

// ---- the geometry is sound: finite, and every mesh stands between the ground and a church's height
{

	let bad = 0, low = Infinity, high = - Infinity, degenerate = 0;
	for ( const m of village.meshes ) {

		const P = m.geometry.attributes.position.array, I = m.geometry.index.array;
		for ( let i = 0; i < P.length; i ++ ) if ( ! Number.isFinite( P[ i ] ) ) bad ++;
		for ( let i = 1; i < P.length; i += 3 ) { if ( P[ i ] < low ) low = P[ i ]; if ( P[ i ] > high ) high = P[ i ]; }
		for ( let i = 0; i < I.length; i += 3 ) {

			const a = I[ i ] * 3, b = I[ i + 1 ] * 3, c = I[ i + 2 ] * 3;
			const ux = P[ b ] - P[ a ], uy = P[ b + 1 ] - P[ a + 1 ], uz = P[ b + 2 ] - P[ a + 2 ], vx = P[ c ] - P[ a ], vy = P[ c + 1 ] - P[ a + 1 ], vz = P[ c + 2 ] - P[ a + 2 ];
			if ( Math.hypot( uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx ) < 1e-9 ) degenerate ++;

		}

	}

	check( bad === 0, 'coordinates that are not numbers', `${ bad }` );
	// ( the lowest is a bridge pier's footing under the river bed, the highest a church's cross )
	check( low > - 5 && high < 40, 'heights of what is built, against the water', `${ low.toFixed( 2 ) } to ${ high.toFixed( 2 ) } m` );
	console.log( `     triangles with no area: ${ degenerate } (${ ( degenerate / village.triangles * 100 ).toFixed( 2 ) } %)` );

}

// ---- what the player cannot walk through: every piece of every building that was built
{

	const pieces = site.buildings.list.filter( ( b ) => ! village.waiting.includes( b ) ).reduce( ( n, b ) => n + b.pieces.length, 0 );
	const walls = boxes.filter( ( b ) => b.opts.tag === 'building' );
	check( walls.length === pieces, 'colliders for the pieces of the buildings', `${ walls.length } boxes for ${ pieces } pieces; ${ boxes.filter( ( b ) => b.opts.walkable ).length } walkable boxes on the bridges` );
	// a box reaches from under the ground to above head height
	const short = walls.filter( ( b ) => b.center.y + b.half.y - T.heightAt( b.center.x, b.center.z ) < 2 );
	check( short.length === 0, 'colliders lower than a person', `${ short.length }` );

}

// ---- a walk across each bridge: the game's own collision world carries a walker at the deck's level
{

	const real = new Colliders();
	buildVillage( world, { scene: null, colliders: real } );
	for ( const br of site.roads.bridges ) {

		let worst = 0;
		for ( const p of br.main.pts ) worst = Math.max( worst, Math.abs( real.groundHeightAt( p[ 0 ], p[ 1 ], p[ 2 ] + 1 ) - p[ 2 ] ) );
		check( worst < 0.05, `bridge ${ br.main.name || br.main.class }: the ground a walker finds along its middle`, `within ${ ( worst * 100 ).toFixed( 1 ) } cm of the deck` );

	}

}

finish();
