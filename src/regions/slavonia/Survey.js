// What was seen of the place by eye, building by building and street by street, that no file
// measures: on the survey sheets of the orthophoto (tools/geodata/sheet.py) and in the footage of the
// villages. The map says what there is, the survey of the orthophoto (survey.json) where it stands
// and what colour its roof is; this says the rest, for whatever has been looked at so far. It grows
// outward from the landmarks, a ring at a time: what is not here yet is built by rule
// (build/Archetypes.js).
//
// Coordinates are the patch's metres, x = east, z = south, read off a sheet.

// The buildings. `at` is a point on the building (anywhere inside its footprint); the rest is what was
// seen of it, each optional:
//   is        the kind of building it is: a name of ARCHETYPES (the rule goes by its footprint alone)
//   storeys   how many
//   walls     [ surface, [ r, g, b ] ]: what its walls are (a name of the village material's SURFACE)
//             and their colour, sRGB 0-255
//   form      its roof's: 'gable' or 'hip'
//   source    where it was seen: the frame or the sheet
export const SEEN = [
	// the long yellow row on the street north-west of St Andrew's, brick at its corners and round its
	// door, under a dark red hipped roof
	{ at: [ - 62, 139 ], is: 'longhouse', storeys: 1, walls: [ 'render', [ 228, 186, 96 ] ], form: 'hip', source: 'drone1 at 63-72 s; sheet andrew-ring1' },
	// across that street from the row: the long house with the dark roof, its cream gable to Ulica
	// Matije Gupca; and the red-roofed one beside it, the same
	{ at: [ - 81, 145 ], is: 'longhouse', storeys: 1, walls: [ 'render', [ 236, 228, 208 ] ], form: 'gable', source: 'drone5 f006; sheet andrew-ring1' },
	{ at: [ - 92, 169 ], is: 'longhouse', storeys: 1, walls: [ 'render', [ 236, 228, 208 ] ], form: 'gable', source: 'drone5 f006; sheet andrew-ring1' },
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
	// the walk outside the churchyard's fence along Ulica Vladimira Nazora, a grass verge between it and the road
	{ along: 'Ulica Vladimira Nazora', from: [ - 60, 191 ], to: [ - 24, 222 ], out: [ 3.5, 4.7 ], of: 'paving', source: 'orthophoto at 5 cm; drone5 f002' },
];
