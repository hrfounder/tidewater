import { overRoads, project, SHOULDER } from '../site/Roads.js';
import { RAIL, FORMATION_UNDER, BED_HALF, onBridge } from '../site/Rails.js';
import { toWorld } from '../site/Buildings.js';
import { gridOf, fillPolygon } from '../site/Raster.js';

// The grading pass: everything the Site cuts into the dry ground of the tiles, at the resolution of
// the grid it is cut into. The patch takes all of it at a metre; the coarse field around the patch
// takes the water only, at its 10 m.
//
//   water   inside a body the bed falls from the waterline at the bank slope to the body's depth;
//           outside, the bank rises at the same slope until it meets the plain. The bank is as tall
//           as the plain stands over the water: nothing sets its height or how far it reaches.
//   pads    the ground under a building is levelled to its floor (before the water is cut: a bank
//           takes the edge of a pad that stands too close to it); a landmark's grounds with it,
//           so that its fence and its paving stand on the level they were modelled on.
//   roads   the bed is levelled across at the road's own level, with its camber, and meets the
//           ground beside it over the verge. The terrain mesh is the road. Bridges are left out:
//           their decks are built, not graded.
//   rails   the ground under a track is its formation, level across, with the core of the bed heaped
//           on it just under the ballast that is built (build/Railway.js), so that who walks the
//           track walks on the bed; it meets the ground beside it over the verge. A bridge's
//           stretch is left out. Roads are graded after: a level crossing is the road's.
//   beside  the parking and the pavements along a road lie at the level of its edge; parking is
//           drawn as the road is, by the same outline.
//   open    ground the survey found open is neither wood nor field in the ground's masks.
//   areas   made ground is flat, at the mean level of its corners.
//
// The roads also leave their outline in the terrain for the ground shader to draw them from
// (GroundSurface.js): a signed distance to the carriageway's edge, one field for paved roads and one
// for unpaved.

// The world has one water plane, at the datum. Ground the data puts under it without calling it
// water (a hollow behind a levee, a field lower than the river) would flood, so dry ground is held
// this far above the plane (m).
export const DRY_FLOOR = 0.25;

// How far to each side of a carriageway's edge its outline is recorded (m). The field stores
// 0.5 - distance / ( 2 * ROAD_RANGE ): 0.5 on the edge, 1 this far inside, 0 this far outside.
export const ROAD_RANGE = 4;
// the crossfall of a carriageway from its crown to its edge (m per m)
const CAMBER = 0.025;
// beyond the shoulder the graded bed meets the ground over this distance (m)
const VERGE = 2;
// a building's pad: level this far out from its walls, then meeting the ground over the blend (m)
const PAD_MARGIN = 1, PAD_BLEND = 1.5;

const smoothstep = ( a, b, x ) => {

	const t = Math.min( 1, Math.max( 0, ( x - a ) / ( b - a ) ) );
	return t * t * ( 3 - 2 * t );

};

// Cut the water into a grid of heights. `masks` is the terrain whose ground masks follow the cut
// (the patch), or null for a grid that has heights only; `keep` marks the samples a building stands
// on, which are not cut (where the map puts a building over the bank, the bank is a wall under it).
// Returns the water's field over the grid.
export function cutWater( grid, water, masks = null, keep = null ) {

	const H = grid.heights;
	let top = - Infinity;
	for ( let k = 0; k < H.length; k ++ ) {

		if ( H[ k ] < DRY_FLOOR ) H[ k ] = DRY_FLOOR;
		if ( H[ k ] > top ) top = H[ k ];

	}

	const f = water.field( grid, top );
	for ( let k = 0; k < H.length; k ++ ) {

		const bi = f.body[ k ];
		if ( bi < 0 ) continue;
		const b = water.bodies[ bi ];
		let p = f.level[ k ] + Math.max( - b.depth, f.s[ k ] / b.slope );
		// a ditch the map calls dry holds no water, whatever its level against the plane
		if ( b.dry && p < DRY_FLOOR ) p = DRY_FLOOR;
		if ( p >= H[ k ] || ( keep && keep[ k ] ) ) { f.body[ k ] = - 1; continue; }
		H[ k ] = p;
		// the cut ground is bank and bed: grass and mud, whatever the land cover says
		if ( masks ) masks.cropland[ k ] = masks.built[ k ] = masks.forest[ k ] = 0;

	}

	return f;

}

