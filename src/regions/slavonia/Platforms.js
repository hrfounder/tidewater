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
		const deckW = 1.2 + R() * 0.5, deckD = 1.3 + R() * 0.6;
		const top = level + 0.3 + R() * 0.25;
		// the deck reaches from the water's edge out over the water
		const edge = line.width / 2;
		const cx = p.x + nx * ( edge - deckD * 0.35 ), cz = p.z + nz * ( edge - deckD * 0.35 );
		const yaw = Math.atan2( nx, nz );
		const lean = ( R() - 0.5 ) * 0.06;
		const tone = R() < 0.3 ? woodDark : R() < 0.5 ? woodPale : wood;
		// deck boards (across the depth), with gaps
		const boards = Math.round( deckW / 0.16 );
		for ( let b = 0; b < boards; b ++ ) {

			if ( R() < 0.04 ) continue; // a missing board
			const u = ( b + 0.5 ) / boards - 0.5;
			const bx = cx + Math.cos( yaw ) * u * deckW, bz = cz - Math.sin( yaw ) * u * deckW;
			parts.push( prepare( box( 0.14, 0.03, deckD ), { color: tone, rough: 0.85, pattern: PAT.woodZ, matrix: mat4( bx, top + ( R() - 0.5 ) * 0.01, bz, lean, yaw, ( R() - 0.5 ) * 0.03 ) } ) );

		}

		// bearers under the boards and the posts at the corners, down to the bed
		for ( const v of [ - 0.4, 0.4 ] ) {

			const bx = cx - Math.sin( yaw ) * v * deckD, bz = cz - Math.cos( yaw ) * v * deckD;
			parts.push( prepare( box( deckW, 0.08, 0.06 ), { color: woodDark, rough: 0.9, pattern: PAT.woodX, matrix: mat4( bx, top - 0.055, bz, 0, yaw, 0 ) } ) );
			for ( const u of [ - 0.45, 0.45 ] ) {

				const px = bx + Math.cos( yaw ) * u * deckW, pz = bz - Math.sin( yaw ) * u * deckW;
				const bed = Math.min( terrain.heightAt( px, pz ), top - 0.3 ) - 0.4;
				const len = top + 0.15 - bed;
				parts.push( prepare( box( 0.08, len, 0.08 ), { color: woodDark, rough: 0.9, pattern: PAT.wood, matrix: mat4( px, bed + len / 2, pz, ( R() - 0.5 ) * 0.04, yaw, ( R() - 0.5 ) * 0.04 ) } ) );

			}

		}

		// a board up the bank from the back of the deck to where the bank reaches deck height + 0.6
		const bx0 = cx + nx * deckD * 0.5, bz0 = cz + nz * deckD * 0.5;
		let run = 0.5;
		while ( run < 4 && terrain.heightAt( bx0 + nx * run, bz0 + nz * run ) < top + 0.6 ) run += 0.25;
		const ex = bx0 + nx * run, ez = bz0 + nz * run, ey = terrain.heightAt( ex, ez ) + 0.04;
		const len = Math.hypot( run, ey - top ), pitch = Math.atan2( ey - top, run );
		parts.push( prepare( box( 0.32, 0.04, len ), { color: tone, rough: 0.88, pattern: PAT.woodZ, matrix: mat4( ( bx0 + ex ) / 2, ( top + ey ) / 2, ( bz0 + ez ) / 2, - pitch, yaw, 0, 1, 1, 1, 'YXZ' ) } ) );
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
