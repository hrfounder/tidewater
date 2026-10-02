// Numbers on the Site of the Slavonian world: roads, buildings, plots, occupancy
// (docs/slavonia/DESIGN.md, section 7).
//   node tools/checks/site.mjs
import { Polygon } from './polygon.mjs';
import { load, readJSON, check, finish } from './load.mjs';
import { insideBuilding, toWorld } from '../../src/regions/slavonia/site/Buildings.js';
import { reachOf, project, ROAD_CLASSES } from '../../src/regions/slavonia/site/Roads.js';
import { plotCorners } from '../../src/regions/slavonia/site/Plots.js';
import { FREE, YARD, WATER, ROAD, BUILDING } from '../../src/regions/slavonia/site/Occupancy.js';

const { terrain: T, site, models } = await load();
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
	const boxed = B.filter( ( b ) => ! b.exact && ! b.grounds );
	console.log( `     footprints with a wall off their axes, built as the rectangle around them: ${ boxed.length } (${ pct( boxed.length, B.length ) })` );

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

// ---- landmarks: the foot of each model against the ground it is given, and what a model says of its
// own plan against the map and the Site round it
const mapped = new Map( readJSON( 'places.json' ).buildings.filter( ( m ) => m.name ).map( ( m ) => [ m.name.toLowerCase(), m.ring.map( ( [ e, n ] ) => [ e - site.center[ 0 ], site.center[ 1 ] - n ] ) ] ) );
const toRing = ( ring, x, z ) => Math.min( ...ring.map( ( p, i ) => {

	const q = ring[ ( i + 1 ) % ring.length ], dx = q[ 0 ] - p[ 0 ], dz = q[ 1 ] - p[ 1 ];
	const t = Math.min( 1, Math.max( 0, ( ( x - p[ 0 ] ) * dx + ( z - p[ 1 ] ) * dz ) / ( dx * dx + dz * dz ) ) );
	return Math.hypot( x - p[ 0 ] - dx * t, z - p[ 1 ] - dz * t );

} ) );
// points every `step` metres along a ring
const along = ( ring, step ) => ring.flatMap( ( p, i ) => {

	const q = ring[ ( i + 1 ) % ring.length ], n = Math.max( 1, Math.ceil( Math.hypot( q[ 0 ] - p[ 0 ], q[ 1 ] - p[ 1 ] ) / step ) );
	return Array.from( { length: n }, ( _, k ) => [ p[ 0 ] + ( q[ 0 ] - p[ 0 ] ) * k / n, p[ 1 ] + ( q[ 1 ] - p[ 1 ] ) * k / n ] );

} );
for ( const b of buildings.list.filter( ( b ) => b.kind === 'landmark' ) ) {

	// the ground the model is given: its grounds if it has them, the footprint if not
	const model = models.landmarks.get( b.name.toLowerCase() ), given = b.grounds ? b.grounds.ring : b.ring, ring = new Polygon( [ given ] );
	// the model's vertices below 0.7 m (its plinth, its fence's foot), in the world, as the village's builder stands it
	let worst = 0, top = [ 0, - Infinity, 0 ];
	for ( const part of model.parts ) for ( let i = 0; i < part.positions.length; i += 3 ) {

		const [ x, z ] = toWorld( b, part.positions[ i ], part.positions[ i + 2 ] );
		if ( part.positions[ i + 1 ] > top[ 1 ] ) top = [ x, part.positions[ i + 1 ], z ];
		if ( part.positions[ i + 1 ] < 0.7 && ! ring.contains( x, z ) ) worst = Math.max( worst, toRing( given, x, z ) );

	}

	check( worst < 0.5, `${ b.name }: its foot outside ${ b.grounds ? 'its grounds' : 'its footprint' }`, `at most ${ worst.toFixed( 2 ) } m; fronts ${ b.frontage.road.name }; its top (${ top[ 1 ].toFixed( 1 ) } m) stands ${ Math.hypot( top[ 0 ] - b.frontage.x, top[ 2 ] - b.frontage.z ).toFixed( 1 ) } m from that street, the footprint's middle ${ Math.hypot( b.x - b.frontage.x, b.z - b.frontage.z ).toFixed( 1 ) } m` );
	if ( ! b.grounds ) continue;

	// the model's plan against the mapped outline it replaces: how much of the map's is under the model's walls
	const was = new Polygon( [ mapped.get( b.name.toLowerCase() ) ] ), now = new Polygon( [ b.ring ] );
	let inWas = 0, inBoth = 0, inNow = 0;
	for ( let z = Math.min( was.z0, now.z0 ); z <= Math.max( was.z1, now.z1 ); z += 0.25 ) for ( let x = Math.min( was.x0, now.x0 ); x <= Math.max( was.x1, now.x1 ); x += 0.25 ) {

		const w = was.contains( x, z ), n = now.contains( x, z );
		if ( w ) inWas ++; if ( n ) inNow ++; if ( w && n ) inBoth ++;

	}

	check( inBoth / inWas > 0.9, `${ b.name }: the mapped outline under the model's walls`, `${ pct( inBoth, inWas ) } of its ${ ( inWas / 16 ).toFixed( 0 ) } m2; the model's plan is ${ ( inNow / 16 ).toFixed( 0 ) } m2, ${ ( ( inNow - inBoth ) / 16 ).toFixed( 0 ) } m2 of it where the map has none` );

	// its grounds against what stands round them: no other building in them, no carriageway through their fence
	const yard = new Polygon( [ b.grounds.ring ] );
	const inside = buildings.near( b.x, b.z, 2 * buildings.radius ).filter( ( o ) => o !== b && ( o.ring.some( ( [ x, z ] ) => yard.contains( x, z ) ) || b.grounds.ring.some( ( [ x, z ] ) => insideBuilding( o, x, z ) ) ) );
	let room = Infinity, nearest = null;
	for ( const [ x, z ] of along( b.grounds.ring, 0.5 ) ) {

		const f = roads.nearest( x, z, 30 );
		if ( f && f.d - reachOf( f.road ) < room ) { room = f.d - reachOf( f.road ); nearest = f.road; }

	}

	check( inside.length === 0 && room >= 0, `${ b.name }: its grounds clear of other buildings and of the roads`, `${ inside.length } buildings in them; the fence at least ${ room.toFixed( 2 ) } m from the edge of a road (${ nearest.name || nearest.class })` );

	// the ground they stand on, against the level the model was made on: under the paving (a slab
	// 4 cm thick lies on it) and along the fence
	let over = - Infinity, off = 0;
	for ( const paving of b.grounds.paved ) { const P = new Polygon( [ paving ] ); for ( let z = P.z0; z <= P.z1; z += 0.5 ) for ( let x = P.x0; x <= P.x1; x += 0.5 ) if ( P.contains( x, z ) ) over = Math.max( over, T.heightAt( x, z ) - b.floor ); }
	for ( const w of b.grounds.walls ) for ( const [ x, z ] of along( [ w.a, w.b ], 0.5 ) ) off = Math.max( off, Math.abs( T.heightAt( x, z ) - b.floor ) );
	check( over < 0.03 && off < 0.25, `${ b.name }: its grounds on the level`, `the ground at most ${ ( over * 100 ).toFixed( 1 ) } cm over the paving's bed and within ${ ( off * 100 ).toFixed( 1 ) } cm of the level along the fence; ${ b.grounds.walls.length } stretches of fence and wall, ${ b.grounds.paved.length } pavings` );

}

