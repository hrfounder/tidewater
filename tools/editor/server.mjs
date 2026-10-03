// The town editor: Ivan corrects what the map and the rules made of a town against the state
// orthophoto, and leaves notes for the passes to come. Universal: a town is its region's world and an
// orthophoto service; nothing here is Andrijaševci's.
//
//   node tools/editor/server.mjs [--region slavonia] [--port 5195]  -> open http://localhost:5195
//
// What it serves:
//   /                 the editor (editor.html)
//   /api/world        the town as the game builds it, edits applied: buildings (ring, centre, yaw, kind,
//                     type), roads, pavements, the archetypes to pick from, and the edits themselves
//   /api/ortho?x0&z0&x1&z1&px   the orthophoto over that square of the town's metres (a JPEG, cached)
//   POST /api/edits   writes the edits: public/world/<area>/edits.json, which the game reads
//
// A region is { load(): the world as the game builds it, archetypes, edits file, ortho }; add one to
// REGIONS for a new town.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROOT = path.resolve( HERE, '..', '..' );
const arg = ( name, fallback ) => { const i = process.argv.indexOf( '--' + name ); return i > 0 ? process.argv[ i + 1 ] : fallback; };

// the state orthophoto of Croatia (Državna geodetska uprava), in the national grid the worlds use
const DGU = { url: 'https://geoportal.dgu.hr/services/dof/wms', layer: 'DOF_LIDAR_2022_2023', crs: 'EPSG:3765' };

const REGIONS = {
	slavonia: {
		world: 'public/world/bosut',
		ortho: DGU,
		async load() {

			const { load } = await import( '../checks/load.mjs' );
			const { ARCHETYPES } = await import( '../../src/regions/slavonia/build/Archetypes.js' );
			return { ...( await load() ), archetypes: Object.keys( ARCHETYPES ) };

		},
	},
};

const region = REGIONS[ arg( 'region', 'slavonia' ) ];
const PORT = Number( arg( 'port', 5195 ) );
const EDITS = path.join( ROOT, region.world, 'edits.json' );
const CACHE = path.join( ROOT, 'tools', 'geodata', 'cache', 'editor-ortho' );
const center = JSON.parse( readFileSync( path.join( ROOT, region.world, 'index.json' ), 'utf8' ) ).center;
mkdirSync( CACHE, { recursive: true } );

const round = ( v ) => Math.round( v * 100 ) / 100;
const ringOf = ( r ) => r.map( ( p ) => [ round( p[ 0 ] ), round( p[ 1 ] ) ] );

async function world() {

	// ( the world module caches nothing between loads: every request sees the edits as saved )
	const { site, archetypes } = await region.load();
	return {
		center, archetypes,
		buildings: site.buildings.list.map( ( b ) => ( {
			key: b.index + '.' + ( b.part || 0 ), ring: ringOf( b.ring ), x: round( b.x ), z: round( b.z ), yaw: round( b.yaw * 180 / Math.PI ),
			kind: b.kind, is: b.seen.is || null, storeys: b.seen.storeys || null, form: b.seen.form || null,
			landmark: b.landmark || null, edited: !! b.edited, note: b.note || null,
		} ) ),
		roads: site.roads.roads.map( ( r ) => ( { name: r.name, class: r.class, half: r.half, street: r.street, pts: r.pts.map( ( p ) => [ round( p[ 0 ] ), round( p[ 1 ] ) ] ) } ) ),
		pavements: site.beside.map( ( s ) => ( { of: s.of, ring: ringOf( s.ring ) } ) ),
		edits: existsSync( EDITS ) ? JSON.parse( readFileSync( EDITS, 'utf8' ) ) : { buildings: {}, notes: [] },
	};

}

async function ortho( q ) {

	const [ x0, z0, x1, z1, px ] = [ 'x0', 'z0', 'x1', 'z1', 'px' ].map( ( k ) => Number( q.get( k ) ) );
	const file = path.join( CACHE, `${ x0 }_${ z0 }_${ x1 }_${ z1 }_${ px }.jpg` );
	if ( existsSync( file ) ) return readFileSync( file );
	const o = region.ortho;
	// ( the town's x is east of its centre, z south of it )
	const bbox = [ center[ 0 ] + x0, center[ 1 ] - z1, center[ 0 ] + x1, center[ 1 ] - z0 ].join( ',' );
	const url = `${ o.url }?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${ o.layer }&STYLES=&CRS=${ o.crs }&BBOX=${ bbox }&WIDTH=${ px }&HEIGHT=${ px }&FORMAT=image/jpeg`;
	const r = await fetch( url );
	const data = Buffer.from( await r.arrayBuffer() );
	if ( data[ 0 ] !== 0xff ) throw new Error( 'the orthophoto service sent no picture: ' + data.slice( 0, 200 ).toString() );
	writeFileSync( file, data );
	return data;

}

createServer( async ( req, res ) => {

	const u = new URL( req.url, 'http://x' );
	try {

		if ( u.pathname === '/' ) { res.writeHead( 200, { 'content-type': 'text/html; charset=utf-8' } ); return res.end( readFileSync( path.join( HERE, 'editor.html' ) ) ); }
		if ( u.pathname === '/api/world' ) { const w = await world(); res.writeHead( 200, { 'content-type': 'application/json' } ); return res.end( JSON.stringify( w ) ); }
		if ( u.pathname === '/api/ortho' ) { const d = await ortho( u.searchParams ); res.writeHead( 200, { 'content-type': 'image/jpeg', 'cache-control': 'max-age=86400' } ); return res.end( d ); }
		if ( u.pathname === '/api/edits' && req.method === 'POST' ) {

			let body = ''; for await ( const c of req ) body += c;
			const edits = JSON.parse( body );
			writeFileSync( EDITS, JSON.stringify( edits, null, '\t' ) + '\n' );
			res.writeHead( 200, { 'content-type': 'application/json' } ); return res.end( '{"saved":true}' );

		}

		res.writeHead( 404 ); res.end();

	} catch ( e ) { res.writeHead( 500, { 'content-type': 'text/plain' } ); res.end( String( e && e.stack || e ) ); }

} ).listen( PORT, () => console.log( `town editor: http://localhost:${ PORT }  (edits -> ${ path.relative( ROOT, EDITS ) })` ) );
