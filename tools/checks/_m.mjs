import { load } from './load.mjs';
import { toWorld } from '../../src/regions/slavonia/site/Buildings.js';
const { site } = await load();
const b = site.buildings.list.find( ( b ) => b.landmark && b.landmark.includes( 'school' ) );
for ( const a of process.argv.slice( 2 ) ) { const [ X, Y ] = a.split( ',' ).map( Number ); const [ x, z ] = toWorld( b, X, - Y ); console.log( a, '->', x.toFixed( 1 ), z.toFixed( 1 ) ); }
const r = site.roads.nearest( ...toWorld( b, - 40, 10 ), 15 );
console.log( 'road', r.road.index, r.road.class, r.road.name, r.road.surface, 'half', r.road.half, 'd', r.d.toFixed( 1 ) );
for ( const t of site.areas.filter( ( a ) => a.of === 'track' ) ) console.log( 'track level', t.level.toFixed( 2 ), JSON.stringify( t.ring ) );
