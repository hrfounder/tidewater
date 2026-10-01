// The real-world terrain of the Slavonian region (regions/slavonia/TileTerrain.js) through the
// engine's terrain pipeline (TerrainGPU -> Terrain), rendered headless. Needs the exported core
// tiles in public/world/bosut/ (tools/geodata/tiles.py bosut core ...).
//   node test/world-slavonia.mjs [outDir] [--view=name] [--small]
import { readFileSync } from 'node:fs';
import { worldHarness, done } from './world-harness.mjs';
import { TileTerrain } from '../src/regions/slavonia/TileTerrain.js';
import { TerrainGPU } from '../src/world/TerrainGPU.js';
import { Terrain } from '../src/world/Terrain.js';
import { computeShoreField } from '../src/world/ShoreField.js';
import { Material } from '../src/engine/render/Material.js';

const out = process.argv[ 2 ] && ! process.argv[ 2 ].startsWith( '--' ) ? process.argv[ 2 ] : '/tmp';
const small = process.argv.includes( '--small' );
const dir = new URL( '../public/world/bosut/', import.meta.url );
const index = JSON.parse( readFileSync( new URL( 'index.json', dir ) ) );
let t = performance.now();
const data = await TileTerrain.load( { index, center: index.center, readTile: async ( f ) => {

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

// The patch is centred on Most Bosut, the road bridge between Rokovci (north) and Andrijaševci
// (south). x = east, z = south (m). The river runs roughly east to west here; the park with the
// fishing platforms is on the south bank east of the bridge, St Roch's church (Rokovci) 200 m north.
// The photo views stand where docs/slavonia/photos/bosut-* were taken (approximately).
const at = ( x, z, up ) => [ x, data.heightAt( x, z ) + up, z ];
const views = {
	aerial: { pos: [ 300, 420, 700 ], target: [ 0, 0, 0 ] },
	// bosut-winter-platforms-bridge.jpg: upstream of the bridge, looking west along the water to it
	photoBridge: { pos: at( 150, - 58, 1.7 ), target: [ 0, 1.5, - 4 ], fov: 60 },
	// bosut-spring-anglers-church-reflection.jpg: from the park bank across the water to the church
	photoChurch: { pos: at( 125, - 4, 1.6 ), target: [ 42, 12, - 196 ], fov: 60 },
};
const only = process.argv.find( ( a ) => a.startsWith( '--view=' ) );
for ( const [ k, v ] of Object.entries( views ) ) {

	if ( only && only.slice( 7 ) !== k ) continue;
	await H.shot( `${ out }/slavonia-terrain-${ k }.png`, v );

}

await done();