// Level the ground under every building to its floor. Returns which texels a building stands on.
export function gradePads( terrain, buildings ) {

	const { res, texel, origin, heights: H } = terrain;
	const under = new Uint8Array( H.length );
	const reach = PAD_MARGIN + PAD_BLEND;
	for ( const b of buildings.list ) for ( const p of b.pieces ) {

		const c = Math.cos( b.yaw ), s = Math.sin( b.yaw );
		// the box around the turned rectangle
		const [ x, z ] = toWorld( b, p.u, p.v );
		const ex = Math.abs( c ) * p.hu + Math.abs( s ) * p.hv + reach, ez = Math.abs( s ) * p.hu + Math.abs( c ) * p.hv + reach;
		const i0 = Math.max( 0, Math.floor( ( x - ex - origin ) / texel ) ), i1 = Math.min( res - 1, Math.ceil( ( x + ex - origin ) / texel ) );
		const j0 = Math.max( 0, Math.floor( ( z - ez - origin ) / texel ) ), j1 = Math.min( res - 1, Math.ceil( ( z + ez - origin ) / texel ) );
		for ( let j = j0; j <= j1; j ++ ) for ( let i = i0; i <= i1; i ++ ) {

			const dx = origin + ( i + 0.5 ) * texel - x, dz = origin + ( j + 0.5 ) * texel - z;
			// how far outside the rectangle, in its own frame
			const out = Math.hypot( Math.max( 0, Math.abs( dx * c - dz * s ) - p.hu ), Math.max( 0, Math.abs( dx * s + dz * c ) - p.hv ) );
			const w = 1 - smoothstep( PAD_MARGIN, reach, out );
			const k = j * res + i;
			if ( w > 0 ) H[ k ] += ( b.floor - H[ k ] ) * w;
			if ( out === 0 ) under[ k ] = 1;

		}

	}

	for ( const b of buildings.list ) if ( b.grounds ) {

		const ring = b.grounds.ring, xs = ring.map( ( p ) => p[ 0 ] ), zs = ring.map( ( p ) => p[ 1 ] );
		const i0 = Math.max( 0, Math.floor( ( Math.min( ...xs ) - reach - origin ) / texel ) ), i1 = Math.min( res - 1, Math.ceil( ( Math.max( ...xs ) + reach - origin ) / texel ) );
		const j0 = Math.max( 0, Math.floor( ( Math.min( ...zs ) - reach - origin ) / texel ) ), j1 = Math.min( res - 1, Math.ceil( ( Math.max( ...zs ) + reach - origin ) / texel ) );
		for ( let j = j0; j <= j1; j ++ ) for ( let i = i0; i <= i1; i ++ ) {

			const w = 1 - smoothstep( PAD_MARGIN, reach, outside( ring, origin + ( i + 0.5 ) * texel, origin + ( j + 0.5 ) * texel ) );
			if ( w > 0 ) H[ j * res + i ] += ( b.floor - H[ j * res + i ] ) * w;

		}

	}

	return under;

}

// how far a point is outside a ring ( 0 inside it )
function outside( ring, x, z ) {

	let inside = false, d = Infinity;
	for ( let i = 0, j = ring.length - 1; i < ring.length; j = i ++ ) {

		const a = ring[ j ], b = ring[ i ], dx = b[ 0 ] - a[ 0 ], dz = b[ 1 ] - a[ 1 ];
		if ( ( a[ 1 ] <= z ) !== ( b[ 1 ] <= z ) && x < a[ 0 ] + dx * ( z - a[ 1 ] ) / dz ) inside = ! inside;
		const t = Math.min( 1, Math.max( 0, ( ( x - a[ 0 ] ) * dx + ( z - a[ 1 ] ) * dz ) / ( dx * dx + dz * dz || 1 ) ) );
		d = Math.min( d, Math.hypot( x - a[ 0 ] - dx * t, z - a[ 1 ] - dz * t ) );

	}

	return inside ? 0 : d;

}

