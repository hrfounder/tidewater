import { InstancedMesh, Matrix4, DynamicDrawUsage } from '../../../engine/index.js';
import { MeshBuilder } from './MeshBuilder.js';
import { SURFACE } from './VillageMaterial.js';

// What floats on the water and shows its current (docs/slavonia/DESIGN.md, section 6): rafts of
// duckweed and fallen leaves, carried along by the Site's surface current. The Bosut is slow and
// green with duckweed in summer; a raft crosses a metre in eight seconds where the river runs and
// lies still in a backwater, and that is how an angler reads the water.
//
// The rafts are kept round the camera only (nobody sees a leaf at a hundred metres): one that drifts
// out of reach, or runs aground, is set down again somewhere on the water within reach.
//
//   reach   how far from the camera the rafts are kept (m)
//   count   how many rafts of each kind
//   float   the least water a raft floats in (m)
//   over    how far a raft lies over the water's plane: the ripples' height (m)
//   grow    seconds a raft takes to appear where it is set down
//   edge    the share of the reach beyond which a raft shrinks away
//   spin    how fast a raft turns, at most (radians a second)
//   tries   places tried for a raft that is set down, before it waits for the next frame
const DRIFT = { reach: 45, count: 260, float: 0.25, over: 0.03, grow: 3, edge: 0.85, spin: 0.08, tries: 6 };

const lin = ( c ) => c.map( ( v ) => Math.pow( v / 255, 2.2 ) );
// by eye: duckweed's yellow-green; a willow's leaf gone yellow, a poplar's gone brown; a twig
const DUCKWEED = [ [ 124, 158, 52 ], [ 104, 146, 48 ], [ 142, 168, 60 ] ];
const LEAVES = [ [ 176, 158, 70 ], [ 150, 122, 62 ], [ 120, 92, 58 ] ];
const TWIG = [ 78, 62, 48 ];

// a repeatable stream of numbers in 0..1 from a seed (mulberry32)
function random( seed ) {

	let a = seed >>> 0;
	return () => {

		a = a + 0x6D2B79F5 | 0;
		let t = Math.imul( a ^ ( a >>> 15 ), 1 | a );
		t = t + Math.imul( t ^ ( t >>> 7 ), 61 | t ) ^ t;
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;

	};

}

// The kinds of raft, each a flat piece about its own middle: a mat of duckweed (fronds drawn as
// six-sided flecks, far larger than a frond is: a mat of them is what one sees), and a few fallen
// leaves with a twig.
const KINDS = {
	duckweed( rnd ) {

		const B = new MeshBuilder();
		for ( let k = 0; k < 22; k ++ ) {

			const a = rnd() * Math.PI * 2, d = 0.32 * Math.sqrt( rnd() ), r = 0.025 + 0.03 * rnd(), turn = rnd() * Math.PI;
			B.paint( { color: lin( DUCKWEED[ Math.floor( rnd() * DUCKWEED.length ) ] ), rough: 0.6, surface: SURFACE.plain, seed: rnd() } );
			B.polygon( Array.from( { length: 6 }, ( _, i ) => [ Math.cos( a ) * d + Math.cos( turn + i * Math.PI / 3 ) * r, 0, Math.sin( a ) * d - Math.sin( turn + i * Math.PI / 3 ) * r ] ), Array.from( { length: 6 }, () => [ 0, 0 ] ) );

		}

		return B;

	},
	leaves( rnd ) {

		const B = new MeshBuilder();
		for ( let k = 0; k < 4; k ++ ) {

			// a leaf: a pointed oval, 9 to 13 cm long
			const a = rnd() * Math.PI * 2, d = 0.25 * Math.sqrt( rnd() ), l = 0.045 + 0.02 * rnd(), w = l * 0.38, t = rnd() * Math.PI * 2;
			const c = [ Math.cos( a ) * d, Math.sin( a ) * d ], u = [ Math.cos( t ), Math.sin( t ) ], n = [ - u[ 1 ], u[ 0 ] ];
			B.paint( { color: lin( LEAVES[ Math.floor( rnd() * LEAVES.length ) ] ), rough: 0.7, surface: SURFACE.plain, seed: rnd() } );
			B.polygon( [ [ l, 0 ], [ l * 0.3, - w ], [ - l * 0.5, - w * 0.8 ], [ - l, 0 ], [ - l * 0.5, w * 0.8 ], [ l * 0.3, w ] ].map( ( [ p, q ] ) => [ c[ 0 ] + u[ 0 ] * p + n[ 0 ] * q, 0, c[ 1 ] + u[ 1 ] * p + n[ 1 ] * q ] ), Array.from( { length: 6 }, () => [ 0, 0 ] ) );

		}

		// the twig they came down with
		const t = rnd() * Math.PI * 2, u = [ Math.cos( t ), Math.sin( t ) ], l = 0.16, w = 0.006;
		B.paint( { color: lin( TWIG ), rough: 0.9, surface: SURFACE.plain, seed: 0.5 } );
		B.polygon( [ [ - l, - w ], [ - l, w ], [ l, w ], [ l, - w ] ].map( ( [ p, q ] ) => [ u[ 0 ] * p - u[ 1 ] * q, 0, u[ 1 ] * p + u[ 0 ] * q ] ), Array.from( { length: 4 }, () => [ 0, 0 ] ) );
		return B;

	},
};

