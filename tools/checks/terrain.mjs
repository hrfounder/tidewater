// Numbers on the ground of the Slavonian world (docs/slavonia/DESIGN.md, section 7).
//   node tools/checks/terrain.mjs
import { Polygon } from './polygon.mjs';
import { load, readJSON, check, finish } from './load.mjs';

let t = performance.now();
const { terrain: T, site } = await load();
console.log( `world ${ ( performance.now() - t ).toFixed( 0 ) } ms; datum ${ T.datum.toFixed( 2 ) } m; patch ${ T.size } m at ${ T.texel } m; plain beyond the tiles ${ T.outside.toFixed( 2 ) } m` );
const { res, heights: H, origin, texel, far } = T;
const n = res * res;
const xOf = ( k ) => origin + ( k % res + 0.5 ) * texel, zOf = ( k ) => origin + ( Math.floor( k / res ) + 0.5 ) * texel;

// ---- the water the plane wets against the water the map draws
{

	const json = readJSON( 'water.json' );
	const [ cE, cN ] = T.center;
	const half = T.size / 2;
	let mapped = 0, wetMapped = 0, wet = 0, wetOwned = 0;
	const areas = json.areas.map( ( a ) => new Polygon( a.rings.map( ( r ) => r.map( ( [ e, nn ] ) => [ e - cE, cN - nn ] ) ) ) );
	const inPatch = areas.filter( ( a ) => a.x1 > - half && a.x0 < half && a.z1 > - half && a.z0 < half );
	for ( let k = 0; k < n; k ++ ) {

		const isWet = H[ k ] < 0;
		if ( isWet ) { wet ++; if ( site.water.owner[ k ] >= 0 ) wetOwned ++; }
		// one texel in nine against the polygons (the test is the slow part)
		if ( k % 3 || Math.floor( k / res ) % 3 ) continue;
		const x = xOf( k ), z = zOf( k );
		if ( inPatch.some( ( a ) => a.contains( x, z ) ) ) { mapped ++; if ( isWet ) wetMapped ++; }

	}

	console.log( `     water ${ ( wet / n * 100 ).toFixed( 2 ) } % of the patch` );
	check( wetMapped === mapped, 'mapped water that is under the plane', `${ wetMapped } of ${ mapped } sampled texels` );
	check( wetOwned === wet, 'water that belongs to a mapped body', `${ wetOwned } of ${ wet } wet texels` );

}

// ---- the Bosut as wide as the map draws it
{

	const widths = [];
	const course = site.water.bodies.find( ( b ) => b.kind === 'line' && b.name === 'Bosut' && b.pts.some( ( p ) => Math.abs( p[ 0 ] ) < 200 && Math.abs( p[ 1 ] ) < 200 ) );
	for ( let s = 1; s + 1 < course.pts.length; s += 5 ) {

		const [ x, z, , inside ] = course.pts[ s ];
		if ( ! inside || Math.abs( x ) > T.size / 2 - 60 || Math.abs( z ) > T.size / 2 - 60 ) continue;
		const [ ax, az ] = course.pts[ s - 1 ], [ bx, bz ] = course.pts[ s + 1 ];
		const l = Math.hypot( bx - ax, bz - az ), nx = - ( bz - az ) / l, nz = ( bx - ax ) / l;
		let w = 0;
		for ( const side of [ 1, - 1 ] ) for ( let d = 0; d < 60; d += 0.25 ) {

			if ( T.heightAt( x + nx * d * side, z + nz * d * side ) >= 0 ) break;
			w += 0.25;

		}

		widths.push( w );

	}

	widths.sort( ( a, b ) => a - b );
	const lo = widths[ 0 ], mid = widths[ widths.length >> 1 ], hi = widths.at( - 1 );
	// the map: 32.9 to 55.1 m across the centreline in the old 2 km patch, median 40.1
	check( mid > 37 && mid < 44, 'the Bosut across its course', `${ lo.toFixed( 1 ) } to ${ hi.toFixed( 1 ) } m, median ${ mid.toFixed( 1 ) } m over ${ widths.length } sections` );

}

