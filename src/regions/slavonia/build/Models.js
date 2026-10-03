import { parseGLB } from '../../../engine/loaders/GLTF.js';
import { LANDMARKS, keyOf } from '../Landmarks.js';

// The models the village is built with: the kit of pieces every house is fitted with
// (tools/blender/kit.py) and the landmarks that are modelled whole (tools/blender/*.py, one script
// each). Both are plain geometry with a material per part; the village's builder stamps them into
// its meshes in its own paint.
//
// A model's frame, as the Blender scripts export it: metres, y up, its front toward +z.
//
//   kit        Map( name -> { w, h, depth, parts } ): the opening a piece needs in its wall
//   landmarks  Map( key ( Landmarks.js keyOf ) -> { parts, plan } )
//   plan       what a landmark's model says of itself on the ground (its script's PLAN), or null for
//              a model that stands on the mapped outline as it is. In the model's frame, [ x, z ]:
//                outline  the ring of its walls
//                boxes    [ x0, x1, z0, z1, top ]: what cannot be walked through, and how high
//                yard     the ring of its grounds
//                walls    [ x, z, x, z, height ]: the fence and the walls round the grounds
//                paved    the rings of its paving
//                trees    [ x, z, height ]: the trees that stand in the grounds
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
		const extras = file.json.nodes.map( ( n ) => n.extras ).find( ( e ) => e && e.outline );
		landmarks.set( keyOf( l ), { parts: file.meshes.flatMap( ( _, m ) => partsOf( file, m ) ), plan: extras ? planOf( extras ) : null } );

	} ) );
	return { kit, landmarks };

}

// the flat lists a model's script writes, as rings and records
function planOf( e ) {

	const ring = ( flat ) => Array.from( { length: flat.length / 2 }, ( _, i ) => [ flat[ i * 2 ], flat[ i * 2 + 1 ] ] );
	const fives = ( flat ) => Array.from( { length: flat.length / 5 }, ( _, i ) => flat.slice( i * 5, i * 5 + 5 ) );
	const paved = [];
	for ( let i = 0; i < e.paved.length; i += 1 + e.paved[ i ] * 2 ) paved.push( ring( e.paved.slice( i + 1, i + 1 + e.paved[ i ] * 2 ) ) );
	const trees = Array.from( { length: e.trees.length / 3 }, ( _, i ) => e.trees.slice( i * 3, i * 3 + 3 ) );
	return { outline: ring( e.outline ), boxes: fives( e.boxes ), yard: ring( e.yard ), walls: fives( e.walls ), paved, trees };

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
