// Numbers on the terrain patch the region is built on (M0 audit of docs/slavonia/DESIGN.md).
//   node tools/checks/terrain.mjs
import { loadTerrain, readJSON, check, finish } from './load.mjs';

let t = performance.now();
const T = await loadTerrain();
console.log( `TileTerrain ${ ( performance.now() - t ).toFixed( 0 ) } ms; datum ${ T.datum.toFixed( 2 ) } m; patch ${ T.size } m at ${ T.texel } m; outside ${ T.outside.toFixed( 2 ) } m` );
const { res, heights: H, water: W, origin, texel, far } = T;
const n = res * res;

// ---- the seam between the metre patch and the 10 m field around it
{

	let worst = 0, sum = 0, cnt = 0, at = null;
	const edge = T.size / 2;
	for ( let s = - edge; s <= edge; s += 1 ) for ( const [ x, z ] of [ [ s, - edge ], [ s, edge ], [ - edge, s ], [ edge, s ] ] ) {

		// just inside against the coarse field at the same point
		const xi = Math.max( - edge + 1, Math.min( edge - 1, x ) ), zi = Math.max( - edge + 1, Math.min( edge - 1, z ) );
		const d = Math.abs( T.heightAt( xi, zi ) - T.farHeightAt( xi, zi ) );
		sum += d; cnt ++;
		if ( d > worst ) { worst = d; at = [ xi, zi ]; }

	}

	check( worst < 0.3, 'patch edge: metre field against the 10 m field', `mean ${ ( sum / cnt ).toFixed( 3 ) } m, worst ${ worst.toFixed( 2 ) } m at ${ at }` );

}

// ---- the far ring: is all of it exported?
{

	const index = readJSON( 'index.json' );
	const es = index.tiles.map( ( t ) => t.east ), ns = index.tiles.map( ( t ) => t.north );
	const cover = [ Math.min( ...es ), Math.max( ...es ) + index.tile, Math.min( ...ns ), Math.max( ...ns ) + index.tile ];
	const want = [ far.ox + T.center[ 0 ], far.ox + T.center[ 0 ] + ( far.res - 1 ) * far.texel, T.center[ 1 ] - far.oz - ( far.resZ - 1 ) * far.texel, T.center[ 1 ] - far.oz ];
	const whole = want[ 0 ] >= cover[ 0 ] && want[ 1 ] <= cover[ 1 ] && want[ 2 ] >= cover[ 2 ] && want[ 3 ] <= cover[ 3 ];
	check( whole, 'far field inside the exported tiles', `field ${ want } / tiles ${ cover }` );

}

// ---- one water plane: what the data says is wet against what the plane at 0 wets
{

	let wet = 0, wetDry = 0, dryFlooded = 0, clamped = 0;
	for ( let k = 0; k < n; k ++ ) {

		const w = W[ k ] === W[ k ];
		if ( w ) { wet ++; if ( H[ k ] > 0 ) wetDry ++; } else if ( H[ k ] < 0 ) dryFlooded ++;
		if ( ! w && H[ k ] > 0.19 && H[ k ] < 0.31 ) clamped ++;

	}

	console.log( `     water ${ ( wet / n * 100 ).toFixed( 2 ) } % of the patch` );
	check( wetDry / Math.max( 1, wet ) < 0.02, 'marked wet but above the water plane', `${ wetDry } texels (${ ( wetDry / wet * 100 ).toFixed( 1 ) } % of the water)` );
	check( dryFlooded === 0, 'marked dry but below the water plane', `${ dryFlooded } texels (${ ( dryFlooded / n * 100 ).toFixed( 2 ) } % of the patch)` );
	console.log( `     held at the flood clamp (0.2..0.3 m): ${ clamped } texels (${ ( clamped / n * 100 ).toFixed( 2 ) } %)` );

}

// ---- the water lines in the patch: their levels against the datum
{

	const edge = T.size / 2, [ cE, cN ] = T.center;
	const rows = [];
	for ( const l of T.lines ) {

		const inside = l.pts.filter( ( p ) => Math.abs( p[ 0 ] - cE ) < edge && Math.abs( cN - p[ 1 ] ) < edge );
		if ( ! inside.length ) continue;
		const lv = inside.map( ( p ) => p[ 2 ] - T.datum );
		rows.push( { name: l.name || '-', class: l.class, dry: l.dry, width: l.width, pts: inside.length, lo: Math.min( ...lv ), hi: Math.max( ...lv ) } );

	}

	const by = {};
	for ( const r of rows ) { const k = `${ r.class }${ r.dry ? ' (dry)' : '' }`; ( by[ k ] = by[ k ] || [] ).push( r ); }
	for ( const [ k, v ] of Object.entries( by ) ) console.log( `     ${ k }: ${ v.length } lines, level ${ Math.min( ...v.map( ( r ) => r.lo ) ).toFixed( 2 ) } .. ${ Math.max( ...v.map( ( r ) => r.hi ) ).toFixed( 2 ) } m over the datum` );
	const wetOff = rows.filter( ( r ) => ! r.dry && ( r.hi > 0.3 || r.lo < - 0.3 ) );
	check( wetOff.length === 0, 'wet lines within 0.3 m of the one water plane', `${ wetOff.length } of ${ rows.filter( ( r ) => ! r.dry ).length } are not: ${ wetOff.slice( 0, 6 ).map( ( r ) => `${ r.name } ${ r.class } ${ r.lo.toFixed( 2 ) }..${ r.hi.toFixed( 2 ) }` ).join( '; ' ) }` );

}

// ---- slopes: the steepest ground, texel to texel (the data is a lowland; anything steep is a cut)
{

	let steep = 0, worst = 0;
	for ( let j = 0; j < res - 1; j ++ ) for ( let i = 0; i < res - 1; i ++ ) {

		const k = j * res + i;
		const g = Math.max( Math.abs( H[ k + 1 ] - H[ k ] ), Math.abs( H[ k + res ] - H[ k ] ) ) / texel;
		if ( g > 1 ) steep ++;
		if ( g > worst ) worst = g;

	}

	check( worst <= 1.01, 'steepest step between texels', `${ worst.toFixed( 2 ) } m per m; ${ steep } texels over 1:1` );

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
		const x = f.ox + ( q % f.res + 0.5 ) * f.texel, z = f.oz + ( Math.floor( q / f.res ) + 0.5 ) * f.texel;
		if ( T.heightAt( x, z ) > 0 ) onLand ++;

	}

	console.log( `     current: ${ moving } cells of ${ f.texel } m, fastest ${ top.toFixed( 3 ) } m/s; the far grid it is resampled onto is ${ far.texel } m` );
	check( onLand / Math.max( 1, moving ) < 0.05, 'current cells whose centre is dry land', `${ onLand } of ${ moving }` );

}

finish();
