import { srgb as S, rot2 } from '../../world/terrain/TerrainShading.js';
import { SHOULDER } from './site/Roads.js';
import { ROAD_RANGE } from './terrain/Grade.js';

// Ground of the Slavonian lowland: the terrain's surface stage for TileTerrain patches (passed to
// Terrain as `surface`). Reference: docs/slavonia/photos (the Bosut at Most Bosut) and the
// Sentinel-2 imagery in docs/slavonia/img.
//
// The terrain's maps carry this region's ground (terrain/TileTerrain.js, terrain/Grade.js):
//   splat x  cropland     strip fields: crops, stubble and ploughed soil by parcel
//   splat y  built-up     yards, gravel and packed earth between the houses
//   splat z  forest       leaf litter, moss and ivy on the forest floor
//   splat w  tracks       the outline of the unpaved roads: field tracks, service roads, paths
//   rock     roads        the outline of the paved roads
// A road's outline is a signed distance to the edge of its carriageway (0.5 on the edge, ROAD_RANGE
// metres to either end of the scale), so the edge is drawn sharp at any distance from one texel a
// metre. Everything else is grass: mown on the river banks and verges, rougher meadow beyond. By the
// water the bank is bare wet silt up to a little over the waterline, and under it the bed is soft
// grey-brown silt.

