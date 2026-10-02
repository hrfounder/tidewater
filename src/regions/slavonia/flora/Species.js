import * as THREE from '../../../engine/index.js';
import { GeoBuilder } from '../../../world/vegetation/GeoBuilder.js';
import { vegModule } from '../../../world/vegetation/VegNodes.js';
import { ShaderModule } from '../../../engine/gpu/Shader.js';

// What grows on the Bosut floodplain, as the photographs and the aerial imagery show it
// (docs/slavonia/photos, docs/slavonia/img). One entry per kind of plant:
//
//   shape    the tree it is grown from (the specs below; a kind may share another's shape at its
//            own size, as the lime of the street and the plum of the yard do the oak's)
//   size     [ least, most ]: the instance's scale on that shape
//   greens   its leaves' colour, from the shaded inside of the crown to the lit outside (linear)
//   silver   the undersides of its leaves flash pale when the wind turns them
export const PLANTS = {
	willow: { shape: 'willow', size: [ 0.85, 1.25 ], greens: [ [ 0.205, 0.268, 0.146 ], [ 0.300, 0.360, 0.222 ] ], silver: true },
	poplar: { shape: 'poplar', size: [ 0.85, 1.2 ], greens: [ [ 0.236, 0.316, 0.130 ], [ 0.352, 0.430, 0.190 ] ], silver: true },
	oak: { shape: 'oak', size: [ 0.8, 1.3 ], greens: [ [ 0.140, 0.228, 0.094 ], [ 0.226, 0.316, 0.132 ] ], silver: false },
	// Tilia, Juglans: the tree of the street verge and the big tree of a yard
	lime: { shape: 'oak', size: [ 0.5, 0.72 ], greens: [ [ 0.160, 0.262, 0.100 ], [ 0.262, 0.372, 0.150 ] ], silver: false },
	// Prunus domestica and the other fruit trees: small, round, in every yard
	plum: { shape: 'oak', size: [ 0.26, 0.38 ], greens: [ [ 0.150, 0.236, 0.090 ], [ 0.244, 0.338, 0.140 ] ], silver: false },
};

// A tree is drawn as geometry within this of the camera (m) and as an impostor of the same crown
// beyond. One distance for every tree: the canopy material hands over at one.
export const TREE_NEAR = 90;

// A tree's kind rides on its record's seed: the kind is which of the equal bands of
// fract( seed * BAND ) the seed falls in, in the order of PLANTS.
const KINDS = Object.keys( PLANTS ), BAND = 3.37;

// a seed in 0..1 for a tree of `kind`: rnd() picks which, of all the seeds of its band
export function seedOf( kind, rnd ) {

	const k = KINDS.indexOf( kind ), whole = Math.floor( rnd() * Math.floor( BAND ) );
	return ( whole + ( k + 0.1 + 0.8 * rnd() ) / KINDS.length ) / BAND;

}

// which of a shape's grown variants a tree is (0, 1, 2): from its seed, the same near and far
export const VARIANTS = 3;
export const variantOf = ( seed ) => Math.floor( ( ( seed * 7.13 ) % 1 ) * VARIANTS );
export const variantWGSL = ( seed ) => `floor( fract( ${ seed } * 7.13 ) * ${ VARIANTS }.0 )`;

// WGSL: `let green: vec3f` and `let silver: f32` for the tree whose seed and crown ratio are in
// scope as `seed` and `cr`
const v3 = ( c ) => `vec3f( ${ c.map( ( x ) => x.toFixed( 3 ) ).join( ', ' ) } )`;
const GREEN = `
	let kind = floor( fract( seed * ${ BAND } ) * ${ KINDS.length }.0 );
	var green = vec3f( 0.0 ); var silver = 0.0;
${ KINDS.map( ( k, i ) => `	if ( kind == ${ i }.0 ) { green = mix( ${ v3( PLANTS[ k ].greens[ 0 ] ) }, ${ v3( PLANTS[ k ].greens[ 1 ] ) }, cr ); silver = ${ PLANTS[ k ].silver ? '1.0' : '0.0' }; }` ).join( '\n' ) }
`;

// The far crowns: the impostor atlas stores only brightness and whether a texel is leaf or limb, so
// the colour is put back from the same greens.
export const farLeafModule = new ShaderModule( {
	name: 'slavoniaFarLeaf',
	deps: [ vegModule ],
	code: /* wgsl */`
fn slavoniaFarLeaf( seed: f32, cr: f32, leaf: f32, bright: f32 ) -> vec3f {
${ GREEN }
	let leafC = green * ( vegHash12( vec2f( seed * 17.3, 4.1 ) ) * 0.3 + 0.8 ) * ( bright * 1.4 );
	// limbs seen through the gaps sit in the crown's shade
	let barkC = mix( vec3f( 0.035, 0.032, 0.022 ), vec3f( 0.07, 0.065, 0.044 ), ( bright - 0.4 ) / 0.5 );
	return max( mix( barkC, leafC, smoothstep( 0.05, 0.55, leaf ) ), vec3f( 0.0 ) );
}
`,
} );

