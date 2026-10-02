// Catchable fish of the Drava, Sava and Danube lowlands (Slavonia and Baranja): the rivers, their
// side arms and oxbows, and the floodplain lakes of Kopački rit. Same fields as the Caribbean table
// (regions/caribbean/fish.js); the habitats are this region's (see habitatAt below).
//
//   name      display name (English); hr: the Croatian name
//   lw        [ a, b ] length-weight relation W (g) = a * L (cm, total length) ^ b. Typical
//             FishBase-style values for European populations; to be checked against FishBase's
//             LW tables when the species get their models.
//   model     key in world/fish/FishSpecies.js SPECIES. These freshwater models do not exist yet
//             (milestone M3 in docs/slavonia/ROADMAP.md): until one does, STAND_IN below names an
//             existing model to draw instead.
//   kg        [ min, max ] weight of what bites on hook and line
//   price     € per kg at the čarda (rough market prices, to be tuned for the game's economy)
//   invasive  true for the introduced species (sold cheaply; anglers are asked to keep them)
//
// Fight, stamina, time and rarity as in the Caribbean table.
export const FISH = {
	// small fish: the bread and butter of float fishing, and live bait for the predators
	bleak: { name: 'Bleak', hr: 'Uklija', sci: 'Alburnus alburnus', lw: [ 0.0069, 3.12 ], model: 'bleak', habitat: { slack: 1, still: 0.7, current: 0.5, shallows: 0.4 }, kg: [ 0.01, 0.05 ], price: 2, fight: 0.05, stamina: 1, time: 'day', rarity: 0.35 },
	roach: { name: 'Roach', hr: 'Bodorka', sci: 'Rutilus rutilus', lw: [ 0.0102, 3.1 ], model: 'roach', habitat: { still: 1, slack: 0.8, weeds: 0.7, shallows: 0.4 }, kg: [ 0.05, 0.8 ], price: 2, fight: 0.1, stamina: 1.5, time: 'any', rarity: 1 },
	pumpkinseed: { name: 'Pumpkinseed', hr: 'Sunčanica', sci: 'Lepomis gibbosus', lw: [ 0.0158, 3.15 ], model: 'pumpkinseed', habitat: { weeds: 1, shallows: 0.8, still: 0.3 }, kg: [ 0.02, 0.25 ], price: 1, fight: 0.1, stamina: 1.5, time: 'day', rarity: 0.6, invasive: true },
	gibel: { name: 'Prussian carp', hr: 'Babuška', sci: 'Carassius gibelio', lw: [ 0.019, 3.0 ], model: 'gibel', habitat: { still: 1, weeds: 0.8, slack: 0.5 }, kg: [ 0.1, 1.5 ], price: 2, fight: 0.25, stamina: 3, time: 'any', rarity: 0.9, invasive: true },
	bullhead: { name: 'Brown bullhead', hr: 'Patuljasti somić', sci: 'Ameiurus nebulosus', lw: [ 0.0129, 3.06 ], model: 'bullhead', habitat: { still: 1, weeds: 0.5, slack: 0.3 }, kg: [ 0.05, 0.5 ], price: 2, fight: 0.15, stamina: 2, time: 'night', rarity: 0.5, invasive: true },

	// bottom feeders: feeder and carp rigs
	bream: { name: 'Common bream', hr: 'Deverika', sci: 'Abramis brama', lw: [ 0.0098, 3.13 ], model: 'bream', habitat: { slack: 1, still: 0.8, deep: 0.6 }, kg: [ 0.3, 5 ], price: 3, fight: 0.2, stamina: 4, time: 'dawnDusk', rarity: 0.9 },
	tench: { name: 'Tench', hr: 'Linjak', sci: 'Tinca tinca', lw: [ 0.0145, 3.04 ], model: 'tench', habitat: { weeds: 1, still: 0.6 }, kg: [ 0.3, 3.5 ], price: 8, fight: 0.4, stamina: 6, time: 'dawnDusk', rarity: 0.4 },
	carp: { name: 'Common carp', hr: 'Šaran', sci: 'Cyprinus carpio', lw: [ 0.0138, 3.02 ], model: 'carp', habitat: { still: 1, weeds: 0.8, slack: 0.6, snags: 0.4 }, kg: [ 1, 22 ], price: 6, fight: 0.7, stamina: 14, time: 'dawnDusk', rarity: 0.7 },
	grassCarp: { name: 'Grass carp', hr: 'Bijeli amur', sci: 'Ctenopharyngodon idella', lw: [ 0.0115, 3.02 ], model: 'grassCarp', habitat: { weeds: 1, still: 0.8 }, kg: [ 2, 25 ], price: 5, fight: 0.8, stamina: 16, time: 'day', rarity: 0.25, invasive: true },
	silverCarp: { name: 'Silver carp', hr: 'Bijeli glavaš', sci: 'Hypophthalmichthys molitrix', lw: [ 0.0118, 3.03 ], model: 'silverCarp', habitat: { still: 0.6, slack: 0.5 }, kg: [ 2, 25 ], price: 3, fight: 0.85, stamina: 16, time: 'day', rarity: 0.08, invasive: true },
	barbel: { name: 'Barbel', hr: 'Mrena', sci: 'Barbus barbus', lw: [ 0.0087, 3.05 ], model: 'barbel', habitat: { current: 1, deep: 0.3 }, kg: [ 0.5, 5 ], price: 4, fight: 0.7, stamina: 10, time: 'dawnDusk', rarity: 0.6 },
	sterlet: { name: 'Sterlet', hr: 'Kečiga', sci: 'Acipenser ruthenus', lw: [ 0.0033, 3.13 ], model: 'sterlet', habitat: { current: 0.8, deep: 0.8 }, kg: [ 0.3, 3 ], price: 25, fight: 0.5, stamina: 7, time: 'any', rarity: 0.12 },

	// river roamers
	chub: { name: 'Chub', hr: 'Klen', sci: 'Squalius cephalus', lw: [ 0.0093, 3.08 ], model: 'chub', habitat: { current: 1, snags: 0.6, slack: 0.3 }, kg: [ 0.2, 3 ], price: 3, fight: 0.45, stamina: 5, time: 'day', rarity: 0.8 },
	ide: { name: 'Ide', hr: 'Jez', sci: 'Leuciscus idus', lw: [ 0.0102, 3.07 ], model: 'ide', habitat: { slack: 0.8, current: 0.7 }, kg: [ 0.3, 3 ], price: 4, fight: 0.4, stamina: 5, time: 'dawnDusk', rarity: 0.5 },

	// predators: spinning, live bait, and the catfish clonk (bućkalica) from the boat
	perch: { name: 'European perch', hr: 'Grgeč', sci: 'Perca fluviatilis', lw: [ 0.0089, 3.15 ], model: 'perch', habitat: { snags: 1, weeds: 0.6, slack: 0.5, still: 0.5 }, kg: [ 0.05, 1.8 ], price: 8, fight: 0.2, stamina: 2.5, time: 'day', rarity: 0.8 },
	asp: { name: 'Asp', hr: 'Bolen', sci: 'Leuciscus aspius', lw: [ 0.0089, 3.05 ], model: 'asp', habitat: { current: 1, slack: 0.3 }, kg: [ 0.8, 8 ], price: 5, fight: 0.75, stamina: 10, time: 'day', rarity: 0.4 },
	pike: { name: 'Northern pike', hr: 'Štuka', sci: 'Esox lucius', lw: [ 0.0059, 3.06 ], model: 'pike', habitat: { weeds: 1, snags: 0.8, still: 0.6, slack: 0.5 }, kg: [ 0.8, 14 ], price: 9, fight: 0.6, stamina: 9, time: 'day', rarity: 0.45 },
	zander: { name: 'Zander', hr: 'Smuđ', sci: 'Sander lucioperca', lw: [ 0.0059, 3.12 ], model: 'zander', habitat: { snags: 0.8, deep: 0.8, slack: 0.6, current: 0.3 }, kg: [ 0.6, 10 ], price: 16, fight: 0.45, stamina: 7, time: 'dawnDusk', rarity: 0.4 },
	burbot: { name: 'Burbot', hr: 'Manić', sci: 'Lota lota', lw: [ 0.0056, 3.1 ], model: 'burbot', habitat: { deep: 0.7, snags: 0.6, current: 0.4 }, kg: [ 0.3, 3 ], price: 10, fight: 0.3, stamina: 4, time: 'night', rarity: 0.2 },
	wels: { name: 'Wels catfish', hr: 'Som', sci: 'Silurus glanis', lw: [ 0.0055, 3.03 ], model: 'wels', habitat: { deep: 1, snags: 0.8, slack: 0.5 }, kg: [ 2, 80 ], price: 11, fight: 1, stamina: 30, time: 'night', rarity: 0.2 },
};