// ---- what lies beside the roads: each strip against the buildings and against its own road
{

	const B = site.beside, area = ( ring ) => Math.abs( ring.reduce( ( s, p, i ) => { const q = ring[ ( i + 1 ) % ring.length ]; return s + p[ 0 ] * q[ 1 ] - q[ 0 ] * p[ 1 ]; }, 0 ) ) / 2;
	const through = B.filter( ( s ) => [ ...s.inner, ...s.outer ].some( ( [ x, z ] ) => buildings.near( x, z, buildings.radius ).some( ( b ) => insideBuilding( b, x, z, - 0.2 ) ) ) );
	// a strip that starts at the carriageway's edge lies against it: the ground between is road
	let gap = 0;
	for ( const s of B ) for ( const [ x, z ] of s.inner ) gap = Math.max( gap, Math.abs( T.heightAt( x, z ) - project( s.road, x, z ).y ) );
	check( through.length === 0 && gap < 0.15, 'parking and pavements beside the roads', `${ B.length } strips, ${ B.filter( ( s ) => s.of === 'asphalt' ).reduce( ( a, s ) => a + area( s.ring ), 0 ).toFixed( 0 ) } m2 of parking and ${ B.filter( ( s ) => s.of === 'paving' ).reduce( ( a, s ) => a + area( s.ring ), 0 ).toFixed( 0 ) } m2 of pavement; ${ through.length } run through a building${ through.map( ( s ) => ` (${ s.of } beside ${ s.road.name || s.road.class } from ${ s.inner[ 0 ].map( Math.round ) })` ).join( '' ) }; their inner edge lies within ${ ( gap * 100 ).toFixed( 0 ) } cm of the road's level` );

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
