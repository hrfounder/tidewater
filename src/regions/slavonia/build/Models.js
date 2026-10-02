import { parseGLB } from '../../../engine/loaders/GLTF.js';
import { LANDMARKS } from '../Landmarks.js';

// The models the village is built with: the kit of pieces every house is fitted with
// (tools/blender/kit.py) and the landmarks that are modelled whole (tools/blender/*.py, one script
// each). Both are plain geometry with a material per part; the village's builder stamps them into
// its meshes in its own paint.
//
// A model's frame, as the Blender scripts export it: metres, y up, its front toward +z.
//
//   kit        Map( name -> { w, h, depth, parts } ): the opening a piece needs in its wall
//   landmarks  Map( name, lower case -> { parts } )
//   part       { material (its name in the model), color [ r, g, b ] linear, rough, metal,
//                positions, normals, indices }

const KIT = 'models/slavonia/kit.glb';

// read( path ) resolves to the ArrayBuffer of a file under public/
export async function loadModels( read ) {

	const kitFile = parseGLB( await read( KIT ) );
	const kit = new Map();
	kitFile.nodes.forEach( ( node, i ) => {

		if ( node.mesh === undefined ) return;
		kit.set( node.name, { ...kitFile.json.nodes[ i ].extras, parts: partsOf( kitFile, node.mesh ) } );

	} );
	const landmarks = new Map();
	await Promise.all( LANDMARKS.map( async ( l ) => {

		const file = parseGLB( await read( l.model ) );
		landmarks.set( l.name.toLowerCase(), { parts: file.meshes.flatMap( ( _, m ) => partsOf( file, m ) ) } );

	} ) );
	return { kit, landmarks };

}

function partsOf( file, mesh ) {

	return file.meshes[ mesh ].map( ( prim ) => {

		const m = file.materials[ prim.material ] || {}, pbr = m.pbrMetallicRoughness || {};
		const c = pbr.baseColorFactor || [ 1, 1, 1, 1 ];
		return {
			material: m.name || '', color: [ c[ 0 ], c[ 1 ], c[ 2 ] ], rough: pbr.roughnessFactor ?? 1, metal: pbr.metallicFactor ?? 1,
			positions: prim.attributes.POSITION.array, normals: prim.attributes.NORMAL.array, indices: prim.indices,
		};

	} );

}
