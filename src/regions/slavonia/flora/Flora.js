import * as THREE from '../../../engine/index.js';
import { VegType } from '../../../world/vegetation/InstanceLOD.js';
import { GrassField } from '../../../world/vegetation/GrassField.js';
import { buildBroadleafTree } from '../../../world/vegetation/PlantGeometry.js';
import { createPlantLeafMaterial, createCanopyMaterial, createCanopyBakeMaterials, uCanopyNear } from '../../../world/vegetation/VegMaterials.js';
import { ImpostorAtlas, buildImpostorQuad, axisSphere } from '../../../world/vegetation/Impostors.js';
import { LeafAtlas } from '../../../world/vegetation/LeafTextures.js';
import { uCamPos, uGustOffset } from '../../../world/vegetation/VegNodes.js';
import { G } from '../../../core/Globals.js';
import { SHAPES, VARIANTS, TREE_NEAR, variantOf, variantWGSL, LEAF_STAGE, farLeafModule, buildReedClump } from './Species.js';
import { plant, REED_REACH, TREE_REACH } from './Habitats.js';
import { FREE, YARD } from '../site/Occupancy.js';
import { fillPolygon } from '../site/Raster.js';

// The plants of the Slavonian world, drawn: what flora/Habitats.js planted, as instances of the
// shapes of flora/Species.js. Trees are geometry near the camera and octahedral impostors beyond,
// baked from the same crowns, as on the island; past those the ground shader's own canopy tone
// carries the woods to the horizon (GroundSurface.js). Reeds are cards that fade out with distance.
// And the grass: tall meadow on the banks and the open ground, short in the village.

// the last metres over which a reed bed and a far crown fade out
const REED_FADE = [ REED_REACH - 20, REED_REACH ], TREE_FADE = [ TREE_REACH - 200, TREE_REACH ];
// metres between the samples of the grass mask
const MASK_TEXEL = 2;
// grass starts this far above the water: below it the bank is mud and reeds (m)
const GRASS_FLOOR = 0.15;
// Within this of a building or a street the grass is kept short (m): a village mows its verges, its
// yards and the ground round its church; the meadow begins where the houses end.
const MOWN = 30;

export class Flora {

	// world: what loadWorld gave ( site, terrain )
	constructor( { site, terrain }, { scene } ) {

		this.group = new THREE.Group();
		this.group.name = 'SlavoniaFlora';
		this.group.matrixAutoUpdate = false;

		const t0 = performance.now();
		const { records, counts } = plant( { site, terrain } );
		this.counts = counts;

		const leafMat = createPlantLeafMaterial();
		this.leafAtlas = new LeafAtlas();
		const canopyMat = createCanopyMaterial( this.leafAtlas, { leaf: LEAF_STAGE } );
		this.materials = [ leafMat, canopyMat ];

		this.types = [];
		const add = ( t ) => {

			this.types.push( t );
			for ( const m of t.meshes ) this.group.add( m );
			return t;

		};

		// Each shape is grown VARIANTS times from different seeds: one crown repeated down a bank reads
		// as wallpaper. An impostor atlas holds two groups of crowns.
		const shapes = Object.entries( SHAPES ).map( ( [ name, s ] ) => ( { name, geos: s.seeds.map( ( seed ) => buildBroadleafTree( s.spec, seed ).geometry ) } ) );
		uCanopyNear.value.set( TREE_NEAR, TREE_NEAR );
		this.atlases = [];
		for ( let k = 0; k < shapes.length; k += 2 ) {

			const pair = [ shapes[ k ], shapes[ k + 1 ] || shapes[ k ] ];
			const atlas = new ImpostorAtlas( pair.map( ( s ) => ( { variants: s.geos, ...axisSphere( s.geos[ 0 ] ) } ) ), createCanopyBakeMaterials( this.leafAtlas ) );
			this.atlases.push( atlas );
			pair.forEach( ( s, group ) => {

				if ( group === 1 && pair[ 1 ] === pair[ 0 ] ) return;
				const far = atlas.createMaterial( {
					isGroup1: () => ( group ? 'true' : 'false' ),
					variantOf: variantWGSL,
					colorOf: ( { seed, cr, leaf, bright } ) => `slavoniaFarLeaf( ${ seed }, ${ cr }, ${ leaf }, ${ bright } )`,
					nearDist: () => TREE_NEAR.toFixed( 1 ),
					modules: [ farLeafModule ],
				} );
				// the variant a tree is rides on its seed, the same for its geometry and its impostor
				for ( let v = 0; v < VARIANTS; v ++ ) {

					const part = records[ s.name ].filter( ( r ) => variantOf( r.seed ) === v );
					if ( part.length ) add( new VegType( `${ s.name }${ v }`, part, {
						nearRange: TREE_NEAR, margin: 12, sortNear: true, sortFar: true, farRefresh: 16,
						near: [ { geometry: s.geos[ v ], material: canopyMat, castShadow: true, name: `flora-${ s.name }-${ v }` } ],
						far: { parts: [ { geometry: buildImpostorQuad(), material: far, name: `flora-${ s.name }-far-${ v }` } ], fade: TREE_FADE },
					} ) );

				}

			} );

		}

		if ( records.reed.length ) add( new VegType( 'reeds', records.reed, {
			fade: REED_FADE, margin: 10, sortNear: true,
			near: [ { geometry: buildReedClump( 7 ).geometry, material: leafMat, castShadow: false, name: 'flora-reed' } ],
		} ) );

		// alpha-tested foliage after the opaque ground
		for ( const t of this.types ) for ( const m of t.meshes ) m.renderOrder = 1;

		this.grass = new GrassField( { terrain, mask: meadowMask( site, terrain ) } );
		for ( const m of this.grass.meshes ) this.group.add( m );

		this.group.updateMatrixWorld( true );
		if ( scene ) scene.add( this.group );
		this._camPos = new THREE.Vector3();
		this.timings = { total: performance.now() - t0 };

	}

