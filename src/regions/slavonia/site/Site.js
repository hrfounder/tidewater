import { Water, waterDatum } from './Water.js';
import { Roads } from './Roads.js';
import { Rails } from './Rails.js';
import { Buildings } from './Buildings.js';
import { buildPlots } from './Plots.js';
import { Occupancy } from './Occupancy.js';
import { layPark } from './Park.js';
import { layFences } from './Fences.js';
import { layBeside } from './Beside.js';
import { courtAreas, courtFence } from './Courts.js';
import { pathAreas } from './Paths.js';
import { layStreets } from './Streets.js';

// The Site: one plain-data model of the place, made once from the map data of the block. Every
// system reads the Site. None reads the map files, and none asks another system what it did
// (docs/slavonia/DESIGN.md, section 2).
//
//   center, datum   where the patch sits on the map grid, and the level of its water above the sea
//   notes           Ivan's notes from the editor (edits.json): [ { at: [ x, z ], text } ], for the passes to come
//   water           every body of water, the current, and what a fishing float lies in (Water.js)
//   roads           the road graph: nodes, and roads between them with their class and level (Roads.js)
//   rails           the railway: each track's line and level, and its bridges (Rails.js)
//   buildings       the footprints: true ring, the rectangles it is made of, the street it faces,
//                   what kind of building it is, and a landmark's grounds (Buildings.js)
//   beside          the parking and the pavements along the roads: where they were surveyed (Beside.js),
//                   and elsewhere the village's street section, the houses on their pavement (Streets.js)
//   open, areas, trees   as surveyed (Survey.js): open ground the land cover calls a wood, made
//                   ground (a track, a court, a terrace), and trees where they were seen to stand
//   marinas, decks  what floats and what stands over the water, as surveyed (build/Marina.js)
//   courtFences     the fences round the courts: { height, runs: [ [ a, b ], ... ] }
//   props           pieces of the kit that stand about: benches, lamps, a gym's apparatus
//   plots           the strip of land each street-front building stands on (Plots.js)
//   occupancy       who owns each square metre, once the ground is cut (Occupancy.js)
//   park            where the game's fixed things and the anglers' platforms stand (Park.js)
//   fences          the fence along each plot's street line, and its gate (Fences.js)

// the datum of a block, from its water: the terrain needs it before the Site can be made
export { waterDatum };

// index: the tiles' index.json; water, places: water.json and places.json of the block; survey: its
// survey.json, what was measured on the orthophoto (tools/geodata/survey.py); seen, beside: what was
// seen by eye of its buildings and along its roads (Survey.js); parted, added, moved, gone: the footprints
// that are several buildings, the buildings the map lacks, the footprints the survey misplaced and
// those where nothing stands; open, areas, trees: the rest of what was seen; marinas, decks: on the water;
// ground( x, z ): the height of the dry ground, before anything is cut into it;
// landmarks: the buildings that have a model of their own, by name in lower case (Landmarks.js),
// each with the plan its model carries (build/Models.js), if it has one
export function buildSite( { index, water, places, survey, seen, parted, added, moved, gone, roadsSeen, courts, paths, beside, open, areas, trees, marinas, decks, props, ground, datum, landmarks, edits = {} } ) {

	const center = index.center;
	const buildings = new Buildings( places, { center, landmarks, survey, seen, parted, added, moved, gone } );
	const rails = new Rails( places, { center, ground, survey } );
	const roads = new Roads( places, { center, ground, walls: buildings, survey, rails, seen: roadsSeen } );
	buildings.settle( { roads, ground, landmarks } );
	// Ivan's corrections (the editor's edits.json), before the rules: what he set stays as he set it
	buildings.applyEdits( edits, ground );
	// the street section: the surveyed strips, then the rule's along the rest, which brings the street
	// fronts onto their pavements; the plots are drawn again from where the houses then stand
	const surveyed = layBeside( roads, beside );
	const streets = layStreets( { roads, buildings, plots: buildPlots( buildings, roads, open ), beside: surveyed, ground } );
	return {
		center, datum, notes: edits.notes || [],
		water: new Water( water, { center, datum } ),
		roads, rails, buildings,
		beside: [ ...surveyed, ...streets.strips ],
		// ( a court is made ground in layers, after the rest: Courts.js )
		open, areas: [ ...areas, ...paths.flatMap( pathAreas ), ...courts.flatMap( courtAreas ) ], courtFences: courts.map( courtFence ).filter( Boolean ), trees: trees.map( ( [ x, z, height ] ) => ( { x, z, height } ) ),
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