// Grade the roads into the patch and record their outlines.
export function gradeRoads( terrain, roads, water ) {

	const grid = gridOf( terrain ), H = terrain.heights, n = H.length;
	// the nearest carriageway edge to each texel ( < 0 on the carriageway ) and the bed's level there
	const edge = new Float32Array( n ).fill( Infinity ), bed = new Float32Array( n ), shoulder = new Float32Array( n );
	const reach = ( r ) => r.half + Math.max( ROAD_RANGE, SHOULDER + VERGE );
	overRoads( roads.roads, grid, reach, ( r ) => ! r.bridge, ( k, road, d, y ) => {

		const e = d - road.half;
		const paved = road.surface === 'paved';
		const v = Math.min( 1, Math.max( 0, 0.5 - e / ( 2 * ROAD_RANGE ) ) );
		if ( paved ) { if ( v > terrain.road[ k ] ) terrain.road[ k ] = v; } else if ( v * 255 > terrain.track[ k ] ) terrain.track[ k ] = Math.round( v * 255 );
		if ( e < edge[ k ] ) {

			edge[ k ] = e;
			bed[ k ] = y - CAMBER * Math.min( d, road.half );
			shoulder[ k ] = paved ? SHOULDER : 0;

		}

	} );
	for ( let k = 0; k < n; k ++ ) {

		if ( edge[ k ] === Infinity ) continue;
		const w = 1 - smoothstep( shoulder[ k ], shoulder[ k ] + VERGE, edge[ k ] );
		if ( w <= 0 ) continue;
		// a road fills a ditch it crosses (a culvert), never a mapped body of water: where one crowds
		// the bank of the river, the bank is as steep as the gap leaves it
		const body = H[ k ] < 0 && water.owner[ k ] >= 0 ? water.bodies[ water.owner[ k ] ] : null;
		if ( body && body.kind === 'area' ) continue;
		H[ k ] += ( bed[ k ] - H[ k ] ) * w;
		// a road is not a field, a yard or a wood, and where it fills a ditch the water is gone
		terrain.cropland[ k ] *= 1 - w; terrain.built[ k ] *= 1 - w; terrain.forest[ k ] *= 1 - w;
		if ( H[ k ] >= 0 ) water.owner[ k ] = - 1;

	}

}

// The graded bed lies this far under the built ballast's top (m), and its heap is full only this far
// inside the ballast's edge: the ground is a grid of a metre, and must stay inside what is built.
const BED_SUNK = 0.05, BED_INSIDE = 0.5;

