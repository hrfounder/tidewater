import { Mesh } from '../../engine/index.js';
import { prepare, mergePrepared, box, mat4 } from '../../world/boat/GeoKit.js';
import { createPropMaterial, PAT } from '../../game/GameMaterials.js';

// Anglers' fishing platforms along the Bosut (docs/slavonia/photos: bosut-winter-platforms-bridge,
// bosut-spring-anglers-church-reflection): a low plank deck at the water's edge on posts driven
// into the bed, with a board running up the bank. Every 12-20 m along both banks near the
// bridge; each one a little different (size, height, lean, wear).
//
// sites: [ { from, to, side } ] stretches of the main water line in metres east of the patch
// centre (x), side +1 = the right bank looking downstream, -1 = the left.

const SITES = [
	{ from: 30, to: 280, side: 1 },
	{ from: 40, to: 260, side: - 1 },
	{ from: - 260, to: - 40, side: 1 },
];

// deterministic pseudo random
function rng( seed ) {

	let s = seed >>> 0;
	return () => ( ( s = ( s * 1664525 + 1013904223 ) >>> 0 ) / 4294967296 );

}

export function buildPlatforms( { terrain, scene } ) {

	const line = terrain.lines && terrain.lines.filter( ( l ) => ! l.dry ).sort( ( a, b ) => b.width - a.width )[ 0 ];
	if ( ! line ) return null;
	const [ cE, cN ] = terrain.center;
	const pts = line.pts.map( ( [ e, n, lvl ] ) => ( { x: e - cE, z: cN - n, y: lvl - terrain.datum } ) );
	const parts = [];
	const R = rng( 7177 );
	const wood = 0x8a7458, woodDark = 0x5e4e3c, woodPale = 0xa89478;
	let count = 0;
	const last = {}; // the last platform on each side
	for ( let i = 1; i < pts.length - 1; i ++ ) {

		const p = pts[ i ];
		const site = SITES.find( ( s ) => p.x >= s.from && p.x <= s.to );
		if ( ! site ) continue;
		// spacing: walk on until the next platform is due
		const key = site.side;
		const gap = 12 + R() * 8;
		if ( last[ key ] !== undefined && Math.hypot( p.x - last[ key ].x, p.z - last[ key ].z ) < gap ) continue;
		if ( R() < 0.15 ) { last[ key ] = p; continue; } // a gap in the row
		last[ key ] = p;
		const q = pts[ i + 1 ], o = pts[ i - 1 ];
		const tx = q.x - o.x, tz = q.z - o.z, tl = Math.hypot( tx, tz );
		// bank normal (toward the bank on this side)
		const nx = - tz / tl * key, nz = tx / tl * key;
		const level = p.y;
		// A platform is a plank deck standing out over the water on four posts, low enough to land a
		// fish from, with a plank walk back to the bank: 2-3 m square, deck a knee above the water
		// (docs/slavonia/photos/bosut-winter-platforms-bridge.jpg).
		const deckW = 2.0 + R() * 1.0, deckD = 2.0 + R() * 0.9;
		const top = level + 0.4 + R() * 0.2;
		// the deck stands off the bank, over open water
		const edge = line.width / 2;
		const cx = p.x + nx * ( edge - deckD * 0.75 ), cz = p.z + nz * ( edge - deckD * 0.75 );
		const yaw = Math.atan2( nx, nz );
		const lean = ( R() - 0.5 ) * 0.05;
		const tone = R() < 0.3 ? woodDark : R() < 0.5 ? woodPale : wood;

		// deck boards, laid along the bank with a finger of gap between them
		const boards = Math.max( 6, Math.round( deckD / 0.19 ) );
		for ( let b = 0; b < boards; b ++ ) {

			if ( R() < 0.03 ) continue; // a board gone
			const v = ( b + 0.5 ) / boards - 0.5;
			const bx = cx - Math.sin( yaw ) * v * deckD, bz = cz - Math.cos( yaw ) * v * deckD;
			parts.push( prepare( box( deckW, 0.035, 0.16 ), { color: tone, rough: 0.85, pattern: PAT.woodX, matrix: mat4( bx, top + ( R() - 0.5 ) * 0.012, bz, lean, yaw, ( R() - 0.5 ) * 0.02 ) } ) );

		}

		// two bearers under the boards, and a post at each corner driven into the bed
		for ( const v of [ - 0.42, 0.42 ] ) {

			const bx = cx - Math.sin( yaw ) * v * deckD, bz = cz - Math.cos( yaw ) * v * deckD;
			parts.push( prepare( box( deckW * 1.02, 0.09, 0.07 ), { color: woodDark, rough: 0.9, pattern: PAT.woodX, matrix: mat4( bx, top - 0.06, bz, 0, yaw, 0 ) } ) );
			for ( const u of [ - 0.44, 0.44 ] ) {

				const px = bx + Math.cos( yaw ) * u * deckW, pz = bz - Math.sin( yaw ) * u * deckW;
				const bed = Math.min( terrain.heightAt( px, pz ), top - 0.5 ) - 0.5;
				const len = top + 0.02 - bed;
				parts.push( prepare( box( 0.1, len, 0.1 ), { color: woodDark, rough: 0.9, pattern: PAT.wood, matrix: mat4( px, bed + len / 2, pz, ( R() - 0.5 ) * 0.03, yaw, ( R() - 0.5 ) * 0.03 ) } ) );

			}

		}

		// a rail along the water side of about half of them: two uprights and a top bar
		if ( R() < 0.5 ) {

			const rv = - 0.46 * deckD;
			const rx = cx - Math.sin( yaw ) * rv, rz = cz - Math.cos( yaw ) * rv;
			const rh = 0.85 + R() * 0.2;
			for ( const u of [ - 0.42, 0.42 ] ) {

				const px = rx + Math.cos( yaw ) * u * deckW, pz = rz - Math.sin( yaw ) * u * deckW;
				parts.push( prepare( box( 0.07, rh, 0.07 ), { color: tone, rough: 0.88, pattern: PAT.wood, matrix: mat4( px, top + rh / 2, pz, 0, yaw, 0 ) } ) );

			}

			parts.push( prepare( box( deckW * 0.92, 0.06, 0.06 ), { color: tone, rough: 0.88, pattern: PAT.woodX, matrix: mat4( rx, top + rh, rz, 0, yaw, 0 ) } ) );

		}

		// the plank walk from the back of the deck up the bank, two boards wide
		const bx0 = cx + nx * deckD * 0.5, bz0 = cz + nz * deckD * 0.5;
		let run = 0.5;
		while ( run < 7 && terrain.heightAt( bx0 + nx * run, bz0 + nz * run ) < top + 0.35 ) run += 0.25;
		const ex = bx0 + nx * run, ez = bz0 + nz * run, ey = terrain.heightAt( ex, ez ) + 0.05;
		const walkLen = Math.hypot( run, ey - top ), pitch = Math.atan2( ey - top, run );
		for ( const u of [ - 0.11, 0.11 ] ) {

			const wx = ( bx0 + ex ) / 2 + Math.cos( yaw ) * u, wz = ( bz0 + ez ) / 2 - Math.sin( yaw ) * u;
			parts.push( prepare( box( 0.2, 0.035, walkLen ), { color: tone, rough: 0.88, pattern: PAT.woodZ, matrix: mat4( wx, ( top + ey ) / 2, wz, - pitch, yaw, 0, 1, 1, 1, 'YXZ' ) } ) );

		}

		count ++;

	}

	if ( ! parts.length ) return null;
	const mesh = new Mesh( mergePrepared( parts ), createPropMaterial( 'fishingPlatforms' ) );
	mesh.name = 'fishingPlatforms';
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	mesh.staticVelocity = true;
	scene.add( mesh );
	mesh.userData.count = count;
	return mesh;

}