// ---- slopes
{

	// Steep ground is expected where something built crowds the water: the fill under a road or a
	// building beside a bank. Anywhere else it is a fault of the cut.
	let steep = 0, built = 0, worst = 0, low = 0;
	for ( let j = 0; j < res - 1; j ++ ) for ( let i = 0; i < res - 1; i ++ ) {

		const k = j * res + i;
		if ( H[ k ] >= 0 && H[ k ] < 0.01 && site.water.owner[ k ] < 0 ) low ++;
		const g = Math.max( Math.abs( H[ k + 1 ] - H[ k ] ), Math.abs( H[ k + res ] - H[ k ] ) ) / texel;
		if ( g <= 1 ) continue;
		if ( g > worst ) worst = g;
		const x = xOf( k ), z = zOf( k );
		if ( site.roads.nearest( x, z, 10 ) || site.buildings.near( x, z, 20 ).length ) built ++; else steep ++;

	}

	console.log( `     ground over 1:1 beside a road or a building: ${ built } texels, steepest ${ worst.toFixed( 2 ) } m per m` );
	check( steep === 0, 'ground over 1:1 anywhere else', `${ steep } texels` );
	check( low === 0, 'dry ground lying at the water plane outside any bank', `${ low } texels` );
	// how tall the banks of the river come out: the ground 40 m from the waterline along the course
	const tops = [];
	for ( let k = 0; k < n; k += 97 ) if ( Math.abs( T.coastDistance( xOf( k ), zOf( k ) ).d + 40 ) < 2 ) tops.push( H[ k ] );
	tops.sort( ( a, b ) => a - b );
	console.log( `     ground 40 m from the water: ${ tops[ Math.floor( tops.length * 0.1 ) ].toFixed( 2 ) } / ${ tops[ tops.length >> 1 ].toFixed( 2 ) } / ${ tops[ Math.floor( tops.length * 0.9 ) ].toFixed( 2 ) } m (10 % / median / 90 %)` );

}

// ---- the seam between the metre patch and the 10 m field around it
{

	let worst = 0, sum = 0, cnt = 0, over = 0, at = null;
	const edge = T.size / 2 - 1;
	for ( let s = - edge; s <= edge; s += 1 ) for ( const [ x, z ] of [ [ s, - edge ], [ s, edge ], [ - edge, s ], [ edge, s ] ] ) {

		const d = Math.abs( T.heightAt( x, z ) - T.farHeightAt( x, z ) );
		sum += d; cnt ++;
		if ( d > 0.3 ) over ++;
		if ( d > worst ) { worst = d; at = [ x, z ]; }

	}

	console.log( `     patch edge, metre field against the 10 m field: mean ${ ( sum / cnt ).toFixed( 3 ) } m, worst ${ worst.toFixed( 2 ) } m at ${ at }; ${ over } of ${ cnt } points over 0.3 m` );
	check( sum / cnt < 0.05, 'patch edge, mean step', `${ ( sum / cnt ).toFixed( 3 ) } m` );

}

// ---- the current
{

	const f = T.flow;
	let moving = 0, onLand = 0, top = 0;
	for ( let q = 0; q < f.res * f.res; q ++ ) {

		const v = Math.hypot( f.data[ q * 2 ], f.data[ q * 2 + 1 ] );
		if ( v === 0 ) continue;
		moving ++;
		if ( v > top ) top = v;
		if ( T.heightAt( f.ox + ( q % f.res + 0.5 ) * f.texel, f.oz + ( Math.floor( q / f.res ) + 0.5 ) * f.texel ) >= 0 ) onLand ++;

	}

	check( onLand === 0 && moving > 0, 'current only over water', `${ moving } cells of ${ f.texel } m moving, ${ onLand } of them on land; fastest ${ top.toFixed( 3 ) } m/s` );

}

finish();