// The leaf stage of the canopy material for this region (VegMaterials.createCanopyMaterial): the
// greens of a Slavonian floodplain in summer, not the island's olives and bronzes.
export const LEAF_STAGE = /* wgsl */`
${ GREEN }
	// every tree a little different, and the undersides of the willow and poplar leaves silver
	var c = green * ( vegHash12( vec2f( seed * 17.3, 4.1 ) ) * 0.3 + 0.8 );
	c = mix( c, c * vec3f( 1.26, 1.3, 1.22 ) + vec3f( 0.05 ), silver * step( 0.55, fract( cell * 5.1 ) ) * 0.35 );
	// a few leaves already turning: the first yellow is in the poplars by late summer
	c = mix( c, vec3f( 0.44, 0.36, 0.11 ), step( 0.986, fract( cell * 3.7 ) ) * 0.55 );
	c = c * bright;
	// the sunlit outside of the crown warmer and brighter, the inside kept dark
	let outer = smoothstep( 0.62, 1.0, ao );
	c = mix( c, c * vec3f( 1.14, 1.2, 0.95 ), outer * 0.7 );
	let leaf = c * mix( 0.55, 1.0, ao );
`;

// ---------------------------------------------------------------- shapes

// Salix alba: short bole, a low wide crown, and limbs that reach out nearly level over the water.
const WILLOW = {
	H: 14,
	crown: { c: [ 0, 8.2, 0 ], r: [ 6.4, 3.0, 6.4 ] },
	fork: [ 0.2, 2.6, - 0.1 ],
	lobes: [
		[ 0.6, 8.4, - 0.5, 3.2 ],
		[ - 3.4, 7.2, 2.2, 2.9 ],
		[ 3.9, 6.8, 1.6, 2.8 ],
		[ 2.1, 6.0, - 3.9, 2.7 ],
		[ - 4.1, 5.6, - 2.4, 2.6 ],
		[ 0.5, 5.0, 4.4, 2.4 ],
		[ - 1.4, 9.6, - 2.1, 2.0 ],
		[ 4.6, 4.6, - 1.1, 2.1 ],
	],
	trunk: { r0: 0.42, r1: 0.3, taper: 0.12, fin: 0.5, flare: 0.35 },
	// limbs leave the fork almost level and bow far out: the willow's reach over the water
	limb: { r0: 0.2, r1: 0.055, r2: 0.09, r3: 0.03, rise: 0.06, bow: - 0.42 },
	clump: { per: 4.2, r: 0.8, cards: 3, size: 1.5, flatten: 0.55 },
	flexR: 6,
	sway: [ 2.2, 5.0 ],
	center: 6.0,
};

// Populus nigra 'Italica': a column. The lobes stack up the trunk instead of spreading.
const POPLAR = {
	H: 26,
	crown: { c: [ 0, 14.0, 0 ], r: [ 2.3, 9.0, 2.3 ] },
	fork: [ 0.05, 4.0, 0.0 ],
	lobes: [
		[ 0.1, 21.5, 0.0, 1.9 ],
		[ - 0.9, 17.4, 0.6, 2.2 ],
		[ 1.0, 14.8, - 0.5, 2.3 ],
		[ 0.4, 11.6, 1.0, 2.2 ],
		[ - 0.8, 9.0, - 0.8, 2.0 ],
		[ 0.7, 19.4, 0.7, 1.9 ],
		[ - 0.5, 12.8, - 1.1, 1.9 ],
		[ 0.2, 24.0, - 0.2, 1.5 ],
	],
	trunk: { r0: 0.34, r1: 0.26, taper: 0.16, fin: 0.25, flare: 0.2 },
	// limbs climb steeply and hug the trunk
	limb: { r0: 0.13, r1: 0.04, r2: 0.06, r3: 0.022, rise: 0.5, bow: - 0.05 },
	clump: { per: 4.6, r: 0.7, cards: 3, size: 1.25, flatten: 0.9 },
	flexR: 3,
	sway: [ 3.0, 12.0 ],
	center: 12.0,
};

