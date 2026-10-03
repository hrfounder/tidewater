// What was seen of the place by eye, building by building and street by street, that no file
// measures: on the survey sheets of the orthophoto (tools/geodata/sheet.py) and in the footage of the
// villages. The map says what there is, the survey of the orthophoto (survey.json) where it stands
// and what colour its roof is; this says the rest, for whatever has been looked at so far. It grows
// outward from the landmarks, a ring at a time: what is not here yet is built by rule
// (build/Archetypes.js).
//
// Coordinates are the patch's metres, x = east, z = south, read off a sheet.

// Footprints the map draws as one and that are several buildings in a row (a house on the street and
// the barns behind it under one outline): `at` a point in the footprint, `cuts` the lines it is cut
// along, each [ [ x, z ], [ x, z ] ] across it where one roof ends and the next begins. Every part is
// a building of its own from then on, and SEEN finds each by a point in it.
export const PARTED = [
	// north-east of St Andrew's: the ochre house on Ulica Matije Gupca, and the long brick row behind it
	// along the churchyard (the roofs change 9.5 m from the street end)
	{ at: [ - 12, 169 ], cuts: [ [ [ - 14.1, 156.6 ], [ - 24.9, 168.4 ] ] ], source: 'sheet 1414; drone5 f001, f002' },
];

// Footprints of the map where nothing stands on the orthophoto (a building pulled down, a yard drawn
// as one): `at` a point in the footprint as the survey has it.
export const GONE = [
	// south of the municipality: a gravel lot where lorries stand, a lawn, a hedge
	{ at: [ 12, - 56.5 ], source: 'sheet 1542' },
	{ at: [ 8, - 75.3 ], source: 'sheet 1542' },
	{ at: [ 17.4, - 74.3 ], source: 'sheet 1542' },
	// west of Vinkovačka ulica opposite the municipality the map has three small outlines where two
	// halls and a flat-roofed building stand (ADDED): each is a corner of one of them
	{ at: [ - 15.2, - 141.6 ], source: 'sheet blue' },
	{ at: [ - 13.5, - 122.9 ], source: 'sheet blue' },
	{ at: [ - 14.2, - 108.6 ], source: 'sheet blue' },
	// on the north bank east of the bridge: a lawn with garden beds, and grass by the bank road
	{ at: [ 110, - 85.5 ], source: 'sheet sweep-4b' },
	{ at: [ 107.5, - 68.5 ], source: 'sheet sweep-4b' },
];

// Footprints the survey of the orthophoto set down in the wrong place (its fit goes by the contrast
// along the walls, and a paved yard's edge can outdo a roof's): `at` a point in the footprint where
// the survey has it, `by` the metres [ east, south ] from there to where its roof is on the sheet.
export const MOVED = [
	// the station house of Andrijaševci: the survey took the edge of the concrete before it for its
	// south wall. Its roof (the shaded north slope and the lit south one) lies 6.2 m further north.
	{ at: [ - 862, - 273 ], by: [ 0, - 6.2 ], source: 'sheet station' },
	// the house behind the gravel lot south of the municipality: the survey set it on the shadow north
	// of it; its two slopes lie 4.6 m further south
	{ at: [ 31.9, - 62.5 ], by: [ 0, 4.6 ], source: 'sheet 1542' },
	// at the block's north-east edge: a long building end-on to a lane, which the survey set across the
	// lane. Its pale slab under the trees lies 5 m further from it.
	{ at: [ 754, - 1083 ], by: [ 4.0, 3.1 ], source: 'sheet 754' },
];

