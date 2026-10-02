import { SURFACE } from './VillageMaterial.js';

// What the buildings of a Slavonian village are, one entry per kind. A building is built from its
// footprint's pieces by its archetype (Village.js); adding a kind of building is adding an entry.
//
//   storeys   [ fewest, most ]
//   storey    floor to floor, and to the eaves on the top one (m)
//   plinth    how far the ground floor stands above the ground (m)
//   roof      form ('gable', or 'hip' where the footprint is one piece), pitch (degrees; `tiled`:
//             the pitch it has instead when it was seen to be tiled, where sheet lets it lie
//             flatter than tile can), the overhang at the eaves and at the verge (m), and what it is
//             covered with where the survey did not see it: [ surface, colours ]
//   walls     what the walls can be: [ surface, colours, weight ]
//   gable     what closes the gable above the eaves: null for the wall itself, or [ surface, colours ]
//   trim, joinery, doors   colours of the plaster surrounds, the window frames, the door leaves
//   windows   by the way a wall faces (street / side / back): the kit piece, the least room it is
//             given along the wall (m), the height of its sill above the floor (m)
//   door      the kit piece, and the wall it is in: 'street', 'side' or 'back'
//   fence     what its plot is fenced with on the street: [ style of FENCES, weight ]
//   vent      a round vent in each gable
//   chimneys  [ fewest, most ]
//
// Colours are sRGB 0-255 as read off the photographs in docs/slavonia/photos (by eye for now: the
// measured palette is M7 of docs/slavonia/DESIGN.md).

const TILE_ROOFS = [ [ 142, 94, 76 ], [ 128, 86, 72 ], [ 114, 82, 72 ], [ 100, 74, 66 ], [ 152, 102, 80 ] ];
const SHEET_ROOFS = [ [ 120, 122, 124 ], [ 96, 60, 52 ], [ 86, 92, 96 ] ];
// Rendered walls, each colour as often as it is seen. Counted on the houses that can be told apart in
// the footage round St Andrew's (drone5 f004, f006, f009, f012: some thirty): white and cream six in
// ten, yellow and ochre two, peach one, grey one in twenty; blue and green are single houses.
const often = ( list ) => list.flatMap( ( [ colour, times ] ) => Array( times ).fill( colour ) );
const RENDER = often( [ [ [ 240, 238, 232 ], 6 ], [ [ 236, 230, 214 ], 6 ], [ [ 232, 216, 170 ], 2 ], [ [ 226, 196, 120 ], 2 ], [ [ 228, 190, 160 ], 2 ], [ [ 176, 172, 164 ], 1 ], [ [ 204, 214, 226 ], 1 ], [ [ 200, 214, 186 ], 1 ] ] );
const ROUGH_RENDER = [ [ 176, 172, 164 ], [ 198, 190, 172 ], [ 214, 206, 188 ] ];
const CLAY = [ [ 170, 96, 64 ], [ 156, 86, 60 ] ];
const WEATHERED_BOARDS = [ [ 112, 96, 78 ], [ 96, 86, 74 ], [ 128, 104, 78 ] ];
const WHITE_TRIM = [ [ 242, 240, 232 ] ];
const JOINERY = [ [ 238, 236, 228 ], [ 92, 64, 44 ], [ 58, 84, 62 ], [ 60, 66, 74 ] ];
const DOORS = [ [ 92, 64, 44 ], [ 70, 50, 36 ], [ 58, 84, 62 ], [ 110, 40, 36 ] ];

