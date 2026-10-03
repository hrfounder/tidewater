// What the game already has on the ground of a block, for tools/geodata/paved.py to keep off:
// the buildings, the landmarks' grounds (their paving is modelled), the roads, and what was
// surveyed by hand beside them (Survey.js BESIDE, AREAS, COURTS, PATHS). Written to
// cache/<area>/plan.json in the patch's metres (x east, z south of the block's centre).
//
//   node tools/geodata/plan.mjs
import { writeFileSync } from 'node:fs';
import { load, readJSON } from '../checks/load.mjs';

const { site } = await load();
const ring = ( r ) => r.map( ( p ) => [ + p[ 0 ].toFixed( 2 ), + p[ 1 ].toFixed( 2 ) ] );
const plan = {
	center: readJSON( 'index.json' ).center,
	buildings: site.buildings.list.map( ( b ) => ring( b.ring ) ),
	grounds: site.buildings.list.filter( ( b ) => b.grounds ).map( ( b ) => ring( b.grounds.ring ) ),
	roads: site.roads.roads.filter( ( r ) => ! r.bridge ).map( ( r ) => ( { index: r.index, name: r.name, paved: r.surface !== 'unpaved', class: r.class, half: r.half, pts: ring( r.pts ) } ) ),
	surveyed: [ ...site.beside, ...site.areas ].map( ( a ) => ring( a.ring ) ),
};
const out = new URL( '../geodata/cache/bosut/plan.json', import.meta.url );
writeFileSync( out, JSON.stringify( plan ) );
console.log( `${ plan.buildings.length } buildings, ${ plan.grounds.length } grounds, ${ plan.roads.length } roads, ${ plan.surveyed.length } surveyed -> ${ out.pathname }` );