// Buildings the map does not have, traced off the orthophoto, each as a rectangle: `at` its middle,
// `size` its [ length, width ] (m), `turn` the direction of its length (degrees from east toward
// south), `roof` the colour of its roof's lit slope as that picture has it (sRGB 0-255, read by
// tools/geodata/survey.py's own measure; the Site brings it to the game's brightness with the
// survey's gain). SEEN says the rest of each by a point in it.
export const ADDED = [
	// South of St Roch's the map has nothing between the churchyard and the yard of the shop, and
	// there stand: the house on Vinkovačka ulica behind the church; the long row along the churchyard's
	// south side and the house at its east end, on Ulica Stjepana Radića; behind the row a wing, a
	// house under new tiles and a lean-to under red sheet. (Traced on the sheet roch-rot, the
	// orthophoto turned to the row's own axes with a grid of 5 m.)
	{ at: [ 28.1, - 181.8 ], size: [ 9.4, 8.0 ], turn: 104, roof: [ 131, 117, 110 ], source: 'sheet roch-rot; drone1 at 21-24 s' },
	{ at: [ 44.1, - 180.6 ], size: [ 22.0, 5.0 ], turn: - 17.6, roof: [ 93, 82, 78 ], source: 'sheet roch-rot' },
	{ at: [ 60.9, - 183.8 ], size: [ 12.0, 8.0 ], turn: - 17.6, roof: [ 149, 125, 112 ], source: 'sheet roch-rot' },
	{ at: [ 53.6, - 175.4 ], size: [ 7.0, 10.5 ], turn: - 17.6, roof: [ 125, 110, 103 ], source: 'sheet roch-rot' },
	{ at: [ 40.7, - 172.1 ], size: [ 9.7, 8.0 ], turn: - 17.6, roof: [ 160, 116, 95 ], source: 'sheet roch-rot' },
	{ at: [ 26.6, - 171.2 ], size: [ 10.7, 6.0 ], turn: 11, roof: [ 114, 87, 87 ], source: 'sheet roch-rot' },
	// West of the parish house, on the street that leaves Vinkovačka ulica there: an L of two long
	// houses under old tiles, its one arm along the street and the other down the yard's west side,
	// and the sheds beyond its foot
	{ at: [ - 40.0, - 56.2 ], size: [ 16.0, 6.8 ], turn: 0, roof: [ 132, 115, 106 ], source: 'sheet parish' },
	{ at: [ - 53.7, - 51.6 ], size: [ 14.5, 6.8 ], turn: 108.4, roof: [ 75, 69, 67 ], source: 'sheet parish' },
	{ at: [ - 56.2, - 39.9 ], size: [ 9.0, 6.0 ], turn: 108.4, roof: [ 95, 87, 77 ], source: 'sheet parish' },
	// West of Vinkovačka ulica opposite the municipality: a hall under blue sheet, solar panels on the
	// east half of its roof; a longer hall under grey sheet against its south wall; and a low building
	// with a flat white roof before that one, on the street
	{ at: [ - 23.5, - 135.3 ], size: [ 22.5, 11.2 ], turn: 14, roof: [ 74, 109, 154 ], source: 'sheet blue' },
	{ at: [ - 24.1, - 125.0 ], size: [ 28.8, 9.0 ], turn: 14, roof: [ 106, 117, 125 ], source: 'sheet blue' },
	{ at: [ - 18.3, - 115.3 ], size: [ 11.8, 6.0 ], turn: 14, roof: [ 215, 220, 225 ], source: 'sheet blue' },
	// behind the municipality, along its yard's east side: a long wing under tiles
	{ at: [ 29.7, - 121.0 ], size: [ 24.0, 4.8 ], turn: 95.7, roof: [ 123, 98, 84 ], source: 'sheet sweep-1' },
	// South of the bridge: the outbuilding beside the restaurant; a flat-roofed garage under the trees
	// west of the first house on Ulica Matije Gupca; a long shed under tiles between that house and
	// the next; a white flat roof by the hall with the solar panels
	{ at: [ 27.2, 42.5 ], size: [ 5.5, 5.0 ], turn: 17.5, roof: [ 134, 112, 102 ], source: 'sheet sweep-3' },
	{ at: [ - 41.2, 75.5 ], size: [ 8.5, 9.0 ], turn: 0, roof: [ 112, 109, 101 ], source: 'sheet sweep-3' },
	{ at: [ - 32.3, 100.5 ], size: [ 14.0, 4.0 ], turn: 34.8, roof: [ 150, 129, 116 ], source: 'sheet sweep-3' },
	{ at: [ - 48.5, 111.5 ], size: [ 9.0, 6.0 ], turn: 35, roof: [ 216, 215, 208 ], source: 'sheet sweep-3' },
	// on the north bank: a small house under a dark roof east of the bridge, a shed west of it
	{ at: [ 70.2, - 93.5 ], size: [ 7.0, 6.5 ], turn: - 22, roof: [ 84, 80, 76 ], source: 'sheet sweep-4b' },
	{ at: [ - 127.5, - 27.5 ], size: [ 7.0, 4.0 ], turn: 120, roof: [ 126, 111, 103 ], source: 'sheet sweep-5' },
	// South of the marina's bank, on the street behind it: the building with the playground (a
	// kindergarten by the look of its yard). The map has its south-east end only; north-west of that
	// it goes on under dark red tiles with solar panels, and then under a dark roof. (A white canopy
	// stands beyond that end: it has no walls and is not built.)
	{ at: [ - 77.8, 121.3 ], size: [ 13.8, 11.5 ], turn: 42, roof: [ 122, 89, 88 ], source: 'sheet kg' },
	{ at: [ - 86.0, 112.2 ], size: [ 10.5, 11.0 ], turn: 42, roof: [ 55, 54, 63 ], source: 'sheet kg' },
	// East of Ulica Stjepana Radića, on the street that leaves it south of St Roch's: a long house
	// under red tiles between two mapped ones, and a grey-roofed building behind the next
	{ at: [ 143.6, - 153.8 ], size: [ 17.0, 6.5 ], turn: 66, roof: [ 139, 97, 81 ], source: 'sheet sweep-9' },
	{ at: [ 159.8, - 119.0 ], size: [ 11.0, 10.0 ], turn: - 15, roof: [ 116, 115, 111 ], source: 'sheet sweep-9' },
];

