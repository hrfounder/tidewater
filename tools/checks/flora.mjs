// Numbers on what is planted (docs/slavonia/DESIGN.md, section 7).
//   node tools/checks/flora.mjs
import { load, check, finish } from './load.mjs';
import { plant, HABITATS } from '../../src/regions/slavonia/flora/Habitats.js';
import { PLANTS } from '../../src/regions/slavonia/flora/Species.js';
import { FREE, YARD, WATER, ROAD, BUILDING } from '../../src/regions/slavonia/site/Occupancy.js';

const { site, terrain: T } = await load();
const t = performance.now();
const { records, counts } = plant( { site, terrain: T } );
console.log( `     planted in ${ ( performance.now() - t ).toFixed( 0 ) } ms: ${ JSON.stringify( counts ) }` );
console.log( `     by shape: ${ Object.entries( records ).map( ( [ k, v ] ) => `${ k } ${ v.length }` ).join( ', ' ) }` );
for ( const [ name, n ] of Object.entries( counts ) ) check( n > 0, `habitat ${ name } has plants`, `${ n }` );

// ---- nothing stands on ground that is taken
const trees = [ ...records.willow, ...records.poplar, ...records.oak ];
{

	const who = ( list ) => list.reduce( ( m, r ) => { const o = site.occupancy.at( r.x, r.z ); m[ o ] = ( m[ o ] || 0 ) + 1; return m; }, {} );
	const tw = who( trees ), rw = who( records.reed );
	check( ! tw[ ROAD ] && ! tw[ BUILDING ] && ! tw[ WATER ], 'trees on a road, in a building or in the water', `${ ( tw[ ROAD ] || 0 ) + ( tw[ BUILDING ] || 0 ) + ( tw[ WATER ] || 0 ) } of ${ trees.length } (free ground ${ tw[ FREE ] || 0 }, yards ${ tw[ YARD ] || 0 })` );
	check( ! rw[ ROAD ] && ! rw[ BUILDING ], 'reeds on a road or in a building', `${ ( rw[ ROAD ] || 0 ) + ( rw[ BUILDING ] || 0 ) } of ${ records.reed.length } (in the water ${ rw[ WATER ] || 0 }, on the bank ${ rw[ FREE ] || 0 })` );
	// a trunk keeps clear of walls and carriageways by what its habitat asks
	const least = Math.min( ...Object.values( HABITATS ).filter( ( h ) => PLANTS[ h.plant ] ).map( ( h ) => h.clear ) );
	const close = trees.filter( ( r ) => site.occupancy.within( r.x, r.z, least ) > YARD );
	check( close.length === 0, `trees within ${ least } m of a road, a building or the water`, `${ close.length }${ close.length ? ': ' + close.slice( 0, 5 ).map( ( r ) => `${ r.x.toFixed( 1 ) },${ r.z.toFixed( 1 ) }` ).join( '; ' ) : '' }` );

}

// ---- every plant stands on the ground
{

	let worst = 0;
	for ( const r of [ ...trees, ...records.reed ] ) worst = Math.max( worst, Math.abs( r.y - T.heightAt( r.x, r.z ) ) );
	check( worst < 1e-6, 'plants off the height of the ground under them', `at most ${ worst.toFixed( 4 ) } m` );
	const deep = records.reed.filter( ( r ) => r.y < HABITATS.reeds.height[ 0 ] || r.y > HABITATS.reeds.height[ 1 ] );
	check( deep.length === 0, 'reeds outside their margin of the water', `${ deep.length }` );

}

// ---- where each plant is drawn, not only where it is planted: the foot of what the materials put on
// screen. A clump (the plant material, vegetation/VegNodes.js vegPlantDeform) is drawn about a
// point H above its record; a tree (the canopy material) from its record, stretched by l.
{

	const { buildReedClump, REED_HEIGHT } = await import( '../../src/regions/slavonia/flora/Species.js' );
	const P = buildReedClump( 7 ).geometry.attributes.position;
	let lowest = Infinity;
	for ( let i = 0; i < P.count; i ++ ) lowest = Math.min( lowest, P.getY( i ) );
	let high = 0, deep = 0;
	for ( const r of records.reed ) {

		const foot = r.y + r.H + lowest * r.s - T.heightAt( r.x, r.z );
		if ( foot > high ) high = foot;
		if ( - foot > deep ) deep = - foot;

	}

	check( high <= 0, 'reed clumps drawn with their foot above the ground', `the worst stands ${ high.toFixed( 2 ) } m over it; blades start ${ ( - lowest ).toFixed( 2 ) } m under a clump's origin, the deepest foot ${ deep.toFixed( 2 ) } m under the ground; a clump is ${ REED_HEIGHT } m tall` );
	const squat = trees.filter( ( r ) => ! ( r.l > 0.5 && r.H > 1 ) );
	check( squat.length === 0, 'trees whose record draws them flat (no stretch or no height)', `${ squat.length }` );

}

// ---- trees are spread, not piled: the nearest neighbour of each
{

	const cell = 8, grid = new Map();
	for ( const r of trees ) { const k = Math.floor( r.x / cell ) + ',' + Math.floor( r.z / cell ); if ( ! grid.has( k ) ) grid.set( k, [] ); grid.get( k ).push( r ); }
	let least = Infinity;
	for ( const r of trees ) {

		const i = Math.floor( r.x / cell ), j = Math.floor( r.z / cell );
		for ( let b = j - 1; b <= j + 1; b ++ ) for ( let a = i - 1; a <= i + 1; a ++ ) for ( const o of grid.get( a + ',' + b ) || [] ) if ( o !== r ) least = Math.min( least, Math.hypot( o.x - r.x, o.z - r.z ) );

	}

	check( least >= 2 * Math.min( ...Object.values( HABITATS ).filter( ( h ) => PLANTS[ h.plant ] ).map( ( h ) => h.clear ) ), 'the two trees that stand closest', `${ least.toFixed( 2 ) } m apart` );

}

finish();
