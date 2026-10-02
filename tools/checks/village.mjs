// Numbers on what is built on the Site (docs/slavonia/DESIGN.md, section 7).
//   node tools/checks/village.mjs
import { load, check, finish } from './load.mjs';
import { buildVillage } from '../../src/regions/slavonia/build/Village.js';
import { Colliders } from '../../src/world/Colliders.js';
import { insideBuilding } from '../../src/regions/slavonia/site/Buildings.js';
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
	if ( br.main.half >= 1.5 ) check( made.walks[ 0 ] >= 1.4 && made.walks[ 1 ] >= 1.4, `bridge ${ br.main.name || br.main.class }: a walk on each side of the carriageway`, `${ made.walks[ 0 ].toFixed( 2 ) } m on the left, ${ made.walks[ 1 ].toFixed( 2 ) } m on the right` );
	check( ends < 0.02, `bridge ${ br.main.name || br.main.class }: deck against the road at its two ends`, `${ ( ends * 100 ).toFixed( 1 ) } cm; ${ made.length.toFixed( 1 ) } m long, ${ made.width.toFixed( 1 ) } m wide, ${ made.spans } spans, ${ made.panels } railing panels, ${ made.lamps } lamps; ${ br.members.length } lanes beside it; deck top ${ room === Infinity ? 'not over water' : room.toFixed( 2 ) + ' m over the water at its lowest' }` );

}

// ---- the anglers' platforms: each at the waterline, its front over water and its back on the bank
{

	const deck = world.models.kit.get( 'platform' ), P = site.park.platforms;
	const off = P.filter( ( p ) => Math.abs( T.heightAt( p.x, p.z ) ) > 0.15 );
	const dry = P.filter( ( p ) => T.heightAt( p.x + p.toWater[ 0 ] * deck.out, p.z + p.toWater[ 1 ] * deck.out ) >= 0 );
	const afloat = P.filter( ( p ) => T.heightAt( p.x - p.toWater[ 0 ] * deck.back, p.z - p.toWater[ 1 ] * deck.back ) < 0 );
	check( P.length > 20 && ! off.length && ! dry.length && ! afloat.length, 'anglers\' platforms on the waterline', `${ P.length }; ${ off.length } off the waterline, ${ dry.length } with their front on dry land, ${ afloat.length } with their back in the water` );
	const park = site.park;
	console.log( `     the player starts at ${ park.start.x.toFixed( 0 ) },${ park.start.z.toFixed( 0 ) } on ground ${ T.heightAt( park.start.x, park.start.z ).toFixed( 2 ) } m over the water; the boat lies in ${ ( - T.heightAt( park.boat.x, park.boat.z ) ).toFixed( 2 ) } m of water; stalls at ${ park.stand.x.toFixed( 0 ) },${ park.stand.z.toFixed( 0 ) } and ${ park.chandlery.x.toFixed( 0 ) },${ park.chandlery.z.toFixed( 0 ) }` );

}

// ---- what floats and what stands over the water
{

	// a pontoon and its fingers lie in water deep enough to float them; a deck has water under it
	let shallow = Infinity;
	for ( const m of site.marinas ) for ( let k = 0; k <= 20; k ++ ) shallow = Math.min( shallow, - T.heightAt( m.from[ 0 ] + ( m.to[ 0 ] - m.from[ 0 ] ) * k / 20, m.from[ 1 ] + ( m.to[ 1 ] - m.from[ 1 ] ) * k / 20 ) );
	const dry = site.decks.filter( ( d ) => ! d.ring.some( ( [ x, z ] ) => T.heightAt( x, z ) < 0 ) );
	const walk = boxes.filter( ( b ) => b.opts.tag === 'marina' && b.opts.walkable ).length;
	check( shallow > 0.4 && ! dry.length && village.marina.gangways === site.marinas.length, 'the marina afloat, its gangway landed, the deck over the water', `${ village.marina.pontoons } pontoon with ${ village.marina.fingers } fingers in at least ${ shallow.toFixed( 2 ) } m of water, ${ village.marina.gangways } gangway, ${ village.marina.decks } deck (${ dry.length } with no corner over water), ${ village.marina.boats } boats moored; ${ walk } boxes to walk on` );
	// every moored boat lies in water that floats it, clear of the pontoon, the fingers and the deck
	const hulls = boxes.filter( ( b ) => b.opts.tag === 'boat' );
	const aground = hulls.filter( ( b ) => T.heightAt( b.center.x, b.center.z ) > - 0.3 );
	check( hulls.length === village.marina.boats && ! aground.length, 'moored boats afloat', `${ hulls.length } hulls, ${ aground.length } in less than 0.3 m of water` );

}

// ---- what stands about: every prop on dry ground, clear of the buildings
{

	const props = boxes.filter( ( b ) => b.opts.tag === 'prop' );
	const wet = site.props.filter( ( p ) => T.heightAt( ...p.at ) < 0.2 ), into = site.props.filter( ( p ) => site.buildings.near( p.at[ 0 ], p.at[ 1 ], 30 ).some( ( b ) => insideBuilding( b, p.at[ 0 ], p.at[ 1 ], 0.3 ) ) );
	check( props.length === site.props.length && ! wet.length && ! into.length, 'benches, lamps and the gym', `${ site.props.length } props, ${ props.length } built; ${ wet.length } in the water, ${ into.length } in a building` );

}

// ---- the fences
{

	const F = village.fences, FB = 150000;
	check( F.triangles < FB, 'triangles in the fences and gates of the block', `${ F.triangles } (budget ${ FB }): ${ F.panels } panels, ${ F.gates } gates on ${ site.plots.length } plots` );
	// no panel runs through a building or over a carriageway
	const through = site.fences.panels.filter( ( p ) => site.buildings.near( p.a[ 0 ], p.a[ 1 ], 30 ).some( ( b ) => insideBuilding( b, ( p.a[ 0 ] + p.b[ 0 ] ) / 2, ( p.a[ 1 ] + p.b[ 1 ] ) / 2, - 0.3 ) ) );
	const onRoad = site.fences.panels.filter( ( p ) => { const r = site.roads.nearest( ( p.a[ 0 ] + p.b[ 0 ] ) / 2, ( p.a[ 1 ] + p.b[ 1 ] ) / 2, 8 ); return r && r.d < r.road.half; } );
	check( ! through.length && ! onRoad.length, 'fence panels through a building or on a carriageway', `${ through.length } and ${ onRoad.length }` );

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