// The buildings. `at` is a point on the building (anywhere inside its footprint); the rest is what was
// seen of it, each optional:
//   is        the kind of building it is: a name of ARCHETYPES (the rule goes by its footprint alone)
//   storeys   how many
//   walls     [ surface, [ r, g, b ] ]: what its walls are (a name of the village material's SURFACE)
//             and their colour, sRGB 0-255
//   form      its roof's: 'gable' or 'hip'
//   pitch     its roof's pitch (degrees), where it is not its kind's: a flat roof falls 3
//   roof      its roof's colour, where it is not what the orthophoto has (a roof laid since): [ r, g, b ]
//   source    where it was seen: the frame or the sheet
export const SEEN = [
	// the parish house on Vinkovačka ulica: two storeys, cream, a red tiled roof, its gable to the street
	{ at: [ - 31, - 49 ], is: 'house', storeys: 2, walls: [ 'render', [ 236, 230, 214 ] ], form: 'gable', source: 'drone1 at 36 s' },
	// the restaurant by the bridge's south end: one storey of dark boards under a bright red roof laid
	// since the orthophoto was flown
	{ at: [ 35, 49 ], is: 'house', storeys: 1, walls: [ 'boards', [ 150, 112, 82 ] ], form: 'gable', roof: [ 150, 52, 44 ], source: 'drone2 at 18-21 s' },
	// the park's pavilion on the bank: one storey of brown boards under a dark red roof
	{ at: [ 93, 13 ], is: 'house', storeys: 1, walls: [ 'boards', [ 132, 100, 74 ] ], form: 'gable', source: 'drone4 at 3 s; sheet park' },
	// the long yellow row on the street north-west of St Andrew's, brick at its corners and round its
	// door, under a dark red hipped roof
	{ at: [ - 62, 139 ], is: 'longhouse', storeys: 1, walls: [ 'render', [ 228, 186, 96 ] ], form: 'hip', source: 'drone1 at 63-72 s; sheet andrew-ring1' },
	// across that street from the row: the long house with the dark roof, its cream gable to Ulica
	// Matije Gupca; and the red-roofed one beside it, the same
	{ at: [ - 81, 145 ], is: 'longhouse', storeys: 1, walls: [ 'render', [ 236, 228, 208 ] ], form: 'gable', source: 'drone5 f006; sheet andrew-ring1' },
	{ at: [ - 92, 169 ], is: 'longhouse', storeys: 1, walls: [ 'render', [ 236, 228, 208 ] ], form: 'gable', source: 'drone5 f006; sheet andrew-ring1' },
	// South of St Roch's, the buildings the map lacks (ADDED): the house behind the church on Vinkovačka
	// ulica is cream under a hipped roof of old tiles (the street tour passes it); of the others only
	// the roofs were seen, and what each is by its place in the yard
	{ at: [ 28.1, - 181.8 ], is: 'house', storeys: 1, walls: [ 'render', [ 226, 214, 186 ] ], form: 'hip', source: 'drone1 at 21-24 s' },
	{ at: [ 44.1, - 180.6 ], is: 'barn', source: 'sheet roch-rot' },
	{ at: [ 60.9, - 183.8 ], is: 'house', form: 'hip', source: 'sheet roch-rot' },
	{ at: [ 53.6, - 175.4 ], is: 'barn', source: 'sheet roch-rot' },
	{ at: [ 40.7, - 172.1 ], is: 'house', form: 'gable', source: 'sheet roch-rot' },
	{ at: [ 26.6, - 171.2 ], is: 'shed', source: 'sheet roch-rot' },
	// The centre, between the churches. Of the buildings the map lacks there (ADDED) only the roofs were
	// seen: what each is by its size and its place, and the flat roof's pitch
	{ at: [ - 40.0, - 56.2 ], is: 'longhouse', storeys: 1, form: 'gable', source: 'sheet parish' },
	{ at: [ - 53.7, - 51.6 ], is: 'longhouse', storeys: 1, form: 'gable', source: 'sheet parish' },
	{ at: [ - 56.2, - 39.9 ], is: 'barn', source: 'sheet parish' },
	{ at: [ - 23.5, - 135.3 ], is: 'hall', source: 'sheet blue' },
	{ at: [ - 24.1, - 125.0 ], is: 'hall', source: 'sheet blue' },
	{ at: [ - 18.3, - 115.3 ], is: 'public', storeys: 1, pitch: 3, source: 'sheet blue' },
	{ at: [ 29.7, - 121.0 ], is: 'longhouse', storeys: 1, form: 'gable', source: 'sheet sweep-1' },
	{ at: [ 27.2, 42.5 ], is: 'shed', source: 'sheet sweep-3' },
	{ at: [ - 41.2, 75.5 ], is: 'shed', pitch: 3, source: 'sheet sweep-3' },
	{ at: [ - 32.3, 100.5 ], is: 'shed', source: 'sheet sweep-3' },
	{ at: [ - 48.5, 111.5 ], is: 'shed', pitch: 3, source: 'sheet sweep-3' },
	{ at: [ 70.2, - 93.5 ], is: 'house', storeys: 1, source: 'sheet sweep-4b' },
	{ at: [ - 127.5, - 27.5 ], is: 'shed', source: 'sheet sweep-5' },
	{ at: [ - 77.8, 121.3 ], is: 'public', storeys: 1, form: 'gable', source: 'sheet kg' },
	{ at: [ - 86.0, 112.2 ], is: 'public', storeys: 1, source: 'sheet kg' },
	{ at: [ 143.6, - 153.8 ], is: 'longhouse', storeys: 1, form: 'gable', source: 'sheet sweep-9' },
	{ at: [ 159.8, - 119.0 ], is: 'barn', source: 'sheet sweep-9' },
	// Ring 1 round St Andrew's, off the orbit of the footage (drone5) and the sheet andrew.
	// North-east of the church: the house on the street, ochre under a hipped roof of newer red tiles
	// (the orthophoto's colour of its lit slope, 186, 141, 121, at the survey's gain); the row behind
	// it along the churchyard, bare brick with small shuttered windows under old tiles
	{ at: [ - 25, 160 ], is: 'house', storeys: 1, walls: [ 'render', [ 226, 180, 96 ] ], form: 'hip', roof: [ 109, 83, 71 ], source: 'drone5 f001, f002; sheet 1414' },
	{ at: [ - 10, 172 ], is: 'longhouse', storeys: 1, walls: [ 'brick', [ 150, 104, 84 ] ], form: 'gable', source: 'drone5 f001, f002; sheet 1414' },
	// east of the apse: the small house of bare brick, firewood stacked against it
	{ at: [ - 9, 195 ], is: 'house', storeys: 1, walls: [ 'brick', [ 150, 104, 84 ] ], form: 'gable', source: 'drone5 f001' },
	// south-east of it, its pink gable to Ulica Vladimira Nazora: a long white house under old tiles.
	// The orthophoto has its roof in the shadow of the house behind it; its tiles are those of the
	// brick row's, whose colour the survey read (73, 61, 55)
	{ at: [ - 12, 207 ], is: 'longhouse', storeys: 1, walls: [ 'render', [ 234, 232, 224 ] ], form: 'gable', roof: [ 73, 61, 55 ], source: 'drone5 f013' },
	// behind that one: two storeys, pale, under a roof of dark sheet
	{ at: [ - 8, 216 ], is: 'house', storeys: 2, walls: [ 'render', [ 224, 222, 216 ] ], form: 'gable', source: 'drone5 f013' },
	// across Ulica Vladimira Nazora from the church: the two-storey house, grey-brown render under
	// brown tiles, its eaves to the street; the grey garage beside it; the barn of dark boards under
	// old tiles; and the long white house with its gable to the street
	{ at: [ - 59, 205 ], is: 'house', storeys: 2, walls: [ 'render', [ 172, 162, 148 ] ], form: 'gable', source: 'drone5 f011' },
	{ at: [ - 52, 217 ], is: 'shed', storeys: 1, walls: [ 'render', [ 176, 176, 172 ] ], source: 'drone5 f011' },
	{ at: [ - 44, 226 ], is: 'barn', storeys: 1, walls: [ 'boards', [ 96, 80, 66 ] ], form: 'gable', source: 'drone5 f011' },
	{ at: [ - 36, 232 ], is: 'longhouse', storeys: 1, walls: [ 'render', [ 234, 232, 224 ] ], form: 'gable', source: 'drone5 f012' },
	// the hall behind it, yellow under a dark roof with solar panels on its south-east slope
	{ at: [ - 45, 130 ], is: 'hall', walls: [ 'render', [ 228, 186, 96 ] ], form: 'gable', source: 'drone5 f009, f010; sheet andrew-ring1' },
];