// Bare mud on a bank: up to MUD_TOP over the water it is all mud, and the grass takes over across
// the MUD_FADE above that (m).
const MUD_TOP = 0.2, MUD_FADE = 0.5;
// A track is two ruts with grass between them: the strip begins this far in from each edge (m).
const RUT = 1.1;
const f = ( v ) => v.toFixed( 3 );
export const GROUND_SURFACE = /* wgsl */`
	let p = in.P;
	let xz = p.xz;
	// the true height, not the mesh's: the mesh is coarser with distance, and a waterline drawn from
	// it would shift as the mesh does
	let h = terrainHeightAt( xz );
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

	// Beyond the mapped patch the land cover runs out (terrainSplat fades to zero there), but the
	// Pannonian plain does not: the same farmland carries on to the horizon. Out there the cover is
	// grown from the parcel grid below instead of the data.
	let inside = terrainInside( xz );
	var fieldW = smoothstep( 0.35, 0.65, sp.x );
	var builtW = smoothstep( 0.35, 0.65, sp.y );
	var forestW = smoothstep( 0.35, 0.65, sp.z );
	let mudW = smoothstep( ${ f( MUD_TOP + MUD_FADE ) }, ${ f( MUD_TOP ) }, h );
	let under = smoothstep( 0.05, -0.15, h );

	// ---- roads: metres from the edge of the carriageway ( < 0 on it ), and how wide a pixel is
	let roadD = ( 0.5 - nr.z ) * ${ f( 2 * ROAD_RANGE ) };
	let trackD = ( 0.5 - sp.w ) * ${ f( 2 * ROAD_RANGE ) };
	let pixel = max( fwidth( xz.x ) + fwidth( xz.y ), 0.02 ) * 0.5;
	let roadW = 1.0 - smoothstep( - pixel, pixel, roadD );
	// the gravel shoulder beside the carriageway, thinning into the verge
	let shoulderW = ( 1.0 - smoothstep( ${ f( SHOULDER * 0.6 ) }, ${ f( SHOULDER * 1.4 ) }, roadD + ( dM.w - 0.5 ) * 0.5 ) ) * ( 1.0 - roadW );
	// a track: worn earth, ragged at the edge, with grass left between the ruts of a wide one
	let trackEdge = trackD + ( dM.w - 0.5 ) * 0.6;
	let strip = smoothstep( ${ f( - RUT + 0.2 ) }, ${ f( - RUT - 0.2 ) }, trackEdge ) * 0.7;
	let trackW = ( 1.0 - smoothstep( - 0.25, 0.25, trackEdge ) ) * ( 1.0 - strip ) * ( 1.0 - roadW );

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
	// parcel a crop: green maize / soy, golden stubble, brown ploughed soil. Each village laid its
	// strips out on its own bearing, so the grid's angle and width drift over a few kilometres
	// rather than ruling one pattern across the whole plain.
	let block = floor( xz / 2600.0 );
	let blockR = fract( sin( dot( block, vec2f( 41.3, 17.7 ) ) ) * 24634.6345 );
	let ang = 0.62 + ( blockR - 0.5 ) * 1.4;
	let ca = cos( ang ); let sa = sin( ang );
	let fd = vec2f( xz.x * ca - xz.y * sa, xz.x * sa + xz.y * ca );
	let parcelW = 26.0 + blockR * 26.0;
	let cell = floor( vec2f( fd.x / parcelW, fd.y / 260.0 ) + vec2f( 0.0, macroA * 0.8 ) ) + block * 7.0;
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

	// the plain beyond the data: most parcels are worked, with woods in the hollows and grass between
	let farForest = smoothstep( 0.6, 0.78, terDetail( ${ rot2( 'xz', 1.7 ) } / 760.0 ).w );
	let farField = smoothstep( 0.78, 0.62, pick ) * ( 1.0 - farForest );
	fieldW = mix( farField, fieldW, inside );
	forestW = mix( farForest, forestW, inside );
	builtW = builtW * inside;

	// ---- road surfaces: aged asphalt (fine aggregate, paler worn wheel tracks and patches), crushed
	// stone on the shoulder, and the packed earth of a track
	let asphalt = mix( ${ S( 0.3, 0.3, 0.31 ) }, ${ S( 0.42, 0.42, 0.42 ) }, dM.w * 0.5 + macroB * 0.5 ) * ( ( dF.x - 0.5 ) * 0.22 + 1.0 );
	let gravel = mix( ${ S( 0.45, 0.43, 0.39 ) }, ${ S( 0.62, 0.6, 0.55 ) }, dF.x ) * ( ( dN.x - 0.5 ) * 0.3 + 1.0 );
	let earth = mix( ${ S( 0.38, 0.32, 0.25 ) }, ${ S( 0.5, 0.44, 0.35 ) }, dM.z * 0.6 + dN.z * 0.4 );

	// ---- combine
	var albedo = grass;
	albedo = mix( albedo, field, fieldW );
	albedo = mix( albedo, yard, builtW );
	albedo = mix( albedo, litter, forestW );
	albedo = mix( albedo, earth, trackW );
	albedo = mix( albedo, gravel, shoulderW );
	albedo = mix( albedo, silt, max( mudW, wetLine * 0.85 ) * ( 1.0 - roadW ) );
	albedo = mix( albedo, silt * 0.55, wetLine * 0.6 * ( 1.0 - roadW ) );
	albedo = mix( albedo, asphalt, roadW );
	albedo = mix( albedo, bed, under );
	let builtOver = max( roadW, max( shoulderW, trackW ) );
	terMeadowW = ( 1.0 - fieldW ) * ( 1.0 - builtW ) * ( 1.0 - forestW ) * ( 1.0 - under ) * ( 1.0 - mudW ) * ( 1.0 - builtOver ) * 0.5;

	var rough = mix( 0.88, 0.95, fieldW );
	rough = mix( rough, 0.45, wetLine * 0.8 );
	rough = mix( rough, 0.78, roadW );
	rough = mix( rough, 0.8, under );

	// micro relief: tufts, clods and furrows, ripples of silt; a road is smooth but for its grain
	var hd = mix( dN.y * 0.03 + dF.y * 0.012 + dM.y * 0.03, dN.z * 0.02 + rows * 0.03, fieldW ) * ( 1.0 - under * 0.6 );
	hd = mix( hd, dF.x * 0.01, max( shoulderW, trackW * 0.6 ) );
	hd = mix( hd, dF.x * 0.003, roadW );

	s.albedo = albedo;
	s.roughness = rough;
	s.normal = terrainPerturbNormal( p, N0, hd, 1.0 );
	s.ao = sat( nr.w * mix( 1.0, dN.y * 0.4 + 0.75, forestW ) );
`;
