// What stands round a named building of the Site, in that building's own frame: for laying out a
// landmark's model against its neighbours and its streets.
//   node tools/checks/around.mjs "<name>" [metres]
// x is to the right as seen from the street it faces, y back from the middle of its footprint.
import { load } from './load.mjs';
const { site } = await load();
const name = process.argv[ 2 ], R = + process.argv[ 3 ] || 45;
const b = site.buildings.list.find( ( b ) => ( b.name || '' ).toLowerCase() === name.toLowerCase() );
const c = Math.cos( b.yaw ), s = Math.sin( b.yaw );
const m = ( x, z ) => { const dx = x - b.x, dz = z - b.z, u = dx * c - dz * s, v = dx * s + dz * c; return [ u, - v ]; };
console.log( 'building', b.x.toFixed( 2 ), b.z.toFixed( 2 ), 'yaw', ( b.yaw * 180 / Math.PI ).toFixed( 1 ), 'kind', b.kind, 'faces', b.frontage && b.frontage.road.name, 'floor', b.floor.toFixed( 2 ) );
console.log( 'pieces', JSON.stringify( b.pieces.map( ( p ) => ( { u: + p.u.toFixed( 2 ), v: + p.v.toFixed( 2 ), hu: + p.hu.toFixed( 2 ), hv: + p.hv.toFixed( 2 ) } ) ) ) );
console.log( 'ring (model x,y):', b.ring.map( ( p ) => m( ...p ).map( ( v ) => v.toFixed( 1 ) ).join( ',' ) ).join( ' | ' ) );
for ( const o of site.buildings.near( b.x, b.z, R ) ) if ( o !== b ) console.log( 'nb', o.kind, o.area.toFixed( 0 ), o.ring.map( ( p ) => m( ...p ).map( ( v ) => v.toFixed( 1 ) ).join( ',' ) ).join( ' | ' ) );
for ( const r of site.roads.roads ) { const near = r.pts.filter( ( p ) => Math.hypot( p[ 0 ] - b.x, p[ 1 ] - b.z ) < R ); if ( near.length ) console.log( 'road', r.class, r.name, 'half', r.half.toFixed( 2 ), near.filter( ( _, i ) => i % 3 === 0 ).map( ( p ) => m( p[ 0 ], p[ 1 ] ).map( ( v ) => v.toFixed( 1 ) ).join( ',' ) ).join( ' ' ) ); }