// Grade the railway's formation into the patch.
export function gradeRails( terrain, rails, water ) {

	const { res, texel, origin, heights: H } = terrain;
	const reach = BED_HALF + VERGE, core = RAIL.ballast.top / 2 - BED_INSIDE, heap = RAIL.ballast.thick - BED_SUNK;
	// the nearest track to each texel within reach: how far, and the rails' level there
	const near = new Map();
	for ( const track of rails.tracks ) for ( let i = 0; i + 1 < track.pts.length; i ++ ) {

		const a = track.pts[ i ], b = track.pts[ i + 1 ], dx = b[ 0 ] - a[ 0 ], dz = b[ 1 ] - a[ 1 ], len2 = dx * dx + dz * dz;
		const i0 = Math.max( 0, Math.floor( ( Math.min( a[ 0 ], b[ 0 ] ) - reach - origin ) / texel ) ), i1 = Math.min( res - 1, Math.ceil( ( Math.max( a[ 0 ], b[ 0 ] ) + reach - origin ) / texel ) );
		const j0 = Math.max( 0, Math.floor( ( Math.min( a[ 1 ], b[ 1 ] ) - reach - origin ) / texel ) ), j1 = Math.min( res - 1, Math.ceil( ( Math.max( a[ 1 ], b[ 1 ] ) + reach - origin ) / texel ) );
		for ( let j = j0; j <= j1; j ++ ) for ( let ii = i0; ii <= i1; ii ++ ) {

			const x = origin + ( ii + 0.5 ) * texel, z = origin + ( j + 0.5 ) * texel, k = j * res + ii;
			const t = Math.min( 1, Math.max( 0, ( ( x - a[ 0 ] ) * dx + ( z - a[ 1 ] ) * dz ) / len2 ) ), d = Math.hypot( x - a[ 0 ] - dx * t, z - a[ 1 ] - dz * t );
			if ( d > reach || ( near.has( k ) && near.get( k ).d <= d ) ) continue;
			near.set( k, { d, y: a[ 2 ] + ( b[ 2 ] - a[ 2 ] ) * t, bridge: onBridge( track, a[ 3 ] + ( b[ 3 ] - a[ 3 ] ) * t ) } );

		}

	}

	for ( const [ k, { d, y, bridge } ] of near ) {

		if ( bridge ) continue;
		// ( a formation fills a ditch it crosses, never a mapped body of water: as a road does )
		const body = H[ k ] < 0 && water.owner[ k ] >= 0 ? water.bodies[ water.owner[ k ] ] : null;
		if ( body && body.kind === 'area' ) continue;
		const w = 1 - smoothstep( BED_HALF, BED_HALF + VERGE, d );
		H[ k ] += ( y - FORMATION_UNDER + heap * ( 1 - smoothstep( core, BED_HALF, d ) ) - H[ k ] ) * w;
		terrain.cropland[ k ] *= 1 - w; terrain.built[ k ] *= 1 - w; terrain.forest[ k ] *= 1 - w;
		if ( H[ k ] >= 0 ) water.owner[ k ] = - 1;

	}

}

// Level the strips beside the roads (site/Beside.js) and add the asphalt ones to the roads' outline.
export function gradeBeside( terrain, strips ) {

	const { res, texel, origin, heights: H } = terrain;
	const reach = Math.max( ROAD_RANGE, VERGE );
	for ( const strip of strips ) {

		const ring = strip.ring, xs = ring.map( ( p ) => p[ 0 ] ), zs = ring.map( ( p ) => p[ 1 ] );
		const i0 = Math.max( 0, Math.floor( ( Math.min( ...xs ) - reach - origin ) / texel ) ), i1 = Math.min( res - 1, Math.ceil( ( Math.max( ...xs ) + reach - origin ) / texel ) );
		const j0 = Math.max( 0, Math.floor( ( Math.min( ...zs ) - reach - origin ) / texel ) ), j1 = Math.min( res - 1, Math.ceil( ( Math.max( ...zs ) + reach - origin ) / texel ) );
		for ( let j = j0; j <= j1; j ++ ) for ( let i = i0; i <= i1; i ++ ) {

			const x = origin + ( i + 0.5 ) * texel, z = origin + ( j + 0.5 ) * texel, k = j * res + i;
			const out = outside( ring, x, z );
			if ( out > reach ) continue;
			// at the level of the road's edge beside it
			const f = project( strip.road, x, z ), w = 1 - smoothstep( 0, VERGE, out );
			if ( w > 0 ) H[ k ] += ( f.y - CAMBER * strip.road.half - H[ k ] ) * w;
			if ( strip.of !== 'asphalt' ) continue;
			const v = out > 0 ? Math.max( 0, 0.5 - out / ( 2 * ROAD_RANGE ) ) : 1;
			if ( v > terrain.road[ k ] ) terrain.road[ k ] = v;
			if ( out === 0 ) terrain.cropland[ k ] = terrain.built[ k ] = terrain.forest[ k ] = 0;

		}

	}

}

