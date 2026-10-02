import * as caribbeanFish from './caribbean/fish.js';
import * as slavoniaFish from './slavonia/fish.js';

// Regions: the setting the game is played in. A region owns what is specific to a place (the
// species and their habitats today; the landscape, water, plants and village as they move over,
// see docs/slavonia/ROADMAP.md); the engine, the fishing mechanics and the UI are shared.
//
//   id        key, also ?region=<id> in the URL
//   name      display name
//   fish      { FISH, habitatAt } (see regions/caribbean/fish.js)
//   saveKey   localStorage key of the player's progress (each region keeps its own)
//   world     'island' (the generated island) or 'tiles' (real-world map tiles, regions/slavonia/world.js)
//   people    the two the player deals with: who buys the catch and who sells the gear, each with
//             the phrase that says where to find them (the guide and the tips use both)
//   intro     the welcome card: what this place is and how it is fished
//   playable  false while the region is still being built: it can be selected for development,
//             the default stays on a playable one
export const REGIONS = {
	caribbean: {
		id: 'caribbean', name: 'Tidewater Island', fish: caribbeanFish, saveKey: 'tidewater.save.v1',
		world: 'island', playable: true,
		people: {
			buyer: { name: 'Joe', role: 'Fish buyer', where: 'fish stand by the pier' },
			shop: { name: 'Marta', role: 'Chandlery', where: 'chandlery by the boathouse' },
		},
		intro: {
			title: 'Fish the island, sell your catch',
			waters: 'Catch fish from the <b>beach</b>, the <b>pier</b> or your <b>boat</b>. Different fish bite in the shallows, around the pier, over the reef and out in deep water, and they change with the time of day.',
			spots: 'deeper water, around the pier or over the reef',
		},
	},
	slavonia: {
		id: 'slavonia', name: 'Slavonia: Drava, Sava, Dunav', fish: slavoniaFish, saveKey: 'tidewater.slavonia.save.v1',
		world: 'tiles', playable: false,
		people: {
			buyer: { name: 'Stipo', role: 'Fish buyer', where: 'fish stand by the bridge' },
			shop: { name: 'Kata', role: 'Chandlery', where: 'chandlery on the park bank' },
		},
		intro: {
			title: 'Fish the Bosut, sell your catch',
			waters: 'Fish the <b>bank</b>, a <b>platform</b> or your <b>boat</b>. The Bosut runs slowly here: roach, bream and perch in the slack water under the bank, carp and bream out in the channel, pike and zander where the snags are, and a wels in the deep holes after dark.',
			spots: 'the deeper channel, the slack under the far bank or the snags by the platforms',
		},
	},
};

export const DEFAULT_REGION = 'caribbean';

// the region named by ?region= (an unknown name falls back to the default)
export function regionFromQuery( search ) {

	const id = new URLSearchParams( search || '' ).get( 'region' );
	return REGIONS[ id ] || REGIONS[ DEFAULT_REGION ];

}

// The active region, fixed for the page load. Outside a browser (the node tests) it is the default.
export const REGION = regionFromQuery( typeof location !== 'undefined' ? location.search : '' );
