import { standard } from '../../../materials/Materials.js';
import { ShaderModule } from '../../../engine/gpu/Shader.js';
import { commonModule } from '../../../engine/render/wgsl/common.js';

// The one material of the village: everything built on the Site is drawn with it, in a handful of
// meshes. A vertex carries its colour (linear albedo) and aux = ( roughness, metalness, pattern, seed );
// the pattern says what the surface is made of, and the seed (0..1, one per building) makes each
// building weather its own way. uv is in metres on the surface: across and up a wall, along the
// eaves and up the slope of a roof.
//
// The surfaces are drawn by rule, not from textures: the fragment stage has no texture slots to
// spare (docs/slavonia/DESIGN.md, section 4), and a rule is as sharp close up as far away.
export const SURFACE = { plain: 0, render: 1, tile: 2, sheet: 3, brick: 4, block: 5, boards: 6, glass: 7, concrete: 8 };

// what the rules are drawn to (m): the exposed length and the width of a plain clay tile, the pitch
// of a sheet's ribs, a brick and a hollow clay block with their joint, a board
const TILE = { row: 0.165, width: 0.19 };
const RIB = 0.2;
const BRICK = { w: 0.25, h: 0.077 }, BLOCK = { w: 0.38, h: 0.25 }, JOINT = 0.012;
const BOARD = 0.14;
const f = ( v ) => v.toFixed( 4 );

const villageModule = new ShaderModule( {
	name: 'village',
	deps: [ commonModule ],
	code: /* wgsl */`
fn vilHash2( p: vec2f ) -> f32 { return fract( sin( dot( p, vec2f( 127.1, 311.7 ) ) ) * 43758.5453 ); }
fn vilHash3( p: vec3f ) -> f32 { return fract( sin( dot( p, vec3f( 127.1, 311.7, 74.7 ) ) ) * 43758.5453 ); }
fn vilNoise( p: vec3f ) -> f32 {
	let i = floor( p ); let f = fract( p ); let u = f * f * ( 3.0 - 2.0 * f );
	let a = mix( mix( vilHash3( i ), vilHash3( i + vec3f( 1, 0, 0 ) ), u.x ), mix( vilHash3( i + vec3f( 0, 1, 0 ) ), vilHash3( i + vec3f( 1, 1, 0 ) ), u.x ), u.y );
	let b = mix( mix( vilHash3( i + vec3f( 0, 0, 1 ) ), vilHash3( i + vec3f( 1, 0, 1 ) ), u.x ), mix( vilHash3( i + vec3f( 0, 1, 1 ) ), vilHash3( i + vec3f( 1, 1, 1 ) ), u.x ), u.y );
	return mix( a, b, u.z );
}
fn vilFbm( p: vec3f ) -> f32 { return vilNoise( p ) * 0.55 + vilNoise( p * 2.13 + 7.1 ) * 0.3 + vilNoise( p * 4.7 + 3.3 ) * 0.15; }
// a normal bent by a height field given on the surface (metres)
fn vilBump( P: vec3f, N: vec3f, height: f32 ) -> vec3f {
	let dPdx = dpdx( P ); let dPdy = dpdy( P );
	let r1 = cross( dPdy, N ); let r2 = cross( N, dPdx );
	let det = dot( dPdx, r1 );
	let grad = sign( det ) * ( dpdx( height ) * r1 + dpdy( height ) * r2 );
	return normalize( abs( det ) * N - grad + N * 1e-12 );
}
// How much of a repeating detail is left when a pixel covers px of one repeat: all of it while a
// repeat is several pixels wide, none by the time it is two (below that it can only alias).
fn vilKeep( px: f32 ) -> f32 { return 1.0 - smoothstep( 0.12, 0.45, px ); }
// Masonry in courses: cell size, joint width. Returns ( the unit's id.x, id.y, 1 on the unit / 0 in
// the joint, how much of the detail is left at this distance ).
fn vilCourses( uv: vec2f, size: vec2f, joint: f32 ) -> vec4f {
	let row = floor( uv.y / size.y );
	let q = vec2f( uv.x / size.x + 0.5 * ( row - 2.0 * floor( row * 0.5 ) ), uv.y / size.y );
	let cell = fract( q );
	let px = fwidth( q );
	let j = vec2f( joint ) / size;
	let on = smoothstep( j.x * 0.5 - px.x, j.x * 0.5 + px.x, min( cell.x, 1.0 - cell.x ) ) * smoothstep( j.y * 0.5 - px.y, j.y * 0.5 + px.y, min( cell.y, 1.0 - cell.y ) );
	let keep = vilKeep( max( px.x, px.y ) );
	return vec4f( floor( q.x ), row, on, keep );
}
`,
} );