// Quercus robur / Fraxinus: the floodplain wood, a heavy rounded crown on a straight bole.
const OAK = {
	H: 21,
	crown: { c: [ 0, 13.0, 0 ], r: [ 6.0, 4.4, 6.0 ] },
	fork: [ 0.15, 6.2, - 0.05 ],
	lobes: [
		[ 0.5, 16.2, - 0.4, 3.4 ],
		[ - 3.4, 13.6, 2.6, 3.1 ],
		[ 4.0, 12.8, 1.9, 3.0 ],
		[ 2.4, 11.4, - 4.0, 3.0 ],
		[ - 4.2, 10.6, - 2.6, 2.8 ],
		[ 0.6, 9.8, 4.6, 2.7 ],
		[ - 1.5, 18.0, - 2.2, 2.2 ],
		[ 4.8, 9.0, - 1.2, 2.3 ],
	],
	trunk: { r0: 0.52, r1: 0.4, taper: 0.1, fin: 0.7, flare: 0.3 },
	limb: { r0: 0.22, r1: 0.06, r2: 0.1, r3: 0.035, rise: 0.2, bow: - 0.3 },
	clump: { per: 4.0, r: 0.9, cards: 3, size: 1.6, flatten: 0.75 },
	flexR: 6,
	sway: [ 4.5, 9.0 ],
	center: 10.0,
};


// the shapes by name, each with the seeds its three variants are grown from
export const SHAPES = {
	willow: { spec: WILLOW, seeds: [ 101, 137, 173 ] },
	poplar: { spec: POPLAR, seeds: [ 211, 251, 283 ] },
	oak: { spec: OAK, seeds: [ 307, 349, 389 ] },
};

// how far a reed clump's blades are rooted under its origin, and how tall its tallest stand (m)
const REED_ROOT = 0.3;
export const REED_HEIGHT = 3.3;

// ---------------------------------------------------------------- reed

// A clump of common reed: a sheaf of tall blades with a feathered head, as cards. Part 2 is the
// fern part in the island's leaf material: a thin upright blade that the wind bends along its length.
export function buildReedClump( seed = 7, b = new GeoBuilder() ) {

	const rand = mulberry( seed );
	const blades = 16 + Math.round( rand() * 10 );
	for ( let i = 0; i < blades; i ++ ) {

		const a = rand() * Math.PI * 2;
		const r = Math.sqrt( rand() ) * 0.34;
		const len = REED_HEIGHT - 1.4 * rand();
		const lean = 0.12 + rand() * 0.24;
		// rooted under the clump's origin, so no blade ends in the air where the ground falls away
		const base = new THREE.Vector3( Math.cos( a ) * r, - REED_ROOT, Math.sin( a ) * r );
		const dir = new THREE.Vector3( Math.cos( a ) * lean, 1, Math.sin( a ) * lean ).normalize();
		const side = new THREE.Vector3( - dir.z, 0, dir.x ).normalize();
		const face = new THREE.Vector3().crossVectors( dir, side ).normalize();
		const w0 = 0.055 + rand() * 0.03;
		const ph = rand(), cr = rand(), card = rand();
		const rows = 4;
		let prev = null;
		for ( let k = 0; k <= rows; k ++ ) {

			const t = k / rows;
			// the blade narrows to the head and bends downwind the higher it goes
			const p = base.clone().addScaledVector( dir, len * t ).addScaledVector( side, 0 );
			p.y -= t * t * len * 0.12; // the arch of a reed leaf
			const w = w0 * ( 1 - t * 0.7 );
			const flex = t * t;
			const left = b.vertex( p.clone().addScaledVector( side, - w ), face, 0, t, [ Math.max( 0, p.y / REED_HEIGHT ), flex, 1, ph ], [ 2, 0.35 + 0.65 * t, cr, card ] );
			const right = b.vertex( p.clone().addScaledVector( side, w ), face, 1, t, [ Math.max( 0, p.y / REED_HEIGHT ), flex, 1, ph ], [ 2, 0.35 + 0.65 * t, cr, card ] );
			if ( prev ) b.quad( prev[ 0 ], prev[ 1 ], right, left );
			prev = [ left, right ];

		}

	}

	return { geometry: b.build( REED_HEIGHT, new THREE.Vector3( 0, REED_HEIGHT * 0.4, 0 ) ), triangles: b.triangles };

}

function mulberry( a ) {

	return function () {

		a |= 0; a = a + 0x6D2B79F5 | 0;
		let t = Math.imul( a ^ a >>> 15, 1 | a );
		t = t + Math.imul( t ^ t >>> 7, 61 | t ) ^ t;
		return ( ( t ^ t >>> 14 ) >>> 0 ) / 4294967296;

	};

}
