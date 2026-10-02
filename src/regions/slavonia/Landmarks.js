import { BufferGeometry, Float32BufferAttribute, Color } from '../../engine/index.js';
import { loadGLB } from '../../engine/loaders/GLTF.js';
import { prepare, mat4 } from '../../world/boat/GeoKit.js';
import { PAT } from '../../game/GameMaterials.js';

// The landmarks of the block: buildings that are modelled from photographs (tools/blender/*.py, one
// script per model) instead of raised by rule like the houses. A landmark is found by the name its
// footprint carries in the map data, and stands on that footprint.
//
// A model's frame (the Blender scripts keep to it): metres, y up, the origin on the ground at the
// centre of the footprint's bounding rectangle, and its front — the face it shows the street —
// toward +z. Its materials are plain base colours, which become vertex colours here, so a landmark
// is drawn with the rest of the village in one mesh.
export const LANDMARKS = [
	{ name: 'Crkva Svetog Roka', model: 'models/slavonia/st-roch.glb' },
];

const key = ( name ) => ( name || '' ).toLowerCase();

// fetch the models of the landmarks this block has (called with the places, before anything is built)
export async function loadLandmarks( places, base ) {

	const models = new Map();
	if ( ! places ) return models;
	const present = new Set( ( places.buildings || [] ).map( ( b ) => key( b.name ) ) );
	await Promise.all( LANDMARKS.filter( ( l ) => present.has( key( l.name ) ) ).map( async ( l ) => {

		try {

			models.set( key( l.name ), await loadGLB( new URL( l.model, base ).href ) );

		} catch ( e ) {

			console.warn( `landmark model ${ l.model } failed to load: ${ l.name } falls back to the plain form`, e );

		}

	} ) );
	return models;

}

export function landmarkFor( models, building ) {

	return models ? models.get( key( building.name ) ) || null : null;

}

// How far a model's base strays outside a footprint ring when stood on it at `yaw`: the sum, over the
// base's vertices, of each one's distance outside the ring.
function misfit( base, ring, cx, cz, yaw ) {

	const c = Math.cos( yaw ), s = Math.sin( yaw );
	let sum = 0;
	for ( let i = 0; i < base.length; i += 2 ) {

		const x = cx + base[ i ] * c + base[ i + 1 ] * s, z = cz - base[ i ] * s + base[ i + 1 ] * c;
		let inside = false, d = Infinity;
		for ( let k = 0, j = ring.length - 1; k < ring.length; j = k ++ ) {

			const [ xi, zi ] = ring[ k ], [ xj, zj ] = ring[ j ];
			if ( ( zi > z ) !== ( zj > z ) && x < ( xj - xi ) * ( z - zi ) / ( zj - zi ) + xi ) inside = ! inside;
			const t = Math.max( 0, Math.min( 1, ( ( x - xj ) * ( xi - xj ) + ( z - zj ) * ( zi - zj ) ) / Math.max( 1e-9, ( xi - xj ) ** 2 + ( zi - zj ) ** 2 ) ) );
			d = Math.min( d, Math.hypot( x - xj - ( xi - xj ) * t, z - zj - ( zi - zj ) * t ) );

		}

		if ( ! inside ) sum += d;

	}

	return sum;

}

const BASE_HEIGHT = 0.7; // vertices below this are the model's base (its plinth)
const DECISIVE = 1.5; // one way round has to fit this many times better to overrule the street

// Stand a model on its footprint. `r` is the footprint's rectangle (Buildings.js minAreaRect, turned
// so that its -z end faces the nearest street) and `ring` the footprint itself. The model's front is
// +z, so facing the street is half a circle from the rectangle; but a footprint that is not
// symmetric end for end says which way round the building stands better than the nearest road does
// (a church at a junction has a lane behind it too), so when one way round fits the outline clearly
// better, that one is taken.
export function placeLandmark( parts, gltf, terrain, r, ring ) {

	const base = [];
	for ( const mesh of gltf.meshes ) for ( const prim of mesh ) {

		const a = prim.attributes.POSITION.array;
		for ( let i = 0; i < a.length; i += 3 ) if ( a[ i + 1 ] < BASE_HEIGHT ) base.push( a[ i ], a[ i + 2 ] );

	}

	let yaw = r.ang + Math.PI;
	const street = misfit( base, ring, r.cx, r.cz, yaw ), other = misfit( base, ring, r.cx, r.cz, r.ang );
	if ( other * DECISIVE < street ) yaw = r.ang;
	const matrix = mat4( r.cx, terrain.heightAt( r.cx, r.cz ), r.cz, 0, yaw, 0 );
	for ( const mesh of gltf.meshes ) for ( const prim of mesh ) {

		const pos = prim.attributes.POSITION;
		if ( ! pos ) continue;
		const g = new BufferGeometry();
		g.setAttribute( 'position', new Float32BufferAttribute( Float32Array.from( pos.array ), 3 ) );
		const nor = prim.attributes.NORMAL;
		if ( nor ) g.setAttribute( 'normal', new Float32BufferAttribute( Float32Array.from( nor.array ), 3 ) );
		if ( prim.indices ) g.setIndex( Array.from( prim.indices ) );
		const m = gltf.materials[ prim.material ] || {};
		const pbr = m.pbrMetallicRoughness || {};
		const c = pbr.baseColorFactor || [ 1, 1, 1, 1 ];
		parts.push( prepare( g, {
			// glTF base colours are linear, as the vertex colours are
			color: new Color( c[ 0 ], c[ 1 ], c[ 2 ] ),
			rough: pbr.roughnessFactor ?? 1, metal: pbr.metallicFactor ?? 1,
			pattern: PAT.plain, matrix,
		} ) );

	}

}
