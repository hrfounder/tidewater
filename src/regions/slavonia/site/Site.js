import { Water, waterDatum } from './Water.js';
import { Roads } from './Roads.js';
import { Rails } from './Rails.js';
import { Buildings } from './Buildings.js';
import { buildPlots } from './Plots.js';
import { Occupancy } from './Occupancy.js';
import { layPark } from './Park.js';
import { layFences } from './Fences.js';
import { layBeside } from './Beside.js';

// The Site: one plain-data model of the place, made once from the map data of the block. Every
// system reads the Site. None reads the map files, and none asks another system what it did
// (docs/slavonia/DESIGN.md, section 2).
//
//   center, datum   where the patch sits on the map grid, and the level of its water above the sea
//   water           every body of water, the current, and what a fishing float lies in (Water.js)
//   roads           the road graph: nodes, and roads between them with their class and level (Roads.js)
//   rails           the railway: each track's line and level, and its bridges (Rails.js)
//   buildings       the footprints: true ring, the rectangles it is made of, the street it faces,
//                   what kind of building it is, and a landmark's grounds (Buildings.js)
//   beside          the parking and the pavements along the roads, where they were surveyed (Beside.js)
//   open, areas, trees   as surveyed (Survey.js): open ground the land cover calls a wood, made
//                   ground (a track, a court, a terrace), and trees where they were seen to stand
//   marinas, decks  what floats and what stands over the water, as surveyed (build/Marina.js)
//   props           pieces of the kit that stand about: benches, lamps, a gym's apparatus
//   plots           the strip of land each street-front building stands on (Plots.js)
//   occupancy       who owns each square metre, once the ground is cut (Occupancy.js)
//   park            where the game's fixed things and the anglers' platforms stand (Park.js)
//   fences          the fence along each plot's street line, and its gate (Fences.js)

// the datum of a block, from its water: the terrain needs it before the Site can be made
export { waterDatum };

// index: the tiles' index.json; water, places: water.json and places.json of the block; survey: its
// survey.json, what was measured on the orthophoto (tools/geodata/survey.py); seen, beside: what was
// seen by eye of its buildings and along its roads (Survey.js); parted, added, moved: the footprints that are
// several buildings, the buildings the map lacks, and the footprints the survey misplaced; open, areas, trees: the rest of what was seen; marinas, decks: on the water;
// ground( x, z ): the height of the dry ground, before anything is cut into it;
// landmarks: the buildings that have a model of their own, by name in lower case (Landmarks.js),
// each with the plan its model carries (build/Models.js), if it has one
export function buildSite( { index, water, places, survey, seen, parted, added, moved, beside, open, areas, trees, marinas, decks, props, ground, datum, landmarks } ) {

	const center = index.center;
	const buildings = new Buildings( places, { center, landmarks, survey, seen, parted, added, moved } );
	const rails = new Rails( places, { center, ground, survey } );
	const roads = new Roads( places, { center, ground, walls: buildings, survey, rails } );
	buildings.settle( { roads, ground, landmarks } );
	return {
		center, datum,
		water: new Water( water, { center, datum } ),
		roads, rails, buildings,
		beside: layBeside( roads, beside ),
		open, areas, trees: trees.map( ( [ x, z, height ] ) => ( { x, z, height } ) ),
		marinas, decks, props,
		plots: buildPlots( buildings, roads, open ),
		occupancy: null, park: null, fences: null,
	};

}

// once the terrain has been graded; kit: the kit's pieces that take ground ( platform, gate_yard )
export function occupy( site, terrain, kit ) {

	site.occupancy = new Occupancy( terrain, site );
	site.park = layPark( site, kit.get( 'platform' ) );
	site.fences = layFences( site, kit.get( 'gate_yard' ) );

}
