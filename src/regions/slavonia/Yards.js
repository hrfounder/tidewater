import { Mesh } from '../../engine/index.js';
import { prepare, mergePrepared, box, cylinder, mat4 } from '../../world/boat/GeoKit.js';
import { createPropMaterial, PAT } from '../../game/GameMaterials.js';

// What stands in the yards between the houses. A Slavonian plot shows the street a narrow house
// gable and, either side of it, the fence that closes the yard: a run of timber pickets or wire
// mesh on posts, with a wide double gate for the tractor and a small one for people. Behind the
// fence the yard has the things a household keeps outside: a stack of split firewood under the
// eaves for the winter, and here and there a well head.
//
// The fence is hung off the house itself rather than off a guessed plot line: it runs from the two
// front corners of the gable out to either side, which is how these yards close and keeps it clear
// of the road, since the house is already set back from it.

const TIMBER = [ 0x8a7458, 0x9c8768, 0x6f5d46 ];
const POST = 0x5e4e3c;
const WIRE = 0x707468;

function rand01( x, z, salt ) {

	const s = Math.sin( x * 37.73 + z * 91.17 + salt * 13.7 ) * 28394.17;
	return s - Math.floor( s );

}

// Build the yard things for one house rectangle (as Buildings.js computes it: centre, half extents
// and the angle whose local +z runs down the plot, so the gable faces along -z).
export function yardFor( parts, terrain, r, isShed ) {

	if ( isShed ) return;
	const y = terrain.heightAt( r.cx, r.cz );
	const h0 = rand01( r.cx, r.cz, 1 );
	const ang = r.ang;
	const ca = Math.cos( ang ), sa = Math.sin( ang );
	// the street-facing gable: the end of the long axis nearer the road is the one the windows are
	// on (Buildings.js puts them at -z), so the fence runs along that plane
	const fx = r.cx - Math.sin( ang ) * ( - r.d / 2 );
	const fz = r.cz - Math.cos( ang ) * ( - r.d / 2 );
	const picket = h0 < 0.55;
	const tone = TIMBER[ ( rand01( r.cz, r.cx, 3 ) * TIMBER.length ) | 0 ];
	const fh = 1.35 + h0 * 0.25;

	for ( const side of [ - 1, 1 ] ) {

		// from the corner of the gable outward; the gate is the gap nearest the house on one side
		const run = 5 + rand01( r.cx, r.cz, side + 5 ) * 4;
		const x0 = fx + ca * side * r.w / 2, z0 = fz - sa * side * r.w / 2;
		const x1 = x0 + ca * side * run, z1 = z0 - sa * side * run;
		const gate = side === ( h0 < 0.5 ? - 1 : 1 );
		const g = terrain.heightAt( ( x0 + x1 ) / 2, ( z0 + z1 ) / 2 );
		if ( ! ( g > - 1 ) ) continue;

		if ( gate ) {

			// a double gate: two leaves between a pair of taller posts, shut
			const leaf = run / 2 - 0.12;
			for ( const k of [ 0, 1 ] ) {

				const t = ( k + 0.5 ) / 2;
				const gx = x0 + ( x1 - x0 ) * t, gz = z0 + ( z1 - z0 ) * t;
				parts.push( prepare( box( leaf, fh * 0.92, 0.06 ), {
					color: tone, rough: 0.86, pattern: PAT.woodX, matrix: mat4( gx, g + fh * 0.5, gz, 0, ang + Math.PI / 2, 0 ),
				} ) );

			}

			for ( const t of [ 0, 1 ] ) {

				const gx = x0 + ( x1 - x0 ) * t, gz = z0 + ( z1 - z0 ) * t;
				parts.push( prepare( box( 0.14, fh + 0.5, 0.14 ), {
					color: POST, rough: 0.9, pattern: PAT.wood, matrix: mat4( gx, g + ( fh + 0.5 ) / 2, gz, 0, ang, 0 ),
				} ) );

			}

			continue;

		}

		// a plain run: posts, two rails, and either pickets or wire between them
		const posts = Math.max( 2, Math.round( run / 2.1 ) );
		for ( let i = 0; i <= posts; i ++ ) {

			const t = i / posts;
			const gx = x0 + ( x1 - x0 ) * t, gz = z0 + ( z1 - z0 ) * t;
			parts.push( prepare( box( 0.1, fh, 0.1 ), {
				color: POST, rough: 0.9, pattern: PAT.wood, matrix: mat4( gx, g + fh / 2, gz, 0, ang, 0 ),
			} ) );

		}

		const mx = ( x0 + x1 ) / 2, mz = ( z0 + z1 ) / 2;
		for ( const ry of [ fh - 0.12, fh * 0.42 ] ) {

			parts.push( prepare( box( run, 0.07, 0.05 ), {
				color: tone, rough: 0.88, pattern: PAT.woodX, matrix: mat4( mx, g + ry, mz, 0, ang + Math.PI / 2, 0 ),
			} ) );

		}

		if ( picket ) {

			// wide enough spacing to keep the whole village's fences affordable: a picket every 26 cm
			const n = Math.max( 4, Math.round( run / 0.26 ) );
			for ( let i = 0; i < n; i ++ ) {

				if ( rand01( gx( x0, x1, i, n ), i, 7 ) < 0.03 ) continue; // a picket gone
				const t = ( i + 0.5 ) / n;
				const px = x0 + ( x1 - x0 ) * t, pz = z0 + ( z1 - z0 ) * t;
				parts.push( prepare( box( 0.08, fh - 0.1, 0.022 ), {
					color: tone, rough: 0.88, pattern: PAT.wood, matrix: mat4( px, g + ( fh - 0.1 ) / 2, pz, 0, ang, 0 ),
				} ) );

			}

		} else {

			// wire mesh: one thin panel, the pattern carries the weave
			parts.push( prepare( box( run, fh - 0.2, 0.012 ), {
				color: WIRE, rough: 0.6, metal: 0.5, pattern: PAT.machined, matrix: mat4( mx, g + ( fh - 0.1 ) / 2, mz, 0, ang + Math.PI / 2, 0 ),
			} ) );

		}

	}

	// the winter's firewood, split and stacked along the yard side of the house
	if ( h0 > 0.62 ) {

		const side = h0 > 0.65 ? 1 : - 1;
		const sx = r.cx + ca * side * ( r.w / 2 + 0.75 ), sz = r.cz - sa * side * ( r.w / 2 + 0.75 );
		const len = Math.min( r.d * 0.5, 3.5 );
		const g = terrain.heightAt( sx, sz );
		const rows = 4;
		for ( let i = 0; i < rows; i ++ ) {

			parts.push( prepare( cylinder( 0.075, 0.075, len, 6 ), {
				color: 0x6d5a42, rough: 0.95, pattern: PAT.wood,
				matrix: mat4( sx + ca * ( i % 2 ) * 0.03, g + 0.09 + i * 0.16, sz, 0, ang, Math.PI / 2 ),
			} ) );
			parts.push( prepare( cylinder( 0.075, 0.075, len, 6 ), {
				color: 0x7a6549, rough: 0.95, pattern: PAT.wood,
				matrix: mat4( sx + ca * 0.17, g + 0.09 + i * 0.16, sz - sa * 0.17, 0, ang, Math.PI / 2 ),
			} ) );

		}

	}

}

function gx( x0, x1, i, n ) {

	return x0 + ( x1 - x0 ) * ( ( i + 0.5 ) / n );

}

// the yard things of the whole block, as one mesh (Buildings.js collects the rectangles)
export function buildYards( { scene, parts } ) {

	if ( ! parts.length ) return null;
	const mesh = new Mesh( mergePrepared( parts ), createPropMaterial( 'slavoniaYards' ) );
	mesh.name = 'yards';
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	scene.add( mesh );
	return mesh;

}
