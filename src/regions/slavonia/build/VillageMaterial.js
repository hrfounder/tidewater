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
// metres of surface under a pixel: the fine detail is all there below the first, gone by the second
const FINE = [ 0.06, 0.14 ];
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
	// the weather every surface takes: broad uneven fading, by building; age is how much of it
	// (the seed: a building is as worn as it is old)
	let fade = vilFbm( P * 0.45 + seed * 31.0 );
	let age = seed;
	// How much of the fine detail this pixel can show: all of it while a pixel covers under FINE[ 0 ]
	// metres of the surface, none past FINE[ 1 ]. From a distance a wall is its colour and its large
	// stains, and what would only average out is not worked out at all.
	let px = max( fwidth( P.x ) + fwidth( P.y ) + fwidth( P.z ), 1e-4 );
	let fine = 1.0 - smoothstep( ${ f( FINE[ 0 ] ) }, ${ f( FINE[ 1 ] ) }, px );
	if ( pat == ${ SURFACE.render } ) {
		// Lime render. Mottled at two scales; streaked where the rain runs down it; dark and green
		// toward the ground where the damp rises; cracked; and on an old wall fallen away in patches
		// low down, the brick showing through.
		let damp = ( 1.0 - smoothstep( 0.0, 0.5 + 0.9 * age, uv.y + ( fade - 0.5 ) * 0.9 ) ) * ( 0.35 + 0.65 * age );
		col = base * mix( 0.86, 1.08, fade );
		if ( fine > 0.0 ) {
			let mottle = mix( 0.95, 1.04, vilFbm( P * 2.3 + 11.0 ) );
			let streak = smoothstep( 0.52, 0.8, vilFbm( vec3f( uv.x * 5.0, uv.y * 0.3, seed * 7.0 ) ) ) * ( 0.25 + 0.75 * age );
			let crackN = abs( vilFbm( P * 1.9 + seed * 19.0 ) - 0.5 );
			let crack = ( 1.0 - smoothstep( 0.0, 0.006 + px * 0.25, crackN ) ) * smoothstep( 0.35, 0.7, age ) * ( 1.0 - smoothstep( 0.01, 0.05, px ) );
			col *= mix( 1.0, mottle * ( 1.0 - 0.45 * crack ), fine );
			col = mix( col, col * vec3f( 0.8, 0.8, 0.76 ), streak * 0.55 * fine );
			h = ( vilNoise( P * 60.0 ) * 0.0007 - crack * 0.002 ) * fine;
		}
		col = mix( col, col * vec3f( 0.6, 0.66, 0.54 ), damp );
		// fallen render: under 2 m, on the oldest third of the buildings
		let fallen = smoothstep( 0.0, 0.06, vilFbm( P * 0.8 + seed * 53.0 ) - 0.47 - uv.y * 0.16 ) * smoothstep( 0.62, 0.72, age );
		if ( fallen > 0.0 ) {
			let c = vilCourses( uv, vec2f( ${ f( BRICK.w ) }, ${ f( BRICK.h ) } ), ${ f( JOINT ) } );
			let brick = vec3f( 0.36, 0.13, 0.08 ) * ( 0.8 + 0.4 * vilHash2( c.xy + seed * 57.0 ) );
			let bared = mix( vec3f( 0.3, 0.2, 0.15 ), mix( vec3f( 0.42, 0.4, 0.36 ), brick, c.z ), c.w );
			col = mix( col, bared, fallen );
			h = mix( h, c.z * 0.004 * c.w - 0.012, fallen );
			rough = mix( rough, 0.95, fallen );
		}
	} else if ( pat == ${ SURFACE.tile } ) {
		// Plain clay tiles in overlapping rows: each tile its own shade and its own red, the foot of
		// every row in the shadow of its own thickness, lichen in pale spots, old roofs darkened and
		// mossed in patches, dirt run down the slope.
		let c = vilCourses( uv, vec2f( ${ f( TILE.width ) }, ${ f( TILE.row ) } ), 0.008 );
		let fy = fract( uv.y / ${ f( TILE.row ) } );
		let shade = vilHash2( c.xy + seed * 91.0 );
		let hue = vilHash2( c.yx + seed * 17.0 );
		let foot = 1.0 - smoothstep( 0.0, 0.16, fy );
		let tile = ( 0.74 + 0.46 * shade ) * mix( vec3f( 1.1, 0.96, 0.9 ), vec3f( 0.88, 0.98, 1.04 ), hue );
		let detail = mix( vec3f( 1.0 ), tile * mix( 0.7, 1.0, c.z ) * ( 1.0 - 0.5 * foot ), c.w );
		let moss = smoothstep( 0.62, 0.8, fade + age * 0.25 ) * age;
		col = base * detail * mix( 0.84, 1.06, fade );
		if ( fine > 0.0 ) {
			let run = smoothstep( 0.45, 0.8, vilFbm( vec3f( uv.x * 3.0, uv.y * 0.25, seed * 5.0 ) ) ) * ( 0.3 + 0.7 * age );
			let lichen = smoothstep( 0.8, 0.86, vilNoise( vec3f( uv * 24.0, seed * 3.0 ) ) ) * smoothstep( 0.45, 0.6, vilFbm( vec3f( uv * 0.8, seed * 11.0 ) ) ) * smoothstep( 0.3, 0.8, age ) * c.w;
			col = mix( col, col * vec3f( 0.62, 0.6, 0.58 ), run * 0.5 * fine );
			col = mix( col, vec3f( 0.42, 0.42, 0.33 ), lichen * 0.5 * fine );
		}
		col = mix( col, col * vec3f( 0.55, 0.62, 0.42 ), moss * 0.7 );
		h = ( fy * 0.014 - foot * 0.005 ) * c.w;
		rough = mix( rough, 0.95, moss );
	} else if ( pat == ${ SURFACE.sheet } ) {
		// profiled sheet: ribs up the slope, rust creeping from the laps
		let r = uv.x / ${ f( RIB ) };
		let keep = vilKeep( fwidth( r ) );
		let rib = cos( r * 6.2832 );
		let rust = smoothstep( 0.6, 0.85, vilFbm( vec3f( uv.x * 2.5, uv.y * 0.4, seed * 13.0 ) ) + age * 0.2 ) * age;
		col = mix( base * ( 1.0 + 0.08 * rib * keep ), vec3f( 0.22, 0.1, 0.05 ), rust * 0.75 ) * mix( 0.9, 1.05, fade );
		h = rib * 0.012 * keep;
		rough = mix( rough, 0.9, rust );
	} else if ( pat == ${ SURFACE.brick } || pat == ${ SURFACE.block } ) {
		// fired clay in a grey mortar: bricks, or the hollow blocks of a house that was never rendered;
		// the damp darkens the courses near the ground, and white salts bloom above it
		let size = select( vec2f( ${ f( BRICK.w ) }, ${ f( BRICK.h ) } ), vec2f( ${ f( BLOCK.w ) }, ${ f( BLOCK.h ) } ), pat == ${ SURFACE.block } );
		let c = vilCourses( uv, size, ${ f( JOINT ) } );
		let shade = vilHash2( c.xy + seed * 57.0 );
		let unit = base * ( 0.8 + 0.4 * shade ) * mix( vec3f( 1.06, 0.98, 0.94 ), vec3f( 0.92, 0.98, 1.02 ), vilHash2( c.yx + 3.0 ) );
		col = mix( base * 0.95, mix( vec3f( 0.42, 0.41, 0.38 ), unit, c.z ), c.w ) * mix( 0.88, 1.06, fade );
		let damp = ( 1.0 - smoothstep( 0.0, 0.7, uv.y + ( fade - 0.5 ) * 0.8 ) ) * ( 0.3 + 0.7 * age );
		let salt = smoothstep( 0.6, 0.8, vilFbm( P * 1.6 + seed * 23.0 ) ) * ( 1.0 - smoothstep( 0.6, 1.8, uv.y ) ) * age;
		col = mix( mix( col, col * vec3f( 0.62, 0.64, 0.58 ), damp ), vec3f( 0.6, 0.58, 0.54 ), salt * 0.35 );
		h = c.z * 0.004 * c.w;
	} else if ( pat == ${ SURFACE.boards } ) {
		// upright boards gone grey in the weather, a dark gap between each, darker toward the ground
		let q = uv.x / ${ f( BOARD ) };
		let px = fwidth( q );
		let keep = vilKeep( px );
		let cell = fract( q );
		let gap = 1.0 - smoothstep( 0.03 - px, 0.03 + px, min( cell, 1.0 - cell ) );
		let grain = vilFbm( vec3f( uv.x * 30.0, uv.y * 1.6, floor( q ) * 7.0 ) );
		col = base * mix( 1.0, ( 0.8 + 0.35 * vilHash2( vec2f( floor( q ), seed * 43.0 ) ) ) * mix( 0.85, 1.1, grain ), keep ) * ( 1.0 - 0.6 * gap * keep ) * mix( 0.88, 1.05, fade );
		col *= mix( 0.72, 1.0, smoothstep( 0.0, 0.6, uv.y + ( fade - 0.5 ) * 0.5 ) );
		h = ( grain * 0.0012 - gap * 0.006 ) * keep;
	} else if ( pat == ${ SURFACE.glass } ) {
		// window glass: dark behind, the sky in it, never quite flat, and behind most of it a net
		// curtain hanging in folds
		let curtain = step( 0.25, fract( seed * 7.3 ) );
		let folds = 0.5 + 0.5 * sin( uv.x * 46.0 + sin( uv.y * 3.0 + seed * 20.0 ) * 1.5 );
		col = mix( base, vec3f( 0.42, 0.42, 0.4 ) * ( 0.6 + 0.4 * folds ), curtain * 0.45 * vilKeep( fwidth( uv.x * 7.3 ) ) );
		h = vilNoise( vec3f( uv * 2.2, seed * 9.0 ) ) * 0.0008;
	} else if ( pat == ${ SURFACE.concrete } ) {
		// concrete: pores, pale blotches, the damp at its foot
		let pores = vilNoise( P * 90.0 );
		col = base * mix( 0.82, 1.08, fade ) * mix( 0.94, 1.05, vilFbm( P * 3.1 ) ) * ( 1.0 - 0.14 * smoothstep( 0.7, 0.9, pores ) );
		col = mix( col, col * vec3f( 0.6, 0.66, 0.56 ), ( 1.0 - smoothstep( 0.0, 0.35, uv.y + ( fade - 0.5 ) * 0.5 ) ) * 0.6 );
		h = pores * 0.0007;
	} else {
		// paint: evenly faded, chalking a little
		col = base * mix( 0.9, 1.06, fade ) * mix( 0.96, 1.03, vilNoise( P * 9.0 ) );
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
