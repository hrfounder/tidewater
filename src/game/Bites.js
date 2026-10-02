import { FISH, FISH_IDS } from './FishTable.js';
import { REGION } from '../regions/index.js';

// Where the float is and what lives there: weights per water type of the active region, from
// a spot description (the region's habitatAt documents both).
export const habitatAt = REGION.fish.habitatAt;
// what makes a spot is the region's own business: it reads its world and returns those weights
export const sampleAt = REGION.fish.sampleAt;

// 1 at the species' favourite time, less at others; hour 0..24
export function activity( pref, hour ) {

	const dawn = Math.exp( - ( ( hour - 6.5 ) ** 2 ) / 2.5 ), dusk = Math.exp( - ( ( hour - 18.5 ) ** 2 ) / 2.5 );
	const night = hour < 5.5 || hour > 19.5 ? 1 : 0;
	const day = hour > 7 && hour < 18 ? 1 : 0.35;
	switch ( pref ) {

		case 'day': return 0.25 + 0.75 * day * ( 1 - night );
		case 'dawnDusk': return 0.3 + 0.7 * Math.max( dawn, dusk ) + 0.1 * day;
		case 'night': return 0.15 + 0.85 * Math.max( night, dusk * 0.8 );
		default: return 0.8 + 0.2 * Math.max( dawn, dusk );

	}

}

// Weighted pick of the species that bites here; null when nothing lives here.
// rng: () => [0, 1)
export function pickSpecies( habitat, hour, rng = Math.random ) {

	let total = 0;
	const w = [];
	for ( const id of FISH_IDS ) {

		const f = FISH[ id ];
		let hw = 0;
		for ( const k in f.habitat ) hw += f.habitat[ k ] * habitat[ k ];
		const x = hw * f.rarity * activity( f.time, hour );
		w.push( x );
		total += x;

	}

	if ( total < 1e-4 ) return null;
	let r = rng() * total;
	for ( let i = 0; i < w.length; i ++ ) {

		r -= w[ i ];
		if ( r <= 0 ) return FISH_IDS[ i ];

	}

	return FISH_IDS[ FISH_IDS.length - 1 ];

}

// Weight in kg: skewed toward the small end (most fish are small, trophies are rare)
export function rollWeight( id, rng = Math.random ) {

	const [ a, b ] = FISH[ id ].kg;
	const t = Math.pow( rng(), 2.2 );
	return a + ( b - a ) * t;

}

// Seconds until the next bite at this spot: richer water bites sooner. Infinity when barren.
export function biteDelay( habitat, hour, rng = Math.random ) {

	let rich = 0;
	for ( const k in habitat ) rich += habitat[ k ];
	if ( rich < 0.05 ) return Infinity;
	// open water between the named habitats still has fish: never much slower than a poor spot
	rich = Math.max( rich, 0.35 );
	const light = hour > 6 && hour < 19 ? 1 : 0.8;
	const mean = 8 / ( Math.min( rich, 1.6 ) * light );
	return 2 + - Math.log( 1 - rng() * 0.98 ) * mean * 0.6;

}