// Existing (Caribbean) models drawn for the species whose own model is not built yet. Remove each
// entry as its freshwater model lands in FishSpecies.js.
const STAND_IN = {
	bleak: 'silverside', roach: 'mullet', pumpkinseed: 'sergeant', gibel: 'mullet', bullhead: 'grouper',
	bream: 'mullet', tench: 'grouper', carp: 'mullet', grassCarp: 'mullet', silverCarp: 'tarpon',
	barbel: 'mullet', sterlet: 'needlefish', chub: 'mullet', ide: 'mullet', perch: 'grunt', asp: 'jack',
	pike: 'barracuda', zander: 'grunt', burbot: 'grouper', wels: 'grouper',
};
for ( const id in STAND_IN ) FISH[ id ].standIn = STAND_IN[ id ];

// fish laid on the ice at the fish stand: [ species, length (m) ]
export const STALL = [ [ 'carp', 0.42 ], [ 'zander', 0.4 ], [ 'bream', 0.34 ], [ 'pike', 0.46 ], [ 'perch', 0.24 ] ];

// Water types (the keys of `habitat` above). They overlap: a sunken willow in a river bend is
// both snags and slack.
//   shallows  under ~1.5 m
//   weeds     reed beds, water lilies and weed along the margins
//   current   the main flow of a river (a steady current over ~0.4 m/s)
//   slack     slow water in a river: eddies, inside bends, behind the stone groynes, side arms
//   still     lakes, oxbows and ponds (no flow)
//   snags     cover on the bottom: sunken trees, groyne stones, bridge piers
//   deep      holes and the river channel deeper than ~6 m
//
// Spot description (sampled by the game where the float lands):
//   depth  water depth (m)
//   flow   surface current speed (m/s), 0 in still water
//   river  0..1: part of a river system (flowing water, its eddies and side arms) rather than a lake
//   weeds  0..1: vegetated margin nearby
//   cover  0..1: snags nearby
export function habitatAt( { depth, flow = 0, river = 0, weeds = 0, cover = 0 } ) {

	const h = { shallows: 0, weeds: 0, current: 0, slack: 0, still: 0, snags: 0, deep: 0 };
	if ( depth < 0.25 ) return h; // on the bank
	h.shallows = smooth( 2, 0.6, depth );
	h.weeds = weeds * smooth( 0.3, 1, depth ) * ( 1 - smooth( 4, 6, depth ) );
	h.current = river * smooth( 0.25, 0.6, flow ) * smooth( 0.8, 2, depth );
	h.slack = river * ( 1 - smooth( 0.2, 0.5, flow ) ) * smooth( 0.6, 1.5, depth );
	h.still = ( 1 - river ) * smooth( 0.6, 1.5, depth );
	h.snags = cover * smooth( 0.6, 1.5, depth );
	h.deep = smooth( 4.5, 8, depth );
	return h;

}