	update( dt, camera ) {

		if ( ! this.leafAtlas.baked ) {

			this.leafAtlas.bake();
			for ( const a of this.atlases ) a.bake( true );

		}

		camera.updateMatrixWorld();
		const p = camera.getWorldPosition( this._camPos );
		uCamPos.value.copy( p );
		// the travelling gust field, integrated as the island's vegetation does it, so a change of
		// wind never makes the crowns jump
		const wd = G.windDir.value;
		const speed = 0.7 * G.windSpeed.value + 1.5;
		uGustOffset.value.x += wd.x * speed * dt;
		uGustOffset.value.y += wd.y * speed * dt;

		for ( const t of this.types ) t.update( p );
		this.grass.update( camera );

	}

}

// Where the meadow grows, as the rgba8 mask the grass field takes: on ground nobody has taken, less
// where it is worked field or wood floor, and not where the grass is kept short (the yards, the
// built-up land cover, the village's own ground, a park).
function meadowMask( site, terrain ) {

	const res = Math.round( terrain.size / MASK_TEXEL ), step = MASK_TEXEL / terrain.texel;
	const data = new Uint8Array( res * res * 4 );
	// how near the village is, on the mask's own grid: 1 at a building or a street, falling to 0 at
	// MOWN from it (the distance grows a texel at a time, two sweeps of a chamfer transform)
	const far = new Float32Array( res * res ).fill( MOWN );
	for ( const b of site.buildings.list ) far[ Math.floor( ( b.z - terrain.origin ) / MASK_TEXEL ) * res + Math.floor( ( b.x - terrain.origin ) / MASK_TEXEL ) ] = 0;
	for ( const r of site.roads.roads ) if ( r.street ) for ( const p of r.pts ) {

		const i = Math.floor( ( p[ 0 ] - terrain.origin ) / MASK_TEXEL ), j = Math.floor( ( p[ 1 ] - terrain.origin ) / MASK_TEXEL );
		if ( i >= 0 && j >= 0 && i < res && j < res ) far[ j * res + i ] = 0;

	}

	// a park's lawn is mown like the village's own ground
	for ( const o of site.open ) fillPolygon( { res, texel: MASK_TEXEL, ox: terrain.origin, oz: terrain.origin }, o.ring, ( k ) => { far[ k ] = 0; } );
	const relax = ( k, o, w ) => { if ( far[ o ] + w < far[ k ] ) far[ k ] = far[ o ] + w; };
	const D = MASK_TEXEL * Math.SQRT2;
	for ( let j = 1; j < res - 1; j ++ ) for ( let i = 1; i < res - 1; i ++ ) { const k = j * res + i; relax( k, k - 1, MASK_TEXEL ); relax( k, k - res, MASK_TEXEL ); relax( k, k - res - 1, D ); relax( k, k - res + 1, D ); }
	for ( let j = res - 2; j > 0; j -- ) for ( let i = res - 2; i > 0; i -- ) { const k = j * res + i; relax( k, k + 1, MASK_TEXEL ); relax( k, k + res, MASK_TEXEL ); relax( k, k + res + 1, D ); relax( k, k + res - 1, D ); }
	for ( let j = 0; j < res; j ++ ) for ( let i = 0; i < res; i ++ ) {

		// the terrain texel at the middle of this mask sample
		const k = Math.floor( ( j + 0.5 ) * step ) * terrain.res + Math.floor( ( i + 0.5 ) * step );
		const who = site.occupancy.of[ k ];
		if ( terrain.heights[ k ] < GRASS_FLOOR || ( who !== FREE && who !== YARD ) ) continue;
		const crop = terrain.cropland[ k ] / 255, built = terrain.built[ k ] / 255, forest = terrain.forest[ k ] / 255;
		const open = ( 1 - crop ) * ( 1 - forest * 0.75 );
		if ( open < 0.1 ) continue;
		const short = Math.max( who === YARD ? 1 : built, 1 - far[ j * res + i ] / MOWN );
		// the grass field's channels (vegetation/GrassField.js): r dune tufts, g tall meadow grass,
		// b seed heads standing over it, a creeper. Mown ground carries none: it is the ground's own
		// green.
		const o = ( j * res + i ) * 4;
		data[ o + 1 ] = Math.round( 255 * open * ( 1 - short ) );
		data[ o + 2 ] = Math.round( 70 * open * ( 1 - forest ) * ( 1 - short ) );

	}

	return { data, res };

}