// Open ground and made ground, as surveyed (Survey.js OPEN and AREAS).
export function gradeOpen( terrain, open, areas ) {

	const grid = gridOf( terrain ), { res, texel, origin, heights: H } = terrain;
	for ( const o of open ) fillPolygon( grid, o.ring, ( k ) => { terrain.forest[ k ] = terrain.cropland[ k ] = 0; } );
	const reach = PAD_BLEND;
	for ( const area of areas ) {

		const ring = area.ring, xs = ring.map( ( p ) => p[ 0 ] ), zs = ring.map( ( p ) => p[ 1 ] );
		// ( areas of one group, the segments of a path, take the mean over all their corners )
		const own = area.group ? areas.filter( ( a ) => a.group === area.group ).flatMap( ( a ) => a.ring ) : ring;
		area.level = area.group && area.group.level !== undefined ? area.group.level : own.reduce( ( s, [ x, z ] ) => s + terrain.heightAt( x, z ), 0 ) / own.length;
		if ( area.group ) area.group.level = area.level;
		const i0 = Math.max( 0, Math.floor( ( Math.min( ...xs ) - reach - origin ) / texel ) ), i1 = Math.min( res - 1, Math.ceil( ( Math.max( ...xs ) + reach - origin ) / texel ) );
		const j0 = Math.max( 0, Math.floor( ( Math.min( ...zs ) - reach - origin ) / texel ) ), j1 = Math.min( res - 1, Math.ceil( ( Math.max( ...zs ) + reach - origin ) / texel ) );
		for ( let j = j0; j <= j1; j ++ ) for ( let i = i0; i <= i1; i ++ ) {

			const w = 1 - smoothstep( 0, reach, outside( ring, origin + ( i + 0.5 ) * texel, origin + ( j + 0.5 ) * texel ) );
			if ( w > 0 ) H[ j * res + i ] += ( area.level - H[ j * res + i ] ) * w;

		}

	}

}

// metres between the samples of the current's grid: the flow turns over tens of metres
const FLOW_CELL = 8;

// The surface current over the patch on a coarse grid (the heightfield's `flow`), sampled from the
// Site's water where the cut ground is under the plane.
export function flowGrid( terrain, water ) {

	const res = terrain.size / FLOW_CELL, ox = terrain.origin, oz = terrain.origin;
	const data = new Float32Array( res * res * 2 ), v = [ 0, 0 ];
	for ( let j = 0; j < res; j ++ ) for ( let i = 0; i < res; i ++ ) {

		const x = ox + ( i + 0.5 ) * FLOW_CELL, z = oz + ( j + 0.5 ) * FLOW_CELL;
		water.flowAt( x, z, - terrain.heightAt( x, z ), v );
		data[ ( j * res + i ) * 2 ] = v[ 0 ];
		data[ ( j * res + i ) * 2 + 1 ] = v[ 1 ];

	}

	return { data, res, texel: FLOW_CELL, ox, oz };

}

// Cut the Site into the terrain and close it (TileTerrain.finish).
export function gradeTerrain( terrain, site ) {

	const { water } = site;
	// pads first: a bank is cut through the edge of a pad that stands too close to the water, and the
	// building's walls run down to the ground there. Roads last: they cross the ditches the water cut.
	const under = gradePads( terrain, site.buildings );
	water.bind( terrain, cutWater( { heights: terrain.heights, ...gridOf( terrain ) }, water, terrain, under ) );
	cutWater( terrain.far, water );
	gradeOpen( terrain, site.open, site.areas );
	// ( what lies beside the roads before the roads themselves: a foot way that runs through a row of
	// parking keeps its own level )
	gradeBeside( terrain, site.beside );
	gradeRails( terrain, site.rails, water );
	gradeRoads( terrain, site.roads, water );
	terrain.flow = flowGrid( terrain, water );
	terrain.finish();

}
