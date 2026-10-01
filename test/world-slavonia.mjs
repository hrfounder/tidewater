// The real-world terrain of the Slavonian region (regions/slavonia/TileTerrain.js) through the
// engine's terrain pipeline (TerrainGPU -> Terrain), rendered headless. Needs the exported core
// tiles in public/world/bosut/ (tools/geodata/tiles.py bosut core ...).
//   node test/world-slavonia.mjs [outDir] [--view=name] [--small]
// The views are the fixed progress views; tools/progress/shoot.sh files them into the timelapse.
import { readFileSync } from 'node:fs';
import { worldHarness, done } from './world-harness.mjs';
import { TileTerrain } from '../src/regions/slavonia/TileTerrain.js';
import { TerrainGPU } from '../src/world/TerrainGPU.js';
import { Terrain } from '../src/world/Terrain.js';
import { computeShoreField } from '../src/world/ShoreField.js';
import { Material } from '../src/engine/render/Material.js';
import { PROGRESS_VIEWS } from '../src/regions/slavonia/views.js';

const out = process.argv[ 2 ] && ! process.argv[ 2 ].startsWith( '--' ) ? process.argv[ 2 ] : '/tmp';
const small = process.argv.includes( '--small' );
const dir = new URL( '../public/world/bosut/', import.meta.url );
const index = JSON.parse( readFileSync( new URL( 'index.json', dir ) ) );
let t = performance.now();
const data = await TileTerrain.load( { index, center: index.center, readFile: async ( f ) => {

	const b = readFileSync( new URL( f, dir ) );
	return b.buffer.slice( b.byteOffset, b.byteOffset + b.byteLength );

} } );
console.log( 'TileTerrain', ( performance.now() - t ).toFixed( 0 ), 'ms; datum', data.datum.toFixed( 2 ), 'm a.s.l.; heights',
	Math.min( ...data.mmLevels.at( - 1 ).min ).toFixed( 1 ), '..', Math.max( ...data.mmLevels.at( - 1 ).max ).toFixed( 1 ), 'm' );
let wet = 0;
for ( const w of data.water ) if ( w === w ) wet ++;
console.log( 'water cover', ( wet / data.water.length * 100 ).toFixed( 2 ), '%' );

const H = await worldHarness( { sun: [ 0.5, 0.42, 0.45 ], ...( small ? { width: 960, height: 540 } : {} ) } );
const shore = computeShoreField( data, { res: 512, swellDir: [ 0, 1 ] } );
const gpu = new TerrainGPU( data, shore );
const terrain = new Terrain( { scene: H.scene, terrainData: data, terrainGPU: gpu } );
terrain.material.appliesHillShadow = true;
H.before.push( ( cam ) => terrain.update( cam ) );
// stand-in for the water (the game's water surface is not in this harness): a flat, glossy,
// dark olive plane at the patch's water level
const water = new H.E.Mesh( new H.E.PlaneGeometry( data.size, data.size ).rotateX( - Math.PI / 2 ), new Material( { name: 'water', color: 0x2c3524, roughness: 0.08 } ) );
H.scene.add( water );

// the fixed progress views (regions/slavonia/views.js); `ground` heights are above the ground there
const views = {};
for ( const [ k, v ] of Object.entries( PROGRESS_VIEWS ) ) {

	const [ x, y, z ] = v.pos;
	views[ k ] = { ...v, pos: [ x, v.ground ? data.heightAt( x, z ) + y : y, z ] };

}

const only = process.argv.find( ( a ) => a.startsWith( '--view=' ) );
for ( const [ k, v ] of Object.entries( views ) ) {

	if ( only && only.slice( 7 ) !== k ) continue;
	await H.shot( `${ out }/slavonia-terrain-${ k }.png`, v );

}

await done();
