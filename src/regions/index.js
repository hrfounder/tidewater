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
//   playable  false while the region is still being built: it can be selected for development,
//             the default stays on a playable one
export const REGIONS = {
	caribbean: { id: 'caribbean', name: 'Tidewater Island', fish: caribbeanFish, saveKey: 'tidewater.save.v1', world: 'island', playable: true },
	slavonia: { id: 'slavonia', name: 'Slavonia: Drava, Sava, Dunav', fish: slavoniaFish, saveKey: 'tidewater.slavonia.save.v1', world: 'tiles', playable: false },
};

export const DEFAULT_REGION = 'caribbean';

// the region named by ?region= (an unknown name falls back to the default)
export function regionFromQuery( search ) {

	const id = new URLSearchParams( search || '' ).get( 'region' );
	return REGIONS[ id ] || REGIONS[ DEFAULT_REGION ];

}

// The active region, fixed for the page load. Outside a browser (the node tests) it is the default.
export const REGION = regionFromQuery( typeof location !== 'undefined' ? location.search : '' );
