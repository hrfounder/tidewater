import { srgb as S, rot2 } from '../../world/terrain/TerrainShading.js';

// Ground of the Slavonian lowland: the terrain's surface stage for TileTerrain patches (passed to
// Terrain as `surface`). Reference: docs/slavonia/photos (the Bosut at Most Bosut) and the
// Sentinel-2 imagery in docs/slavonia/img.
//
// TileTerrain fills the splat map with its land cover (the island's channel names, its meaning):
//   x  cropland       strip fields: crops, stubble and ploughed soil by parcel
//   y  built-up       yards, gravel and packed earth between the houses
//   z  forest         leaf litter, moss and ivy on the forest floor
//   w  bank mud       bare, wet silt at the water's edge and on the channel banks below the grass
// Everything else is grass: mown on the river banks and verges, rougher meadow beyond. Under the
// water the bed is soft grey-brown silt.
export const GROUND_SURFACE = /* wgsl */`
	let p = in.P;
	let xz = p.xz;
	let h = p.y;
	let nr = terrainNormalRock( xz );
	let N0 = normalize( vec3f( nr.x, sqrt( max( 1.0 - nr.x * nr.x - nr.y * nr.y, 0.0025 ) ), nr.y ) );
	let sp = terrainSplat( xz );
	let slope = 1.0 - N0.y;
	let camDist = length( frame.cameraPos - p );

	// detail samples (tileable heights: x rock, y soil, z sand, w fbm) at several scales
	let macroA = terDetail( ${ rot2( 'xz', 0.7 ) } / 173.0 ).w;
	let macroB = terDetail( ${ rot2( 'xz', 2.1 ) } / 47.0 ).w;
	let dN = terDetail( xz / 1.9 );
	let dM = terDetail( ${ rot2( 'xz', 1.3 ) } / 6.7 + 0.21 );
	let dF = terDetail( ${ rot2( 'xz', 2.4 ) } / 0.63 + 0.53 );

	let fieldW = smoothstep( 0.35, 0.65, sp.x );
	let builtW = smoothstep( 0.35, 0.65, sp.y );
	let forestW = smoothstep( 0.35, 0.65, sp.z );
	let mudW = sat( sp.w * 1.4 );
	let under = smoothstep( 0.05, -0.15, h );

	// ---- grass: mown banks and verges (fine, even green) and meadow (tufty, paler, seed heads)
	let mown = mix( ${ S( 0.2, 0.3, 0.09 ) }, ${ S( 0.3, 0.38, 0.13 ) }, smoothstep( 0.3, 0.7, dM.w * 0.6 + macroB * 0.4 ) );
	let meadow = mix( ${ S( 0.27, 0.32, 0.12 ) }, ${ S( 0.45, 0.43, 0.22 ) }, smoothstep( 0.45, 0.8, dM.y * 0.5 + macroA * 0.5 ) * 0.6 );
	let mowK = smoothstep( 0.7, 0.3, macroA + slope * 0.6 );
	var grass = mix( meadow, mown, mowK );
	grass = grass * ( ( dN.y - 0.45 ) * 0.25 + 1.0 ) * ( ( dF.y - 0.4 ) * 0.15 + 1.0 );
	// mowing stripes on the mown grass (seen at a distance: alternating sheen)
	let stripe = smoothstep( 0.3, 0.7, sin( dot( xz, vec2f( 0.6, 0.8 ) ) * 0.9 + dM.w * 2.0 ) * 0.5 + 0.5 );
	grass = grass * mix( 1.0, stripe * 0.12 + 0.94, mowK * smoothstep( 8.0, 40.0, camDist ) );

	// ---- strip fields: a parcel grid stretched along one direction (long narrow strips), each
	// parcel a crop: green maize / soy, golden stubble, brown ploughed soil
	let fd = ${ rot2( 'xz', 0.62 ) };
	let cell = floor( vec2f( fd.x / 34.0, fd.y / 260.0 ) + vec2f( 0.0, macroA * 0.8 ) );
	let pick = fract( sin( dot( cell, vec2f( 12.9898, 78.233 ) ) ) * 43758.5453 );
	let crop = mix( ${ S( 0.17, 0.27, 0.08 ) }, ${ S( 0.28, 0.35, 0.12 ) }, dM.w );
	let stubble = mix( ${ S( 0.5, 0.44, 0.28 ) }, ${ S( 0.6, 0.52, 0.34 ) }, dN.y );
	let plough = mix( ${ S( 0.32, 0.26, 0.19 ) }, ${ S( 0.4, 0.33, 0.25 ) }, dN.y ) * ( ( sin( fd.x * 6.2832 / 0.75 ) * 0.5 + 0.5 ) * 0.18 + 0.86 );
	var field = select( select( plough, stubble, pick < 0.66 ), crop, pick < 0.42 );
	// crop rows across the strip, fading with distance
	let rows = sin( fd.x * 6.2832 / 0.7 ) * 0.5 + 0.5;
	field = field * mix( 1.0, rows * 0.25 + 0.85, ( 1.0 - smoothstep( 10.0, 50.0, camDist ) ) * select( 0.0, 1.0, pick < 0.42 ) );

	// ---- yards and packed earth, forest floor
	// (the land cover's built-up class is mostly gardens, lawns and orchards around the houses)
	let packed = mix( ${ S( 0.36, 0.33, 0.29 ) }, ${ S( 0.45, 0.42, 0.37 ) }, dN.z );
	let yard = mix( mix( grass, ${ S( 0.17, 0.25, 0.08 ) }, smoothstep( 0.45, 0.75, dM.w ) * 0.5 ), packed, smoothstep( 0.6, 0.85, dM.y + ( macroB - 0.5 ) * 0.4 ) * 0.45 );
	var litter = mix( ${ S( 0.22, 0.16, 0.1 ) }, ${ S( 0.33, 0.24, 0.13 ) }, dF.y );
	litter = mix( litter, ${ S( 0.13, 0.2, 0.06 ) }, smoothstep( 0.55, 0.75, dM.w ) * 0.6 );
	// until the trees are planted, the forest reads as a canopy of crowns from a distance
	let crowns = terDetail( ${ rot2( 'xz', 0.9 ) } / 23.0 ).w * 0.6 + dM.w * 0.4;
	let canopy = mix( ${ S( 0.06, 0.1, 0.03 ) }, ${ S( 0.16, 0.24, 0.07 ) }, smoothstep( 0.35, 0.7, crowns ) );
	litter = mix( litter, canopy, smoothstep( 25.0, 90.0, camDist ) );

	// ---- the water's edge: wet silt at the bank toe, dark and glossy at the waterline
	let silt = mix( ${ S( 0.27, 0.24, 0.19 ) }, ${ S( 0.36, 0.32, 0.25 ) }, dM.w ) * ( ( dN.y - 0.45 ) * 0.2 + 1.0 );
	let wetLine = smoothstep( 0.45, 0.0, h ) * ( 1.0 - under );
	let bed = mix( ${ S( 0.2, 0.19, 0.15 ) }, ${ S( 0.27, 0.25, 0.19 ) }, dM.w * 0.6 + macroB * 0.4 );

	// ---- combine
	var albedo = grass;
	albedo = mix( albedo, field, fieldW );
	albedo = mix( albedo, yard, builtW );
	albedo = mix( albedo, litter, forestW );
	albedo = mix( albedo, silt, max( mudW, wetLine * 0.85 ) );
	albedo = mix( albedo, silt * 0.55, wetLine * 0.6 );
	albedo = mix( albedo, bed, under );
	terMeadowW = ( 1.0 - fieldW ) * ( 1.0 - builtW ) * ( 1.0 - forestW ) * ( 1.0 - under ) * ( 1.0 - mudW ) * 0.5;

	var rough = mix( 0.88, 0.95, fieldW );
	rough = mix( rough, 0.45, wetLine * 0.8 );
	rough = mix( rough, 0.8, under );

	// micro relief: tufts, clods and furrows, ripples of silt
	let hd = mix( dN.y * 0.03 + dF.y * 0.012 + dM.y * 0.03, dN.z * 0.02 + rows * 0.03, fieldW ) * ( 1.0 - under * 0.6 );

	s.albedo = albedo;
	s.roughness = rough;
	s.normal = terrainPerturbNormal( p, N0, hd, 1.0 );
	s.ao = sat( nr.w * mix( 1.0, dN.y * 0.4 + 0.75, forestW ) );
`;