export class Drift {

	// world: { site, terrain } (world.js loadWorld); material: the village's (the rafts are in its layout)
	constructor( { site, terrain }, { scene, material } ) {

		this.terrain = terrain;
		this.rnd = random( 4711 );
		this.meshes = [];
		this.rafts = [];
		const { start } = site.park;
		for ( const kind of Object.keys( KINDS ) ) {

			const built = KINDS[ kind ]( this.rnd ).mesh( material, 'drift ' + kind );
			const mesh = new InstancedMesh( built.geometry, material, DRIFT.count );
			mesh.name = built.name;
			mesh.castShadow = false;
			mesh.receiveShadow = true;
			// ( the instances are everywhere round the camera: there is nothing to cull the mesh by )
			mesh.frustumCulled = false;
			mesh.instanceMatrix.setUsage( DynamicDrawUsage );
			if ( scene ) scene.add( mesh );
			this.meshes.push( mesh );
			for ( let i = 0; i < DRIFT.count; i ++ ) this.rafts.push( { mesh, i, x: 0, z: 0, turn: this.rnd() * Math.PI * 2, spin: ( this.rnd() * 2 - 1 ) * DRIFT.spin, age: DRIFT.grow, afloat: false } );

		}

		// before the first frame: round where the player starts
		this.matrix = new Matrix4();
		this.update( 0, { position: { x: start.x, z: start.z } } );

	}

	// the surface current at a point ( m/s, east and south ): the terrain's grid of it, the nearest sample
	flow( x, z, out ) {

		const F = this.terrain.flow, i = Math.floor( ( x - F.ox ) / F.texel ), j = Math.floor( ( z - F.oz ) / F.texel );
		if ( i < 0 || j < 0 || i >= F.res || j >= F.res ) { out[ 0 ] = out[ 1 ] = 0; return; }
		out[ 0 ] = F.data[ ( j * F.res + i ) * 2 ]; out[ 1 ] = F.data[ ( j * F.res + i ) * 2 + 1 ];

	}

	update( dt, camera ) {

		const cx = camera.position.x, cz = camera.position.z, T = this.terrain, v = [ 0, 0 ], m = this.matrix.elements;
		for ( const r of this.rafts ) {

			if ( r.afloat ) {

				this.flow( r.x, r.z, v );
				r.x += v[ 0 ] * dt; r.z += v[ 1 ] * dt; r.turn += r.spin * dt; r.age += dt;

			}

			let far = Math.hypot( r.x - cx, r.z - cz );
			if ( ! r.afloat || far > DRIFT.reach || - T.heightAt( r.x, r.z ) < DRIFT.float ) {

				// set down again: anywhere on the water within reach (evenly over the disc)
				r.afloat = false;
				for ( let k = 0; k < DRIFT.tries && ! r.afloat; k ++ ) {

					const a = this.rnd() * Math.PI * 2, d = DRIFT.reach * DRIFT.edge * Math.sqrt( this.rnd() ), x = cx + Math.cos( a ) * d, z = cz + Math.sin( a ) * d;
					if ( - T.heightAt( x, z ) < DRIFT.float ) continue;
					r.x = x; r.z = z; r.age = dt ? 0 : DRIFT.grow; r.afloat = true;
					far = d;

				}

			}

			// its size: grown since it was set down, gone by the edge of the reach
			const t = Math.min( 1, Math.max( 0, ( far / DRIFT.reach - DRIFT.edge ) / ( 1 - DRIFT.edge ) ) );
			const s = r.afloat ? Math.min( 1, r.age / DRIFT.grow ) * ( 1 - t * t * ( 3 - 2 * t ) ) : 0, c = Math.cos( r.turn ) * s, n = Math.sin( r.turn ) * s;
			m[ 0 ] = c; m[ 1 ] = 0; m[ 2 ] = - n; m[ 3 ] = 0;
			m[ 4 ] = 0; m[ 5 ] = s; m[ 6 ] = 0; m[ 7 ] = 0;
			m[ 8 ] = n; m[ 9 ] = 0; m[ 10 ] = c; m[ 11 ] = 0;
			m[ 12 ] = r.x; m[ 13 ] = DRIFT.over; m[ 14 ] = r.z; m[ 15 ] = 1;
			r.mesh.setMatrixAt( r.i, this.matrix );

		}

		for ( const mesh of this.meshes ) mesh.instanceMatrix.needsUpdate = true;

	}

	// how many rafts are afloat, and how fast the fastest of them drifts ( m/s )
	state() {

		const v = [ 0, 0 ];
		let afloat = 0, fastest = 0;
		for ( const r of this.rafts ) if ( r.afloat ) { afloat ++; this.flow( r.x, r.z, v ); fastest = Math.max( fastest, Math.hypot( v[ 0 ], v[ 1 ] ) ); }
		return { rafts: this.rafts.length, afloat, fastest };

	}

}
