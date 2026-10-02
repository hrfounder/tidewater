// Numbers on the Site of the Slavonian world: roads, buildings, plots, occupancy
// (docs/slavonia/DESIGN.md, section 7).
//   node tools/checks/site.mjs
import { Polygon } from './polygon.mjs';
import { load, readJSON, check, finish } from './load.mjs';
import { insideBuilding, toWorld } from '../../src/regions/slavonia/site/Buildings.js';
import { reachOf, ROAD_CLASSES } from '../../src/regions/slavonia/site/Roads.js';
import { plotCorners } from '../../src/regions/slavonia/site/Plots.js';
import { FREE, YARD, WATER, ROAD, BUILDING } from '../../src/regions/slavonia/site/Occupancy.js';

const { terrain: T, site } = await load();
const { roads, buildings, plots, occupancy, water } = site;
const count = ( list, key ) => list.reduce( ( m, e ) => ( m[ key( e ) ] = ( m[ key( e ) ] || 0 ) + 1, m ), {} );
const pct = ( a, b ) => `${ ( a / b * 100 ).toFixed( 1 ) } %`;

// ---- roads
{

	console.log( `     ${ roads.roads.length } roads between ${ roads.nodes.length } nodes; by class ${ JSON.stringify( count( roads.roads, ( r ) => r.class ) ) }; not built ${ JSON.stringify( roads.skipped ) }` );
	// the ground is the road: the terrain under the centreline against the road's own level
	let worst = 0, at = null, points = 0, grade = 0, gradeAt = null, turn = 0;
	for ( const r of roads.roads ) {

		for ( let i = 0; i < r.pts.length; i ++ ) {

			const p = r.pts[ i ];
			if ( i && ! r.bridge ) {

				const g = Math.abs( p[ 2 ] - r.pts[ i - 1 ][ 2 ] ) / ( p[ 3 ] - r.pts[ i - 1 ][ 3 ] );
				if ( g > grade ) { grade = g; gradeAt = r; }

			}

			if ( i && i + 1 < r.pts.length ) {

				const a = r.pts[ i - 1 ], b = r.pts[ i + 1 ];
				const t = Math.abs( Math.atan2( ( p[ 0 ] - a[ 0 ] ) * ( b[ 1 ] - p[ 1 ] ) - ( p[ 1 ] - a[ 1 ] ) * ( b[ 0 ] - p[ 0 ] ), ( p[ 0 ] - a[ 0 ] ) * ( b[ 0 ] - p[ 0 ] ) + ( p[ 1 ] - a[ 1 ] ) * ( b[ 1 ] - p[ 1 ] ) ) );
				if ( t > turn ) turn = t;

			}

			// away from the ends, where another road's bed takes over, and off the bridges
			if ( r.bridge || p[ 3 ] < 12 || r.length - p[ 3 ] < 12 || Math.abs( p[ 0 ] ) > T.size / 2 - 8 || Math.abs( p[ 1 ] ) > T.size / 2 - 8 ) continue;
			const other = roads.nearest( p[ 0 ], p[ 1 ], r.half + 4, ( o ) => o !== r );
			if ( other ) continue;
			points ++;
			const d = Math.abs( T.heightAt( p[ 0 ], p[ 1 ] ) - p[ 2 ] );
			if ( d > worst ) { worst = d; at = `${ r.class } ${ r.name } at ${ p[ 0 ].toFixed( 0 ) },${ p[ 1 ].toFixed( 0 ) }`; }

		}

	}

	check( worst < 0.02, 'terrain under a road against the road level', `worst ${ ( worst * 100 ).toFixed( 1 ) } cm over ${ points } points${ worst >= 0.02 ? ' (' + at + ')' : '' }` );
	const narrow = roads.roads.filter( ( r ) => r.half * 2 < ROAD_CLASSES[ r.class ].width - 0.01 );
	console.log( `     squeezed between buildings: ${ narrow.length } roads${ narrow.length ? ' (' + narrow.map( ( r ) => `${ r.class } ${ ( r.half * 2 ).toFixed( 1 ) } m` ).join( ', ' ) + ')' : '' }` );
	check( grade <= 0.08, 'steepest road', `${ ( grade * 100 ).toFixed( 1 ) } % (${ gradeAt.class } ${ gradeAt.name })` );
	console.log( `     sharpest turn between two points of a road: ${ ( turn * 180 / Math.PI ).toFixed( 1 ) } degrees` );

	// every road meets its nodes at the node's level
	let off = 0;
	for ( const r of roads.roads ) off = Math.max( off, Math.abs( r.pts[ 0 ][ 2 ] - roads.nodes[ r.a ].y ), Math.abs( r.pts.at( - 1 )[ 2 ] - roads.nodes[ r.b ].y ) );
	check( off < 0.02, 'roads and bridge decks meet at their nodes', `worst ${ ( off * 100 ).toFixed( 2 ) } cm` );

	// no road runs through mapped water except on a bridge
	const json = readJSON( 'water.json' ), [ cE, cN ] = T.center;
	const areas = json.areas.map( ( a ) => new Polygon( a.rings.map( ( r ) => r.map( ( [ e, n ] ) => [ e - cE, cN - n ] ) ) ) );
	const wet = roads.roads.filter( ( r ) => ! r.bridge && r.pts.some( ( p ) => areas.some( ( a ) => a.contains( p[ 0 ], p[ 1 ] ) ) ) );
	check( wet.length === 0, 'roads through mapped water without a bridge', `${ wet.length }${ wet.length ? ': ' + wet.map( ( r ) => `${ r.class } ${ r.name }` ).join( '; ' ) : '' }` );
	for ( const r of roads.roads ) if ( r.bridge ) console.log( `     bridge: ${ r.class } ${ r.name || '' } ${ r.length.toFixed( 1 ) } m, deck ${ r.pts[ 0 ][ 2 ].toFixed( 2 ) } to ${ r.pts.at( - 1 )[ 2 ].toFixed( 2 ) } m over the water` );

}