// What lies beside the roads: parking and pavements, each a strip along one stretch of road.
//   along     the road's name (null for one the map does not name): the stretch nearest the strip
//   from, to  two points on the strip's side of the road: it runs between where they fall on the road
//   out       [ nearest, farthest ]: the strip lies between these distances from the carriageway's edge (m)
//   of        'asphalt' (parking bays, a widening: the road's own surface carried out) or 'paving'
//             (a pavement of setts or concrete, a kerb's height above the road)
//   source    where it was seen
export const BESIDE = [
	// before St Andrew's: bays on the church's side of Ulica Matije Gupca, and the pavement along its fence
	{ along: 'Ulica Matije Gupca', from: [ - 57, 180 ], to: [ - 41, 164 ], out: [ 0, 5.5 ], of: 'asphalt', source: 'sheet andrew-ring1; drone5 f012' },
	{ along: 'Ulica Matije Gupca', from: [ - 57, 180 ], to: [ - 41, 164 ], out: [ 5.5, 7.3 ], of: 'paving', source: 'sheet andrew-ring1; drone5 f012' },
	// across the street, the bays before the hall and the yellow row
	{ along: 'Ulica Matije Gupca', from: [ - 53, 154 ], to: [ - 23, 131 ], out: [ 0, 5.5 ], of: 'asphalt', source: 'sheet andrew-ring1' },
	// south-west of the crossing: the angled bays on the north-west side, the hatched ones on the south-east
	{ along: 'Ulica Matije Gupca', from: [ - 65, 174 ], to: [ - 88, 197 ], out: [ 0, 6 ], of: 'asphalt', source: 'sheet andrew-ring1' },
	{ along: 'Ulica Matije Gupca', from: [ - 76, 194 ], to: [ - 87, 205 ], out: [ 0, 5 ], of: 'asphalt', source: 'sheet andrew-ring1' },
	// the red pavement along the yellow row
	{ along: null, from: [ - 81, 127.5 ], to: [ - 55, 155 ], out: [ 0.3, 3.3 ], of: 'paving', source: 'sheet andrew-ring1; drone1 at 63-72 s' },
	// before St Roch's: the paved ground between Ulica Stjepana Radića and the churchyard's fence, where
	// cars stand, and the pavement along the fence
	{ along: 'Ulica Stjepana Radića', from: [ 70, - 197 ], to: [ 62, - 216 ], out: [ 0, 5 ], of: 'asphalt', source: 'orthophoto at 5 cm; ROKOVCI-01.jpg' },
	{ along: 'Ulica Stjepana Radića', from: [ 70, - 197 ], to: [ 62, - 216 ], out: [ 5, 6.5 ], of: 'paving', source: 'orthophoto at 5 cm; ROKOVCI-01.jpg' },
	// before the municipality and the shop: the cars stand along both sides of Vinkovačka ulica, and a
	// pavement runs before the buildings on the east
	{ along: 'Vinkovačka ulica', from: [ 6.5, - 133.5 ], to: [ 4.6, - 90.5 ], out: [ 0, 5 ], of: 'asphalt', source: 'sheet opcina' },
	{ along: 'Vinkovačka ulica', from: [ 6, - 125 ], to: [ 4.6, - 90.5 ], out: [ 5, 6.4 ], of: 'paving', source: 'sheet opcina; drone1 at 30 s' },
	{ along: 'Vinkovačka ulica', from: [ - 7.7, - 122.5 ], to: [ - 12, - 87.4 ], out: [ 0, 5 ], of: 'asphalt', source: 'sheet opcina' },
	// the walk outside the churchyard's fence along Ulica Vladimira Nazora, a grass verge between it and the road
	{ along: 'Ulica Vladimira Nazora', from: [ - 60, 191 ], to: [ - 24, 222 ], out: [ 3.5, 4.7 ], of: 'paving', source: 'orthophoto at 5 cm; drone5 f002' },
];

