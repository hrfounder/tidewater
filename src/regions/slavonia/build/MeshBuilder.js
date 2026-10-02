import { BufferGeometry, BufferAttribute, Mesh } from '../../../engine/index.js';

// One mesh under construction, in the village material's layout: position, normal, uv (metres on
// the surface), color (linear albedo) and aux ( roughness, metalness, surface pattern, seed ). What is
// added takes the paint that is current (`paint`). Buffers grow as they fill.
export class MeshBuilder {

	constructor() {

		this.count = 0;
		this.triangles = 0;
		this.position = new Float32Array( 3 * 1024 );
		this.normal = new Float32Array( 3 * 1024 );
		this.uv = new Float32Array( 2 * 1024 );
		this.color = new Float32Array( 3 * 1024 );
		this.aux = new Float32Array( 4 * 1024 );
		this.index = new Uint32Array( 3 * 2048 );
		this._paint = [ 1, 1, 1, 0.9, 0, 0, 0 ];

	}

	// color: [ r, g, b ] linear; surface: a pattern of VillageMaterial's SURFACE; seed: 0..1
	paint( { color, rough = 0.9, metal = 0, surface = 0, seed = 0 } ) {

		this._paint = [ color[ 0 ], color[ 1 ], color[ 2 ], rough, metal, surface, seed ];
		return this;

	}

	vertex( x, y, z, nx, ny, nz, u = 0, v = 0 ) {

		const i = this.count ++;
		if ( i * 3 >= this.position.length ) for ( const k of [ 'position', 'normal', 'uv', 'color', 'aux' ] ) {

			const grown = new Float32Array( this[ k ].length * 2 );
			grown.set( this[ k ] );
			this[ k ] = grown;

		}

		const p = this._paint;
		this.position[ i * 3 ] = x; this.position[ i * 3 + 1 ] = y; this.position[ i * 3 + 2 ] = z;
		this.normal[ i * 3 ] = nx; this.normal[ i * 3 + 1 ] = ny; this.normal[ i * 3 + 2 ] = nz;
		this.uv[ i * 2 ] = u; this.uv[ i * 2 + 1 ] = v;
		this.color[ i * 3 ] = p[ 0 ]; this.color[ i * 3 + 1 ] = p[ 1 ]; this.color[ i * 3 + 2 ] = p[ 2 ];
		this.aux[ i * 4 ] = p[ 3 ]; this.aux[ i * 4 + 1 ] = p[ 4 ]; this.aux[ i * 4 + 2 ] = p[ 5 ]; this.aux[ i * 4 + 3 ] = p[ 6 ];
		return i;

	}

	triangle( a, b, c ) {

		const t = this.triangles ++;
		if ( t * 3 >= this.index.length ) {

			const grown = new Uint32Array( this.index.length * 2 );
			grown.set( this.index );
			this.index = grown;

		}

		this.index[ t * 3 ] = a; this.index[ t * 3 + 1 ] = b; this.index[ t * 3 + 2 ] = c;

	}

	// A flat polygon: points [ x, y, z ] in order, uvs [ u, v ] beside them. Its normal is taken from
	// the points' own winding (Newell), so a polygon wound either way is lit the same from its two sides.
	polygon( points, uvs ) {

		let nx = 0, ny = 0, nz = 0;
		for ( let i = 0; i < points.length; i ++ ) {

			const a = points[ i ], b = points[ ( i + 1 ) % points.length ];
			nx += ( a[ 1 ] - b[ 1 ] ) * ( a[ 2 ] + b[ 2 ] ); ny += ( a[ 2 ] - b[ 2 ] ) * ( a[ 0 ] + b[ 0 ] ); nz += ( a[ 0 ] - b[ 0 ] ) * ( a[ 1 ] + b[ 1 ] );

		}

		const l = Math.hypot( nx, ny, nz ) || 1;
		const first = this.count;
		points.forEach( ( p, i ) => this.vertex( p[ 0 ], p[ 1 ], p[ 2 ], nx / l, ny / l, nz / l, uvs[ i ][ 0 ], uvs[ i ][ 1 ] ) );
		for ( let i = 1; i + 1 < points.length; i ++ ) this.triangle( first, first + i, first + i + 1 );

	}

	// A part of a model (positions, normals, indices as flat arrays in its own frame) set down by a
	// 3x4 placement: columns X, Y, Z and the origin, each [ x, y, z ] in the world.
	stamp( part, X, Y, Z, O ) {

		const first = this.count, P = part.positions, N = part.normals;
		for ( let i = 0; i < P.length; i += 3 ) {

			const x = P[ i ], y = P[ i + 1 ], z = P[ i + 2 ], a = N[ i ], b = N[ i + 1 ], c = N[ i + 2 ];
			this.vertex(
				O[ 0 ] + X[ 0 ] * x + Y[ 0 ] * y + Z[ 0 ] * z, O[ 1 ] + X[ 1 ] * x + Y[ 1 ] * y + Z[ 1 ] * z, O[ 2 ] + X[ 2 ] * x + Y[ 2 ] * y + Z[ 2 ] * z,
				X[ 0 ] * a + Y[ 0 ] * b + Z[ 0 ] * c, X[ 1 ] * a + Y[ 1 ] * b + Z[ 1 ] * c, X[ 2 ] * a + Y[ 2 ] * b + Z[ 2 ] * c,
				// on a part: across it and up it, in its own metres
				x, y );

		}

		for ( let i = 0; i < part.indices.length; i += 3 ) this.triangle( first + part.indices[ i ], first + part.indices[ i + 1 ], first + part.indices[ i + 2 ] );

	}

	mesh( material, name ) {

		const g = new BufferGeometry();
		g.setAttribute( 'position', new BufferAttribute( this.position.slice( 0, this.count * 3 ), 3 ) );
		g.setAttribute( 'normal', new BufferAttribute( this.normal.slice( 0, this.count * 3 ), 3 ) );
		g.setAttribute( 'uv', new BufferAttribute( this.uv.slice( 0, this.count * 2 ), 2 ) );
		g.setAttribute( 'color', new BufferAttribute( this.color.slice( 0, this.count * 3 ), 3 ) );
		g.setAttribute( 'aux', new BufferAttribute( this.aux.slice( 0, this.count * 4 ), 4 ) );
		g.setIndex( new BufferAttribute( this.index.slice( 0, this.triangles * 3 ), 1 ) );
		g.computeBoundingBox();
		g.computeBoundingSphere();
		const mesh = new Mesh( g, material );
		mesh.name = name;
		mesh.castShadow = mesh.receiveShadow = true;
		mesh.staticVelocity = true;
		return mesh;

	}

}