export const ARCHETYPES = {
	// the old long house of the Military Frontier: one storey, narrow, a steep tiled roof, tall
	// windows in moulded surrounds on the street, the door on the yard side
	longhouse: {
		storeys: [ 1, 1 ], storey: 3.3, plinth: 0.5,
		roof: { form: 'gable', pitch: 42, eave: 0.45, verge: 0.18, cover: [ SURFACE.tile, TILE_ROOFS ] },
		walls: [ [ SURFACE.render, RENDER, 1 ] ],
		gable: null,
		trim: WHITE_TRIM, joinery: JOINERY, doors: DOORS,
		windows: { street: [ 'window_street', 2.3, 0.95 ], side: [ 'window_street', 3.4, 0.95 ], back: [ 'window_small', 4.0, 1.5 ] },
		door: [ 'door_house', 'side' ],
		fence: [ [ 'wall', 2 ], [ 'boards', 3 ] ],
		vent: true, chimneys: [ 1, 2 ],
	},
	// a house of the last fifty years: squarer, one or two storeys, a lower roof, plain windows; one
	// in five was never rendered and stands in its bare clay blocks
	house: {
		storeys: [ 1, 2 ], storey: 2.8, plinth: 0.4,
		roof: { form: 'hip', pitch: 30, eave: 0.6, verge: 0.35, cover: [ SURFACE.tile, TILE_ROOFS ] },
		walls: [ [ SURFACE.render, RENDER, 4 ], [ SURFACE.block, CLAY, 1 ] ],
		gable: null,
		trim: WHITE_TRIM, joinery: JOINERY, doors: DOORS,
		windows: { street: [ 'window_plain', 2.8, 0.9 ], side: [ 'window_plain', 3.4, 0.9 ], back: [ 'window_plain', 3.6, 0.9 ] },
		door: [ 'door_house', 'street' ],
		fence: [ [ 'low', 3 ], [ 'boards', 1 ] ],
		vent: false, chimneys: [ 1, 1 ],
	},
	// a shed, a summer kitchen, a sty, a garage: low and plain
	shed: {
		storeys: [ 1, 1 ], storey: 2.3, plinth: 0.1,
		roof: { form: 'gable', pitch: 28, eave: 0.3, verge: 0.12, cover: [ SURFACE.tile, TILE_ROOFS ] },
		walls: [ [ SURFACE.render, ROUGH_RENDER, 3 ], [ SURFACE.brick, CLAY, 2 ], [ SURFACE.boards, WEATHERED_BOARDS, 2 ] ],
		gable: [ SURFACE.boards, WEATHERED_BOARDS ],
		trim: ROUGH_RENDER, joinery: JOINERY, doors: DOORS,
		windows: { street: [ 'window_small', 3.0, 1.2 ], side: [ 'window_small', 5.0, 1.2 ], back: null },
		door: [ 'door_plank', 'street' ],
		fence: [ [ 'boards', 1 ] ],
		vent: false, chimneys: [ 0, 0 ],
	},
	// a barn at the back of the yard: taller, a pair of wide doors
	barn: {
		storeys: [ 1, 1 ], storey: 3.4, plinth: 0.1,
		roof: { form: 'gable', pitch: 36, eave: 0.4, verge: 0.15, cover: [ SURFACE.tile, TILE_ROOFS ] },
		walls: [ [ SURFACE.brick, CLAY, 2 ], [ SURFACE.render, ROUGH_RENDER, 2 ], [ SURFACE.boards, WEATHERED_BOARDS, 1 ] ],
		gable: [ SURFACE.boards, WEATHERED_BOARDS ],
		trim: ROUGH_RENDER, joinery: JOINERY, doors: DOORS,
		windows: { street: null, side: [ 'window_small', 5.0, 1.8 ], back: null },
		door: [ 'door_barn', 'street' ],
		fence: [ [ 'boards', 1 ] ],
		vent: false, chimneys: [ 0, 0 ],
	},
	// a hall: a shed of the co-operative, a workshop, a shop, a school: tall walls under a low sheet roof
	hall: {
		storeys: [ 1, 1 ], storey: 5.0, plinth: 0.15,
		roof: { form: 'gable', pitch: 14, tiled: 28, eave: 0.4, verge: 0.2, cover: [ SURFACE.sheet, SHEET_ROOFS ] },
		walls: [ [ SURFACE.render, ROUGH_RENDER, 3 ], [ SURFACE.render, RENDER, 1 ] ],
		gable: null,
		trim: ROUGH_RENDER, joinery: JOINERY, doors: DOORS,
		windows: { street: [ 'window_plain', 4.0, 2.2 ], side: [ 'window_plain', 5.0, 2.2 ], back: null },
		door: [ 'door_barn', 'street' ],
		fence: [ [ 'low', 1 ] ],
		vent: false, chimneys: [ 0, 0 ],
	},
};

// The fences of the street: how high and how thick (m), what of, and whether the house's own wall
// colour or the style's colours paint it.
export const FENCES = {
	// the old way: a rendered wall as high as a man, the gate in it
	wall: { height: 1.9, thick: 0.25, surface: SURFACE.render, colours: null },
	// upright boards, close set
	boards: { height: 1.6, thick: 0.05, surface: SURFACE.boards, colours: WEATHERED_BOARDS },
	// a low wall in front of a newer house
	low: { height: 0.9, thick: 0.2, surface: SURFACE.render, colours: ROUGH_RENDER },
};

// What a roof is covered with, from the colour the survey saw (sRGB): fired clay is redder than it is
// blue by REDDER, and redder than it is green. What is not clay here is fibre cement, concrete tile
// or sheet metal, all grey from above, and is drawn as sheet.
const REDDER = 1.15;
export const coverSeen = ( [ r, g, b ] ) => r > REDDER * b && r > g ? SURFACE.tile : SURFACE.sheet;

// A long house is narrow and long: its main piece no wider than this (m) and at least this many
// times as long as it is wide.
const LONGHOUSE_WIDTH = 8.5, LONGHOUSE_RATIO = 1.6;
// an outbuilding of this footprint or more is a barn (m2)
const BARN_AREA = 70;

// the archetype a building of the Site is built by, or null (a landmark has a model; a church waits
// for one): the one it was seen to be (Survey.js), or the one its footprint makes it
export function archetypeOf( b ) {

	if ( b.seen.is && b.kind !== 'landmark' && b.kind !== 'church' ) return ARCHETYPES[ b.seen.is ];
	if ( b.kind === 'hall' ) return ARCHETYPES.hall;
	if ( b.kind === 'outbuilding' ) return b.area >= BARN_AREA ? ARCHETYPES.barn : ARCHETYPES.shed;
	if ( b.kind !== 'house' ) return null;
	const main = b.pieces[ 0 ], short = 2 * Math.min( main.hu, main.hv ), long = 2 * Math.max( main.hu, main.hv );
	return short <= LONGHOUSE_WIDTH && long >= short * LONGHOUSE_RATIO ? ARCHETYPES.longhouse : ARCHETYPES.house;

}