// Open ground that the land cover calls a wood and is not one: a park, a school's grounds. Inside a
// ring nothing is planted by rule: its trees are the ones in TREES.
export const OPEN = [
	// the park on the south bank east of the bridge, the school's grounds and the sports ground
	{ ring: [ [ 22, 6 ], [ 100, - 2 ], [ 160, 2 ], [ 232, 44 ], [ 268, 150 ], [ 232, 212 ], [ 128, 148 ], [ 62, 84 ], [ 26, 62 ] ], source: 'sheets park, school, sport' },
	// the bank west of the bridge, behind the marina: lawn under large trees, between the water and the path
	{ ring: [ [ - 8, 36 ], [ - 150, 46 ], [ - 150, 60 ], [ - 100, 62 ], [ - 60, 61 ], [ - 6, 64 ] ], source: 'sheet marina; drone2 at 12-18 s' },
	// the lawn between that bank and the building with the playground
	{ ring: [ [ - 105, 62 ], [ - 60, 61 ], [ - 55, 80 ], [ - 62, 100 ], [ - 70, 112 ], [ - 92, 112 ], [ - 105, 95 ] ], source: 'sheet sweep-6' },
];

// Ground that is made: each a flat surface with straight sides (a ring that bulges nowhere inward).
//   of   'concrete' (a paved terrace), 'gravel' (a playground's ground), 'track' (red rubber),
//        'court' (blue acrylic), 'sand', 'brick' (a low brick edge)
export const AREAS = [
	// the playground behind the marina's bank: red rubber in a shape of lobes, here the ring round
	// them (its blue and green patches and its apparatus are not built)
	{ ring: [ [ - 81.3, 90.2 ], [ - 72.9, 88.4 ], [ - 65.8, 94.0 ], [ - 66.5, 102.2 ], [ - 71.9, 106.7 ], [ - 78.9, 108.5 ], [ - 84.4, 105.6 ], [ - 87.2, 98.3 ], [ - 85.4, 93.3 ] ], of: 'track', source: 'sheet kg' },
	// the station's loading yard: concrete from the siding's bed to the yard road, from the shed
	// south of the station house down to where the lorries' trailers stand
	{ ring: [ [ - 869.3, - 249 ], [ - 857.0, - 249 ], [ - 853.2, - 165 ], [ - 865.3, - 165 ] ], of: 'concrete', source: 'sheet station' },
	// the promenade on the park bank, where the stalls stand
	{ ring: [ [ 100.7, 10.6 ], [ 129.4, 10.6 ], [ 129.4, 14.8 ], [ 100.7, 14.8 ] ], of: 'concrete', source: 'sheet park' },
	// the playground west of it
	{ ring: [ [ 58.4, 26 ], [ 70, 19.9 ], [ 77.8, 24 ], [ 76, 36.8 ], [ 60, 34 ] ], of: 'gravel', source: 'sheet park' },
	// the outdoor gym: an L of red rubber between the promenade and the school's road, and the square
	// pit edged in brick at its inner corner. Laid since the orthophoto was flown: its shape is the
	// footage's (drone2 at 39-48 s), its place is judged from the school, the road and the bank in
	// those frames, good to ten metres or so.
	{ ring: [ [ 92, 24 ], [ 114, 24 ], [ 114, 32 ], [ 92, 32 ] ], of: 'track', source: 'drone2 at 39-48 s' },
	{ ring: [ [ 92, 32 ], [ 102, 32 ], [ 102, 40 ], [ 92, 40 ] ], of: 'track', source: 'drone2 at 39-48 s' },
	{ ring: [ [ 104, 34 ], [ 111, 34 ], [ 111, 35 ], [ 104, 35 ] ], of: 'brick', source: 'drone2 at 45 s' },
	{ ring: [ [ 104, 40 ], [ 111, 40 ], [ 111, 41 ], [ 104, 41 ] ], of: 'brick', source: 'drone2 at 45 s' },
	{ ring: [ [ 104, 35 ], [ 105, 35 ], [ 105, 40 ], [ 104, 40 ] ], of: 'brick', source: 'drone2 at 45 s' },
	{ ring: [ [ 110, 35 ], [ 111, 35 ], [ 111, 40 ], [ 110, 40 ] ], of: 'brick', source: 'drone2 at 45 s' },
	{ ring: [ [ 105, 35 ], [ 110, 35 ], [ 110, 40 ], [ 105, 40 ] ], of: 'gravel', source: 'drone2 at 45 s' },
	// the school's sports ground: the running track, the basketball court, the handball court, the sand court
	{ ring: [ [ 180.4, 75.2 ], [ 184.6, 71.2 ], [ 263.4, 156 ], [ 259.2, 160 ] ], of: 'track', source: 'sheet sport' },
	{ ring: [ [ 191.8, 121 ], [ 204.2, 107.8 ], [ 226.4, 129.2 ], [ 213.2, 142.4 ] ], of: 'court', source: 'sheet sport' },
	{ ring: [ [ 165.7, 147.2 ], [ 181.4, 131.7 ], [ 211.4, 162.2 ], [ 195.9, 177.7 ] ], of: 'court', source: 'sheet sport' },
	{ ring: [ [ 215.3, 196.4 ], [ 230.5, 183.2 ], [ 238.2, 192.9 ], [ 223.6, 206.8 ] ], of: 'sand', source: 'sheet sport' },
];

