import { PLANTS, SHAPES, seedOf } from './Species.js';
import { FREE, YARD, WATER } from '../site/Occupancy.js';
import { reachOf, pointAt } from '../site/Roads.js';
import { plotCorners } from '../site/Plots.js';

// Where each plant grows. One entry per habitat; the planting below reads nothing else. A habitat is
// a ground (`on`) and conditions on it:
//
//   plant     what stands there: a kind of PLANTS, or 'reed'
//   spacing   metres between neighbours: the plants are spread evenly at about this distance, never
//             closer than three quarters of it, not dropped by chance
//   clear     metres of ground round its foot that the plant needs free of roads and buildings; two
//             trees stand no closer than their two clearances together
//   on        'margin'  the water's edge: `height` [ lowest, highest ] above the water (m)
//             'bank'    dry land within `reach` [ nearest, farthest ] metres of the waterline
//             'wood'    where the land cover is forest
//             'yard'    the plots of the village, behind the house line
//             'verge'   beside the roads `along` accepts, `off` metres out from the carriageway
//   stand     [ size of a stand in metres, share of the ground that carries one ]: the plant grows in
//             stands with gaps between, not in one unbroken belt
export const HABITATS = {
	reeds: { plant: 'reed', on: 'margin', height: [ - 0.9, 0.25 ], spacing: 0.9, clear: 0, stand: [ 18, 0.55 ] },
	bankWillows: { plant: 'willow', on: 'bank', reach: [ 0.5, 9 ], spacing: 13, clear: 2, stand: [ 60, 0.6 ] },
	floodplainWood: { plant: 'oak', on: 'wood', spacing: 7, clear: 2.5, stand: [ 40, 0.9 ] },
	yardFruit: { plant: 'plum', on: 'yard', spacing: 7, clear: 2, stand: [ 30, 0.6 ] },
	yardShade: { plant: 'lime', on: 'yard', spacing: 22, clear: 4, stand: [ 50, 0.5 ] },
	streetTrees: { plant: 'lime', on: 'verge', along: ( r ) => r.street, off: 3.2, spacing: 14, clear: 1.5, stand: [ 120, 0.6 ] },
	trackPoplars: { plant: 'poplar', on: 'verge', along: ( r ) => r.class === 'track', off: 2.5, spacing: 9, clear: 1.2, stand: [ 220, 0.3 ] },
};

// a reed bed fades out with distance sooner than this (m): flora/Flora.js draws them to here
export const REED_REACH = 75;
// trees are drawn (as impostors) out to here (m)
export const TREE_REACH = 2800;
// the side of the squares the patch is searched in for ground a habitat grows on (m)
const SEARCH = 8;

// a repeatable stream of numbers in 0..1 (mulberry32)
function random( seed ) {

	let a = seed >>> 0;
	return () => {

		a = ( a + 0x6d2b79f5 ) >>> 0;
		let t = Math.imul( a ^ ( a >>> 15 ), a | 1 );
		t ^= t + Math.imul( t ^ ( t >>> 7 ), t | 61 );
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;

	};

}

// smooth value noise in 0..1 over the ground, one value per `size` metres
function stands( size, salt ) {

	const at = ( i, j ) => {

		let h = ( i * 374761393 + j * 668265263 + salt * 2147483647 ) | 0;
		h = Math.imul( h ^ ( h >>> 13 ), 1274126177 );
		return ( ( h ^ ( h >>> 16 ) ) >>> 0 ) / 4294967296;

	};
	return ( x, z ) => {

		const fx = x / size, fz = z / size, i = Math.floor( fx ), j = Math.floor( fz );
		const u = fx - i, v = fz - j, su = u * u * ( 3 - 2 * u ), sv = v * v * ( 3 - 2 * v );
		return ( at( i, j ) * ( 1 - su ) + at( i + 1, j ) * su ) * ( 1 - sv ) + ( at( i, j + 1 ) * ( 1 - su ) + at( i + 1, j + 1 ) * su ) * sv;

	};

}

// what has been planted, for keeping plants apart: add( x, z, r ) and near( x, z, r )
class Spread {

	constructor( cell ) { this.cell = cell; this.cells = new Map(); }

	add( x, z, r ) {

		const k = Math.floor( x / this.cell ) + ',' + Math.floor( z / this.cell );
		if ( ! this.cells.has( k ) ) this.cells.set( k, [] );
		this.cells.get( k ).push( [ x, z, r ] );

	}