// ---- buildings
{

	const B = buildings.list;
	console.log( `     ${ B.length } buildings; ${ JSON.stringify( count( B, ( b ) => b.kind ) ) }; pieces ${ JSON.stringify( count( B, ( b ) => b.pieces.length ) ) }` );
	const exact = B.filter( ( b ) => b.exact );
	// footprint fit: no corner of the ring outside the pieces, and the pieces no larger than the ring
	let out = 0, worstArea = 0;
	for ( const b of exact ) {

		if ( b.ring.some( ( [ x, z ] ) => ! insideBuilding( b, x, z, 0.5 ) ) ) out ++;
		const a = b.pieces.reduce( ( s, p ) => s + 4 * p.hu * p.hv, 0 );
		worstArea = Math.max( worstArea, Math.abs( a - b.area ) / b.area );

	}

	check( out === 0, 'footprints with a corner more than 0.5 m outside their pieces', `${ out } of ${ exact.length }` );
	check( worstArea < 0.1, 'pieces against the footprint, by area', `worst ${ ( worstArea * 100 ).toFixed( 1 ) } % off` );
	console.log( `     footprints with a wall off their axes, built as the rectangle around them: ${ B.length - exact.length } (${ pct( B.length - exact.length, B.length ) })` );

	const fronted = B.filter( ( b ) => b.frontage );
	const setback = fronted.filter( ( b ) => b.kind === 'house' ).map( ( b ) => Math.min( ...b.ring.map( ( [ x, z ] ) => Math.hypot( x - b.frontage.x, z - b.frontage.z ) ) ) - b.frontage.road.half ).sort( ( a, b ) => a - b );
	console.log( `     with a street within reach: ${ fronted.length } (${ pct( fronted.length, B.length ) }); a house stands ${ setback[ Math.floor( setback.length * 0.1 ) ].toFixed( 1 ) } / ${ setback[ setback.length >> 1 ].toFixed( 1 ) } / ${ setback[ Math.floor( setback.length * 0.9 ) ].toFixed( 1 ) } m from the carriageway (10 % / median / 90 %)` );

	// nothing built on a carriageway or in the water
	const onRoad = B.filter( ( b ) => b.ring.some( ( [ x, z ] ) => { const r = roads.nearest( x, z, 8, ( o ) => ! o.bridge ); return r && reachOf( r.road ) - r.d > 0.005; } ) );
	check( onRoad.length === 0, 'buildings with a corner more than 5 mm onto a carriageway or its shoulder', `${ onRoad.length }${ onRoad.length ? ': ' + onRoad.slice( 0, 5 ).map( ( b ) => `${ b.kind } at ${ b.x.toFixed( 0 ) },${ b.z.toFixed( 0 ) }` ).join( '; ' ) : '' }` );
	const inWater = B.filter( ( b ) => b.ring.some( ( [ x, z ] ) => T.heightAt( x, z ) < 0 ) );
	check( inWater.length === 0, 'buildings with a corner in the water', `${ inWater.length }${ inWater.length ? ': ' + inWater.slice( 0, 5 ).map( ( b ) => `${ b.kind } at ${ b.x.toFixed( 0 ) },${ b.z.toFixed( 0 ) }` ).join( '; ' ) : '' }` );
	// the floor against the ground the walls stand on
	let hang = 0, deep = 0;
	for ( const b of B ) for ( const [ x, z ] of b.ring ) {

		const d = b.floor - T.heightAt( x, z );
		if ( d > hang ) hang = d;
		if ( - d > deep ) deep = - d;

	}

	console.log( `     floors against the ground at the walls: at most ${ hang.toFixed( 2 ) } m above it, ${ deep.toFixed( 2 ) } m below it` );

}