// Trees that were seen where they stand: [ x, z, height ]. The place is the middle of the crown on the
// orthophoto; the height is judged from the crown's width and its shadow.
export const TREES = [
	// on the lawn east of the playground ( sheet sweep-6 )
	[ - 62, 84, 11 ],
	// the park on the south bank ( sheets park and school )
	[ 87.6, 40.2, 15 ], [ 63, 54.6, 15 ], [ 102.4, 9.2, 11 ], [ 116.8, 25, 14 ], [ 125.2, 21.6, 14 ], [ 133.7, 24.1, 13 ],
	[ 140.4, 18.2, 12 ], [ 144.7, 25, 13 ], [ 159.9, 24.1, 15 ], [ 161.5, 29.6, 12 ], [ 186.9, 20.4, 14 ],
	// round the school
	[ 176.5, 66.5, 13 ], [ 152.3, 83.8, 14 ], [ 133.8, 96.5, 13 ], [ 159.2, 96.5, 12 ], [ 110.7, 111.5, 12 ], [ 185.7, 96.5, 12 ],
	// the bank behind the marina ( sheet marina; the game's water lies some metres further up this bank
	// than the orthophoto's, and the trees nearest it are set back from it )
	[ - 71.2, 52, 14 ], [ - 60.8, 54, 15 ], [ - 50.3, 51, 14 ], [ - 39.8, 52.2, 15 ], [ - 29.3, 49, 14 ], [ - 22.8, 56.1, 13 ], [ - 81.7, 58.7, 14 ], [ - 73.8, 58.5, 13 ], [ - 37.2, 58.5, 14 ], [ - 13.6, 58.7, 12 ],
	// between the track and the river
	[ 212, 78, 14 ], [ 224, 92, 14 ], [ 236, 106, 13 ], [ 247, 122, 13 ], [ 256, 140, 12 ],
];

