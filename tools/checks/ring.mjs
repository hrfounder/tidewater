// The buildings of a ring round a point, for the survey by eye: each with its index (as on a survey
// sheet), where it stands, what the rule makes of it and what was seen of it so far.
//   node tools/checks/ring.mjs <x> <z> <metres>
import { load } from './load.mjs';
import { archetypeOf, ARCHETYPES } from '../../src/regions/slavonia/build/Archetypes.js';
const { site } = await load();
const [ x, z, r ] = process.argv.slice( 2 ).map( Number );
const names = new Map( Object.entries( ARCHETYPES ).map( ( [ k, v ] ) => [ v, k ] ) );
const near = site.buildings.near( x, z, r ).sort( ( a, b ) => Math.hypot( a.x - x, a.z - z ) - Math.hypot( b.x - x, b.z - z ) );
for ( const b of near ) {

	const main = b.pieces[ 0 ], seen = Object.entries( b.seen ).filter( ( [ k, v ] ) => v && k !== 'at' && k !== 'source' ).map( ( [ k, v ] ) => `${ k } ${ JSON.stringify( v ) }` ).join( ', ' );
	console.log( `${ String( b.index ).padStart( 5 ) }  at ${ b.x.toFixed( 0 ).padStart( 5 ) },${ b.z.toFixed( 0 ).padStart( 5 ) }  ${ Math.hypot( b.x - x, b.z - z ).toFixed( 0 ).padStart( 3 ) } m  ${ ( names.get( archetypeOf( b ) ) || b.kind ).padEnd( 10 ) } ${ b.area.toFixed( 0 ).padStart( 4 ) } m2  ${ ( 2 * main.hu ).toFixed( 0 ) }x${ ( 2 * main.hv ).toFixed( 0 ) }  faces ${ b.frontage ? b.frontage.road.name || b.frontage.road.class : '-' }  | ${ seen }` );

}
