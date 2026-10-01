// Plain-node tests of the Slavonian region's fishing data (no GPU): the species table, the river
// and lake habitats and what bites where. The region is picked the way the browser picks it
// (?region=slavonia), before the game modules load.
globalThis.location = { search: '?region=slavonia' };
const { REGION, REGIONS } = await import( '../src/regions/index.js' );
const { FISH, FISH_IDS, fishLengthCm, fishValue, fishModel } = await import( '../src/game/FishTable.js' );
const { SPECIES } = await import( '../src/world/fish/FishSpecies.js' );
const { habitatAt, pickSpecies, rollWeight, biteDelay } = await import( '../src/game/Bites.js' );

let fails = 0;
const ok = ( c, msg ) => {

	if ( ! c ) { fails ++; console.log( 'FAIL', msg ); } else console.log( 'ok  ', msg );

};
let seed = 4242;
const rng = () => ( ( seed = ( seed * 1664525 + 1013904223 ) >>> 0 ) / 4294967296 );

ok( REGION.id === 'slavonia', 'the region comes from ?region=' );
ok( REGION.saveKey !== REGIONS.caribbean.saveKey, 'the region keeps its own save' );

// ---- the table
const kinds = Object.keys( habitatAt( { depth: 3 } ) );
for ( const id of FISH_IDS ) {

	const f = FISH[ id ];
	if ( ! SPECIES[ fishModel( id ) ] ) ok( false, `${ id }: no model to draw (own or stand-in)` );
	for ( const k in f.habitat ) if ( ! kinds.includes( k ) ) ok( false, `${ id }: unknown water type ${ k }` );
	if ( ! ( f.kg[ 0 ] > 0 && f.kg[ 1 ] > f.kg[ 0 ] ) ) ok( false, `${ id }: weight range` );
	// lengths from the length-weight relation stay in a believable range for the species' sizes
	const cmMin = fishLengthCm( id, f.kg[ 0 ] ), cmMax = fishLengthCm( id, f.kg[ 1 ] );
	if ( ! ( cmMin > 5 && cmMax < 260 ) ) ok( false, `${ id }: lengths ${ cmMin.toFixed( 0 ) }–${ cmMax.toFixed( 0 ) } cm` );
	for ( let i = 0; i < 50; i ++ ) {

		const w = rollWeight( id, rng );
		if ( w < f.kg[ 0 ] || w > f.kg[ 1 ] ) { ok( false, `${ id }: rolled weight in range` ); break; }

	}

}
ok( true, `${ FISH_IDS.length } species checked` );
for ( const [ id ] of REGION.fish.STALL ) if ( ! FISH[ id ] ) ok( false, `stall fish ${ id } is a species of the region` );
// spot checks of the length-weight relations against well-known sizes
const near = ( id, kg, cm, tol ) => ok( Math.abs( fishLengthCm( id, kg ) - cm ) < tol, `${ id }: ${ kg } kg is about ${ cm } cm (${ fishLengthCm( id, kg ).toFixed( 0 ) })` );
near( 'carp', 10, 85, 8 );
near( 'pike', 8, 100, 10 );
near( 'zander', 3.5, 70, 7 );
near( 'wels', 50, 200, 20 );
near( 'perch', 0.4, 30, 4 );
ok( fishValue( 'zander', 4 ) > fishValue( 'bream', 4 ), 'zander is worth more than bream' );

// ---- what bites where
const spots = {
	bank: { depth: 0 },
	mainChannel: { depth: 4, flow: 0.8, river: 1 },
	groyneEddy: { depth: 3, flow: 0.1, river: 1, cover: 0.8 },
	riverHole: { depth: 11, flow: 0.3, river: 1, cover: 0.6 },
	reedyOxbow: { depth: 1.6, river: 0, weeds: 1 },
	openLake: { depth: 3.5, river: 0 },
};
const counts = {};
for ( const [ name, s ] of Object.entries( spots ) ) {

	const h = habitatAt( s );
	for ( const hour of [ 12, 23 ] ) {

		const c = counts[ name + hour ] = {};
		for ( let i = 0; i < 3000; i ++ ) {

			const id = pickSpecies( h, hour, rng );
			if ( id ) c[ id ] = ( c[ id ] || 0 ) + 1;

		}

	}

	const top = Object.entries( counts[ name + 12 ] ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] ).slice( 0, 5 ).map( ( [ k, v ] ) => `${ k } ${ ( v / 30 ).toFixed( 0 ) }%` ).join( ', ' );
	console.log( `     ${ name }: delay ~${ biteDelay( h, 12, () => 0.5 ).toFixed( 1 ) } s; ${ top || 'nothing' }` );

}
const share = ( spot, ids ) => ids.reduce( ( s, id ) => s + ( counts[ spot ][ id ] || 0 ), 0 ) / 3000;
ok( pickSpecies( habitatAt( spots.bank ), 12, rng ) === null, 'nothing bites on the bank' );
ok( biteDelay( habitatAt( spots.bank ), 12, rng ) === Infinity, 'no bite delay on the bank' );
ok( share( 'mainChannel12', [ 'chub', 'barbel', 'asp', 'ide', 'sterlet', 'bleak' ] ) > 0.8, 'the main current gives river fish' );
ok( share( 'mainChannel12', [ 'tench', 'grassCarp', 'pumpkinseed', 'bullhead' ] ) === 0, 'no still-water fish in the current' );
ok( share( 'reedyOxbow12', [ 'tench', 'pike', 'roach', 'gibel', 'carp', 'pumpkinseed', 'grassCarp', 'perch' ] ) > 0.85, 'a reedy oxbow gives still-water fish' );
ok( share( 'reedyOxbow12', [ 'barbel', 'asp', 'sterlet' ] ) === 0, 'no current fish in an oxbow' );
ok( share( 'riverHole23', [ 'wels' ] ) > share( 'riverHole12', [ 'wels' ] ) * 2, 'wels catfish feed at night' );
ok( share( 'openLake12', [ 'carp', 'bream', 'roach', 'gibel' ] ) > 0.5, 'open lake water gives carp, bream and roach' );

if ( fails ) {

	console.log( `${ fails } failed` );
	process.exit( 1 );

}

console.log( 'all passed' );