// What floats, and what stands over the water (build/Marina.js). Neither is on the orthophoto, which is
// of 2022 and 2023: the marina was built since. Their forms are in the drone footage of 2025 (drone2
// at 0-18 s and at 30 s), which shows them on the south bank west of the bridge; where exactly they
// lie along it is judged from the bridge and the bank in those frames, not measured.
//   a marina   from, to: the pontoon's two ends; width; fingers: one every so many metres, their
//              length and width; river: the way the open water lies ( x, z ); gangway: how far
//              along the pontoon it comes down from the bank; boats: the fingers ( counted from
//              `from` ) that have a boat lying at them
export const MARINAS = [
	{ from: [ - 26, 29 ], to: [ - 80, 35 ], width: 2.4, fingers: { every: 6.5, length: 5.5, width: 0.9 }, river: [ 0, - 1 ], gangway: 5, boats: [ 0, 1, 3, 4, 6 ], source: 'drone2 at 0-12 s and 30 s' },
];
//   a deck     ring: a rectangle on the axes; level: its height over the water; open: the side of
//              the ring ( 0 is from its first corner to its second ) that is the bank's, without a
//              railing; moored: the boat of the kit that lies along the side across from it
export const DECKS = [
	// the landing by the bridge, where the excursion boat ties up
	{ ring: [ [ - 20, 25 ], [ - 8, 25 ], [ - 8, 35.5 ], [ - 20, 35.5 ] ], level: 1.5, open: 2, moored: 'excursion', source: 'drone2 at 15-18 s; sheet marina (the landing of 2022 at the same place)' },
];

