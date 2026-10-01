import { REGION } from '../regions/index.js';
import { SPECIES } from '../world/fish/FishSpecies.js';

// Catchable fish of the active region (regions/<region>/fish.js has the table and its fields).
export const FISH = REGION.fish.FISH;

export const FISH_IDS = Object.keys( FISH );

// the swimming model (world/fish/FishSpecies.js) a species is drawn with: its own, or the region's
// stand-in while its own is not built yet
export function fishModel( id ) {

	const f = FISH[ id ];
	return SPECIES[ f.model ] ? f.model : f.standIn;

}

// $ value of a fish; trophy-sized ones fetch a bit more per kg
export function fishValue( id, kg ) {

	const f = FISH[ id ];
	const t = ( kg - f.kg[ 0 ] ) / Math.max( f.kg[ 1 ] - f.kg[ 0 ], 1e-6 );
	return Math.max( 1, Math.round( f.price * kg * ( 1 + 0.25 * Math.max( 0, t - 0.7 ) / 0.3 ) ) );

}

// total length (cm) of a fish of `kg`, from its species' length-weight relation
export function fishLengthCm( id, kg ) {

	const [ a, b ] = FISH[ id ].lw;
	return Math.pow( Math.max( kg, 0.001 ) * 1000 / a, 1 / b );

}