// ---- plots
{

	const widths = plots.map( ( p ) => p.s1 - p.s0 ).sort( ( a, b ) => a - b ), depths = plots.map( ( p ) => p.back - p.front ).sort( ( a, b ) => a - b );
	const q = ( A, f ) => A[ Math.floor( A.length * f ) ].toFixed( 1 );
	console.log( `     ${ plots.length } plots; frontage ${ q( widths, 0.1 ) } / ${ q( widths, 0.5 ) } / ${ q( widths, 0.9 ) } m, depth ${ q( depths, 0.1 ) } / ${ q( depths, 0.5 ) } / ${ q( depths, 0.9 ) } m (10 % / median / 90 %)` );
	const empty = plots.filter( ( p ) => p.s1 - p.s0 <= 0 || p.back <= p.front );
	check( empty.length === 0, 'plots with no ground', `${ empty.length }` );
	// a plot's own house stands in it
	const outside = plots.filter( ( p ) => ! new Polygon( [ plotCorners( p ) ] ).contains( p.house.x, p.house.z ) );
	check( outside.length / plots.length < 0.02, 'plots whose house centre lies outside them', `${ outside.length } of ${ plots.length }` );

}

// ---- occupancy
{

	const n = occupancy.of.length, by = new Array( 5 ).fill( 0 );
	for ( let k = 0; k < n; k ++ ) by[ occupancy.of[ k ] ] ++;
	console.log( `     occupancy: free ${ pct( by[ FREE ], n ) }, yard ${ pct( by[ YARD ], n ) }, water ${ pct( by[ WATER ], n ) }, road ${ pct( by[ ROAD ], n ) }, building ${ pct( by[ BUILDING ], n ) }` );
	// against the Site it was made from: the centre of every building is a building, the middle of every road a road
	const b = buildings.list.filter( ( b ) => b.pieces.some( ( p ) => p.hu > 1 && p.hv > 1 && occupancy.at( ...toWorld( b, p.u, p.v ) ) !== BUILDING ) );
	check( b.length === 0, 'buildings with a piece whose centre the occupancy does not call a building', `${ b.length }` );
	let mid = 0, bad = 0;
	for ( const r of roads.roads ) for ( let i = 0; i < r.pts.length; i += 5 ) {

		const p = r.pts[ i ];
		if ( Math.abs( p[ 0 ] ) > T.size / 2 || Math.abs( p[ 1 ] ) > T.size / 2 ) continue;
		mid ++;
		if ( occupancy.at( p[ 0 ], p[ 1 ] ) < ROAD ) bad ++;

	}

	check( bad === 0, 'road centreline points the occupancy does not call a road', `${ bad } of ${ mid }` );
	const v = [ 0, 0 ];
	check( water.flowAt( 60, - 15, - T.heightAt( 60, - 15 ), v ) > 0, 'the current at the boat', `${ Math.hypot( ...v ).toFixed( 3 ) } m/s toward ${ ( Math.atan2( v[ 0 ], - v[ 1 ] ) * 180 / Math.PI ).toFixed( 0 ) } degrees from north, ${ ( - T.heightAt( 60, - 15 ) ).toFixed( 2 ) } m of water` );

}

finish();