function smooth( e0, e1, x ) {

	const t = Math.min( 1, Math.max( 0, ( x - e0 ) / ( e1 - e0 ) ) );
	return t * t * ( 3 - 2 * t );

}

// Read the spot the bobber is in, off the patch itself (the game asks the region for this).
//
//   river   1 in a watercourse, 0 in a pond, an oxbow or a flooded pit
//   flow    m/s at the surface: the Bosut runs about a third of a metre a second in summer, a
//           regulated canal less, and the flow falls away toward the bank
//   weeds   the reed bed and the soft weed over the shallow margin
//   cover   fallen willow, the piles of a fishing platform, the shade under the bridge
//
// `world` is the TileTerrain patch: it carries the water lines the channels were cut from.
export function sampleAt( { x, z, depth, world = null } ) {

	let river = 0, flow = 0, cover = 0;
	if ( world && world.lines ) {

		const [ cE, cN ] = world.center;
		let best = Infinity, bestLine = null, bestT = 0;
		for ( const line of world.lines ) {

			if ( line.dry ) continue;
			const P = line.pts;
			for ( let i = 0; i + 1 < P.length; i ++ ) {

				const ax = P[ i ][ 0 ] - cE, az = cN - P[ i ][ 1 ];
				const bx = P[ i + 1 ][ 0 ] - cE, bz = cN - P[ i + 1 ][ 1 ];
				const dx = bx - ax, dz = bz - az;
				const len2 = Math.max( dx * dx + dz * dz, 1e-6 );
				const t = Math.min( 1, Math.max( 0, ( ( x - ax ) * dx + ( z - az ) * dz ) / len2 ) );
				const d = Math.hypot( x - ax - dx * t, z - az - dz * t );
				if ( d < best ) { best = d; bestLine = line; bestT = t; }

			}

		}

		if ( bestLine && best < bestLine.width ) {

			// how far into the channel the float is: 1 mid-stream, 0 at the bank
			const across = 1 - Math.min( 1, best / ( bestLine.width / 2 ) );
			river = Math.min( 1, across * 1.6 );
			const full = bestLine.class === 'canal' ? 0.12 : 0.34;
			flow = full * ( 0.35 + 0.65 * across );
			void bestT;
			// the margin under the bank is where the snags are: fallen branches and platform piles
			cover = Math.max( 0, 1 - Math.abs( best - bestLine.width / 2 ) / 3 );

		}

	}

	// the reed bed and the soft weed stand in the shallow margin, whatever the water
	const weeds = depth > 0.2 && depth < 1.6 ? Math.min( 1, ( 1.6 - depth ) / 1.1 ) : 0;
	return habitatAt( { depth, flow, river, weeds, cover } );

}
