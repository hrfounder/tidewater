// The Slavonian world (regions/slavonia/world.js) through the engine's terrain pipeline
// (TerrainGPU -> Terrain) and whatever the region stands on it, rendered headless. Needs the block's
// map files in public/world/bosut/ (tools/geodata).
//   node test/world-slavonia.mjs [outDir] [--view=name] [--small] [--look=name:x,y,z:tx,ty,tz[:fov] ...]
// The views are the fixed progress views (regions/slavonia/views.js).
import { tmpdir } from 'node:os';
import { worldHarness, done } from './world-harness.mjs';
import { load } from '../tools/checks/load.mjs';
import { TerrainGPU } from '../src/world/TerrainGPU.js';
import { Terrain } from '../src/world/Terrain.js';
import { computeShoreField } from '../src/world/ShoreField.js';
import { Material } from '../src/engine/render/Material.js';
import { PROGRESS_VIEWS } from '../src/regions/slavonia/views.js';
import { GROUND_SURFACE, TERRAIN_EXTENT, buildPlaces } from '../src/regions/slavonia/world.js';

const out = process.argv[ 2 ] && ! process.argv[ 2 ].startsWith( '--' ) ? process.argv[ 2 ] : tmpdir();
const small = process.argv.includes( '--small' );
let t = performance.now();
const world = await load(), { terrain: data, site } = world;
console.log( 'world', ( performance.now() - t ).toFixed( 0 ), 'ms; datum', data.datum.toFixed( 2 ), 'm a.s.l.' );

const H = await worldHarness( { sun: [ 0.5, 0.42, 0.45 ], ...( small ? { width: 960, height: 540 } : {} ) } );
t = performance.now();
const shore = computeShoreField( data, { res: 512, swellDir: [ 0, 1 ] } );
const gpu = new TerrainGPU( data, shore );
console.log( 'terrain maps', ( performance.now() - t ).toFixed( 0 ), 'ms' );
const terrain = new Terrain( { scene: H.scene, terrainData: data, terrainGPU: gpu, surface: GROUND_SURFACE, extent: TERRAIN_EXTENT } );
terrain.material.appliesHillShadow = true;
H.before.push( ( cam ) => terrain.update( cam ) );
// stand-in for the water (the game's water surface is not in this harness): a flat, glossy,
// dark olive plane at the water level
const water = new H.E.Mesh( new H.E.PlaneGeometry( 16384, 16384 ).rotateX( - Math.PI / 2 ), new Material( { name: 'water', color: 0x2c3524, roughness: 0.08 } ) );
H.scene.add( water );
const places = buildPlaces( world, { scene: H.scene, colliders: null } );
H.before.push( ( cam ) => places.flora.update( 1 / 60, cam ) );
console.log( 'flora', JSON.stringify( places.flora.counts ) );
console.log( 'village', JSON.stringify( places.village.built ), places.village.triangles, 'triangles in', places.village.meshes.length, 'meshes' );

// --look=name:x,y,z:tx,ty,tz[:fov] (any number of them): one-off views, y above the ground there
const looks = process.argv.filter( ( a ) => a.startsWith( '--look=' ) ).map( ( a ) => a.slice( 7 ).split( ':' ) );
for ( const [ name, pos, target, fov ] of looks ) {

	const [ x, y, z ] = pos.split( ',' ).map( Number );
	await H.shot( `${ out }/look-${ name }.png`, { pos: [ x, data.heightAt( x, z ) + y, z ], target: target.split( ',' ).map( Number ), fov: Number( fov ) || 55 } );

}

if ( looks.length ) await done();

// `ground` heights are above the ground there
const only = process.argv.find( ( a ) => a.startsWith( '--view=' ) );
for ( const [ k, v ] of Object.entries( PROGRESS_VIEWS ) ) {

	if ( only && only.slice( 7 ) !== k ) continue;
	const [ x, y, z ] = v.pos;
	await H.shot( `${ out }/slavonia-${ k }.png`, { ...v, pos: [ x, v.ground ? data.heightAt( x, z ) + y : y, z ] } );

}

await done();
