import { Water, waterDatum } from './Water.js';
import { Roads } from './Roads.js';
import { Buildings } from './Buildings.js';
import { buildPlots } from './Plots.js';
import { Occupancy } from './Occupancy.js';
import { layPark } from './Park.js';

// The Site: one plain-data model of the place, made once from the map data of the block. Every
// system reads the Site. None reads the map files, and none asks another system what it did
// (docs/slavonia/DESIGN.md, section 2).
//
//   center, datum   where the patch sits on the map grid, and the level of its water above the sea
//   water           every body of water, the current, and what a fishing float lies in (Water.js)
//   roads           the road graph: nodes, and roads between them with their class and level (Roads.js)
//   buildings       the footprints: true ring, the rectangles it is made of, the street it faces,
//                   what kind of building it is (Buildings.js)
//   plots           the strip of land each street-front building stands on (Plots.js)
//   occupancy       who owns each square metre, once the ground is cut (Occupancy.js)
//   park            where the game's fixed things and the anglers' platforms stand (Park.js)

// the datum of a block, from its water: the terrain needs it before the Site can be made
export { waterDatum };

// index: the tiles' index.json; water, places: water.json and places.json of the block;
// ground( x, z ): the height of the dry ground, before anything is cut into it;
// landmarks: the buildings that have a model of their own, by name in lower case (Landmarks.js)
export function buildSite( { index, water, places, ground, datum, landmarks } ) {

	const center = index.center;
	const buildings = new Buildings( places, { center } );
	const roads = new Roads( places, { center, ground, walls: buildings } );
	buildings.settle( { roads, ground, landmarks } );
	return {
		center, datum,
		water: new Water( water, { center, datum } ),
		roads, buildings,
		plots: buildPlots( buildings, roads ),
		occupancy: null, park: null,
	};

}

// once the terrain has been graded; deck: the kit's platform (Park.js)
export function occupy( site, terrain, deck ) {

	site.occupancy = new Occupancy( terrain, site );
	site.park = layPark( site, deck );

}