// Things that stand about: each a piece of the kit (tools/blender/kit.py) at a place, turned by `yaw`
// degrees (0: the piece's front toward the south, turning toward the east).
export const PROPS = [
	// the outdoor gym: its bars, and the machines on the red ground (drone2 at 45 s; their places on
	// the pad are the footage's, the pad's own place is judged)
	{ piece: 'gym_bars', at: [ 111, 26 ], yaw: 90, source: 'drone2 at 45 s' },
	{ piece: 'gym_station', at: [ 96, 26 ], yaw: 30, source: 'drone2 at 45 s' },
	{ piece: 'gym_station', at: [ 100, 29 ], yaw: 200, source: 'drone2 at 45 s' },
	{ piece: 'gym_station', at: [ 104, 26.5 ], yaw: 120, source: 'drone2 at 45 s' },
	{ piece: 'gym_station', at: [ 107, 29.5 ], yaw: 300, source: 'drone2 at 45 s' },
	{ piece: 'gym_station', at: [ 95, 34 ], yaw: 250, source: 'drone2 at 45 s' },
	{ piece: 'gym_station', at: [ 99, 37 ], yaw: 60, source: 'drone2 at 45 s' },
	// benches by the pad and along the promenade, looking at the water; the park's lamps
	{ piece: 'bench', at: [ 117, 28 ], yaw: 270, source: 'drone2 at 42 s' },
	{ piece: 'bench', at: [ 106, 9.6 ], yaw: 180, source: 'drone2 at 36-39 s' },
	{ piece: 'bench', at: [ 116, 9.6 ], yaw: 180, source: 'drone2 at 36-39 s' },
	{ piece: 'bench', at: [ 126, 9.6 ], yaw: 180, source: 'drone2 at 36-39 s' },
	{ piece: 'park_lamp', at: [ 102, 16.5 ], yaw: 0, source: 'drone2 at 39 s' },
	{ piece: 'park_lamp', at: [ 128, 16.5 ], yaw: 0, source: 'drone2 at 39 s' },
	{ piece: 'park_lamp', at: [ 115, 33.5 ], yaw: 0, source: 'drone2 at 45 s' },
	// behind the marina: benches under the trees, lamps along the bank's path (drone2 at 12-15 s)
	{ piece: 'bench', at: [ - 30, 52 ], yaw: 180, source: 'drone2 at 12-15 s' },
	{ piece: 'bench', at: [ - 45, 54 ], yaw: 180, source: 'drone2 at 12-15 s' },
	{ piece: 'bench', at: [ - 62, 57 ], yaw: 180, source: 'drone2 at 12-15 s' },
	{ piece: 'park_lamp', at: [ - 24, 53 ], yaw: 0, source: 'drone2 at 12-15 s' },
	{ piece: 'park_lamp', at: [ - 52, 57 ], yaw: 0, source: 'drone2 at 12-15 s' },
];