	// is anything planted within its own r plus `r` of the point?
	near( x, z, r ) {

		const n = Math.ceil( ( r + this.cell ) / this.cell ), i0 = Math.floor( x / this.cell ), j0 = Math.floor( z / this.cell );
		for ( let j = j0 - n; j <= j0 + n; j ++ ) for ( let i = i0 - n; i <= i0 + n; i ++ ) for ( const [ px, pz, pr ] of this.cells.get( i + ',' + j ) || [] ) {

			if ( Math.hypot( px - x, pz - z ) < r + pr ) return true;

		}

		return false;

	}

}

// A tree is as tall as its shape, by its size, by a stretch of its own between these.
const STRETCH = [ 0.85, 1.15 ];
// What stands where the survey saw a tree (in a landmark's grounds, in a park), and the room it
// keeps (m): the tree of a Slavonian churchyard and of its village's park is a lime.
const GROUNDS_TREE = { plant: 'lime', clear: 4 };

// Plant the patch: { reed: [ records ], willow: [ ... ], ... } by shape, and a count per habitat. A
// record is what the vegetation's instances take: x, y, z, s (scale), yaw, seed, qr (how far it is
// drawn), and la, l, H, which the two materials read their own way (vegetation/VegNodes.js,
// VegMaterials.js): a tree's are its yaw, its vertical stretch and its height in metres (for the
// wind); a reed clump's are the lean and the height of the stem its crown stands on, and it has none.
export function plant( { site, terrain } ) {

	const { occupancy } = site, half = terrain.size / 2 - SEARCH;
	const out = { reed: [], willow: [], poplar: [], oak: [] }, counts = {};
	// every tree keeps clear of every other, whatever habitat planted it
	const trees = new Spread( 16 );
	const forest = ( x, z ) => terrain.forest[ Math.floor( z - terrain.origin ) * terrain.res + Math.floor( x - terrain.origin ) ] / 255;
	// first the trees that were surveyed: each where it was seen and as tall, and the habitats plant round
	// them; then, inside ground the survey found open, nothing is planted by rule
	const open = site.open.map( ( o ) => o.ring );
	const inOpen = ( x, z ) => open.some( ( ring ) => {

		let inside = false;
		for ( let i = 0, j = ring.length - 1; i < ring.length; j = i ++ ) {

			const a = ring[ j ], b = ring[ i ];
			if ( ( a[ 1 ] <= z ) !== ( b[ 1 ] <= z ) && x < a[ 0 ] + ( b[ 0 ] - a[ 0 ] ) * ( z - a[ 1 ] ) / ( b[ 1 ] - a[ 1 ] ) ) inside = ! inside;

		}

		return inside;

	} );
	{

		const rnd = random( 104729 ), kind = PLANTS[ GROUNDS_TREE.plant ], shape = SHAPES[ kind.shape ];
		counts.grounds = 0;
		for ( const t of [ ...site.buildings.list.flatMap( ( b ) => b.grounds ? b.grounds.trees : [] ), ...site.trees ] ) {

			const yaw = rnd() * Math.PI * 2;
			out[ kind.shape ].push( { x: t.x, y: terrain.heightAt( t.x, t.z ), z: t.z, yaw, s: t.height / shape.spec.H, seed: seedOf( GROUNDS_TREE.plant, rnd ), qr: TREE_REACH + 12, la: yaw, l: 1, H: t.height } );
			trees.add( t.x, t.z, GROUNDS_TREE.clear );
			counts.grounds ++;

		}

	}

	Object.entries( HABITATS ).forEach( ( [ name, h ], index ) => {

		const rnd = random( 7919 * ( index + 1 ) ), patch = stands( h.stand[ 0 ], index + 1 ), kind = PLANTS[ h.plant ];
		const same = new Spread( Math.max( 2, h.spacing ) );
		let n = 0;
		// one plant, if the ground at the point will have it
		const put = ( x, z, allowed ) => {

			if ( Math.abs( x ) > half || Math.abs( z ) > half || patch( x, z ) > h.stand[ 1 ] ) return;
			// ( reeds and the bank's willows grow on a park's bank as on any other )
			if ( kind && h.on !== 'bank' && inOpen( x, z ) ) return;
			if ( occupancy.within( x, z, h.clear ) > allowed ) return;
			if ( same.near( x, z, h.spacing * 0.75 ) || ( kind && trees.near( x, z, h.clear ) ) ) return;
			const y = terrain.heightAt( x, z );
			if ( h.height && ( y < h.height[ 0 ] || y > h.height[ 1 ] ) ) return;
			if ( ! h.height && y < 0.05 ) return;
			same.add( x, z, 0 );
			const rec = { x, y, z, yaw: rnd() * Math.PI * 2 };
			if ( kind ) {

				trees.add( x, z, h.clear );
				rec.s = kind.size[ 0 ] + rnd() * ( kind.size[ 1 ] - kind.size[ 0 ] );
				rec.seed = seedOf( h.plant, rnd );
				rec.qr = TREE_REACH + 12;
				rec.la = rec.yaw;
				rec.l = STRETCH[ 0 ] + rnd() * ( STRETCH[ 1 ] - STRETCH[ 0 ] );
				rec.H = SHAPES[ kind.shape ].spec.H * rec.s * rec.l;
				out[ kind.shape ].push( rec );

			} else {

				rec.s = 0.8 + rnd() * 0.5;
				rec.seed = rnd();
				rec.qr = REED_REACH + 8;
				// A clump has no stem: the plant material stands a plant's crown on top of a stem H tall
				// (a palm's), and a reed bed's blades grow from the ground itself.
				rec.la = 0; rec.l = 0; rec.H = 0;
				out.reed.push( rec );

			}

			n ++;

		};
		// the points of a square of ground, a spacing apart and shaken off the grid
		const within = ( x0, z0, x1, z1, visit ) => {

			const s = h.spacing;
			for ( let z = Math.floor( z0 / s ) * s; z < z1; z += s ) for ( let x = Math.floor( x0 / s ) * s; x < x1; x += s ) {

				const px = x + ( rnd() - 0.5 ) * s * 0.7 + s / 2, pz = z + ( rnd() - 0.5 ) * s * 0.7 + s / 2;
				if ( px >= x0 && px < x1 && pz >= z0 && pz < z1 ) visit( px, pz );

			}

		};

		if ( h.on === 'margin' || h.on === 'bank' || h.on === 'wood' ) {

			for ( let z = - half; z < half; z += SEARCH ) for ( let x = - half; x < half; x += SEARCH ) {

				const cx = x + SEARCH / 2, cz = z + SEARCH / 2;
				if ( h.on === 'wood' ) {

					if ( forest( cx, cz ) > 0 ) within( x, z, x + SEARCH, z + SEARCH, ( px, pz ) => { if ( forest( px, pz ) > 0.5 ) put( px, pz, FREE ); } );
					continue;

				}

				// by the water: the square's own distance to the waterline says whether to look in it
				const d = - terrain.coastDistance( cx, cz ).d, reach = h.on === 'bank' ? h.reach[ 1 ] : 0;
				if ( d > reach + SEARCH + terrain.shore.cell || d < - SEARCH - terrain.shore.cell ) continue;
				within( x, z, x + SEARCH, z + SEARCH, ( px, pz ) => {

					// the margin is the shallows as well as the toe of the bank
					if ( h.on === 'margin' ) return put( px, pz, WATER );
					const land = - terrain.coastDistance( px, pz ).d;
					if ( land >= h.reach[ 0 ] && land <= h.reach[ 1 ] ) put( px, pz, FREE );

				} );

			}

		} else if ( h.on === 'yard' ) {

			for ( const p of site.plots ) {

				const c = plotCorners( p ), xs = c.map( ( q ) => q[ 0 ] ), zs = c.map( ( q ) => q[ 1 ] );
				within( Math.min( ...xs ), Math.min( ...zs ), Math.max( ...xs ), Math.max( ...zs ), ( px, pz ) => { if ( occupancy.at( px, pz ) === YARD ) put( px, pz, YARD ); } );

			}

		} else if ( h.on === 'verge' ) {

			for ( const road of site.roads.roads ) {

				if ( road.bridge || ! h.along( road ) ) continue;
				for ( const side of [ - 1, 1 ] ) for ( let s = h.spacing * rnd(); s < road.length; s += h.spacing * ( 0.85 + 0.3 * rnd() ) ) {

					const [ px, pz ] = pointAt( road, s, reachOf( road ) + h.off, side );
					put( px, pz, YARD );

				}

			}

		}

		counts[ name ] = n;

	} );
	return { records: out, counts };

}