export function createVillageMaterial() {

	const m = standard( {
		name: 'Village',
		vertexColors: true,
		// a roof is a sheet, seen from under the eaves too
		side: 'double',
		modules: [ villageModule ],
		attributes: { aux: 'vec4f' },
		varyings: { vAux: 'vec4f' },
		vertex: 'o.vAux = v.aux;',
	} );
	m.surface = /* wgsl */`
	let base = in.color.rgb;
	var rough = in.vs.vAux.x;
	let metal = in.vs.vAux.y;
	let pat = i32( in.vs.vAux.z + 0.5 );
	let seed = in.vs.vAux.w;
	let P = in.P;
	let uv = in.uv;
	var col = base;
	var h = 0.0;
	// the weather every surface takes: broad uneven fading, by building
	let fade = vilFbm( P * 0.45 + seed * 31.0 );
	if ( pat == ${ SURFACE.render } ) {
		// lime render: mottled, darker and stained toward the ground where the damp rises, a fine grain
		let damp = 1.0 - smoothstep( 0.0, 0.9, uv.y + ( fade - 0.5 ) * 0.9 );
		col = base * mix( 0.9, 1.06, fade ) * mix( 1.0, 0.74, damp * ( 0.4 + 0.6 * seed ) );
		h = vilNoise( P * 60.0 ) * 0.0006;
	} else if ( pat == ${ SURFACE.tile } ) {
		// plain clay tiles in overlapping rows: each tile its own shade, the foot of every row in the
		// shadow of its own thickness, old roofs darkened and mossed in patches
		let c = vilCourses( uv, vec2f( ${ f( TILE.width ) }, ${ f( TILE.row ) } ), 0.008 );
		let fy = fract( uv.y / ${ f( TILE.row ) } );
		let shade = vilHash2( c.xy + seed * 91.0 );
		let foot = 1.0 - smoothstep( 0.0, 0.16, fy );
		let detail = mix( 1.0, ( 0.82 + 0.3 * shade ) * mix( 0.72, 1.0, c.z ) * ( 1.0 - 0.45 * foot ), c.w );
		let moss = smoothstep( 0.62, 0.8, fade + seed * 0.25 ) * seed;
		col = mix( base * detail, base * detail * vec3f( 0.55, 0.62, 0.42 ), moss * 0.7 ) * mix( 0.86, 1.05, fade );
		h = ( fy * 0.012 - foot * 0.004 ) * c.w;
		rough = mix( rough, 0.95, moss );
	} else if ( pat == ${ SURFACE.sheet } ) {
		// profiled sheet: ribs up the slope, rust creeping from the laps
		let r = uv.x / ${ f( RIB ) };
		let keep = vilKeep( fwidth( r ) );
		let rib = cos( r * 6.2832 );
		let rust = smoothstep( 0.6, 0.85, vilFbm( vec3f( uv.x * 2.5, uv.y * 0.4, seed * 13.0 ) ) + seed * 0.2 ) * seed;
		col = mix( base * ( 1.0 + 0.08 * rib * keep ), vec3f( 0.22, 0.1, 0.05 ), rust * 0.75 ) * mix( 0.9, 1.05, fade );
		h = rib * 0.012 * keep;
		rough = mix( rough, 0.9, rust );
	} else if ( pat == ${ SURFACE.brick } || pat == ${ SURFACE.block } ) {
		// fired clay in a grey mortar: bricks, or the hollow blocks of a house that was never rendered
		let size = select( vec2f( ${ f( BRICK.w ) }, ${ f( BRICK.h ) } ), vec2f( ${ f( BLOCK.w ) }, ${ f( BLOCK.h ) } ), pat == ${ SURFACE.block } );
		let c = vilCourses( uv, size, ${ f( JOINT ) } );
		let shade = vilHash2( c.xy + seed * 57.0 );
		let unit = base * ( 0.84 + 0.3 * shade );
		col = mix( base * 0.95, mix( vec3f( 0.42, 0.41, 0.38 ), unit, c.z ), c.w ) * mix( 0.9, 1.05, fade );
		h = c.z * 0.004 * c.w;
	} else if ( pat == ${ SURFACE.boards } ) {
		// upright boards gone grey in the weather, a dark gap between each
		let q = uv.x / ${ f( BOARD ) };
		let px = fwidth( q );
		let keep = vilKeep( px );
		let cell = fract( q );
		let gap = 1.0 - smoothstep( 0.03 - px, 0.03 + px, min( cell, 1.0 - cell ) );
		let grain = vilFbm( vec3f( uv.x * 30.0, uv.y * 1.6, floor( q ) * 7.0 ) );
		col = base * mix( 1.0, ( 0.8 + 0.35 * vilHash2( vec2f( floor( q ), seed * 43.0 ) ) ) * mix( 0.85, 1.1, grain ), keep ) * ( 1.0 - 0.6 * gap * keep ) * mix( 0.88, 1.05, fade );
		h = ( grain * 0.0012 - gap * 0.006 ) * keep;
	} else if ( pat == ${ SURFACE.glass } ) {
		// window glass: dark behind, the sky in it, never quite flat
		col = base;
		h = vilNoise( vec3f( uv * 2.2, seed * 9.0 ) ) * 0.0008;
	} else if ( pat == ${ SURFACE.concrete } ) {
		let pores = vilNoise( P * 90.0 );
		col = base * mix( 0.86, 1.06, fade ) * ( 1.0 - 0.12 * smoothstep( 0.7, 0.9, pores ) );
		h = pores * 0.0006;
	} else {
		col = base * mix( 0.94, 1.04, fade );
	}
	// under a roof: the boards it is laid on, not its covering
	if ( ( pat == ${ SURFACE.tile } || pat == ${ SURFACE.sheet } ) && ! in.front ) {
		col = vec3f( 0.2, 0.15, 0.1 ) * mix( 0.85, 1.1, fade );
		rough = 0.9;
		h = 0.0;
	}
	s.albedo = col;
	s.roughness = rough;
	s.metalness = metal;
	s.normal = vilBump( P, in.N, h );
`;
	return m;

}
