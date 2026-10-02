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
//   roof      its roof's colour, where it is not what the orthophoto has (a roof laid since): [ r, g, b ]
//   source    where it was seen: the frame or the sheet
export const SEEN = [
	// the municipality of Andrijaševci on Vinkovačka ulica: two storeys of yellow render, white windows
	// in rows; and the lower yellow wing north of it with the post office
	{ at: [ 22.5, - 117.5 ], is: 'public', storeys: 2, walls: [ 'render', [ 228, 186, 96 ] ], form: 'gable', source: 'drone1 at 30-33 s; sheet opcina' },
	{ at: [ 18, - 131 ], is: 'public', storeys: 1, walls: [ 'render', [ 228, 186, 96 ] ], form: 'gable', source: 'drone1 at 30 s; sheet opcina' },
	// the parish house on Vinkovačka ulica: two storeys, cream, a red tiled roof, its gable to the street
	{ at: [ - 31, - 49 ], is: 'house', storeys: 2, walls: [ 'render', [ 236, 230, 214 ] ], form: 'gable', source: 'drone1 at 36 s' },
	// the restaurant by the bridge's south end: one storey of dark boards under a bright red roof laid
	// since the orthophoto was flown
	{ at: [ 35, 49 ], is: 'house', storeys: 1, walls: [ 'boards', [ 150, 112, 82 ] ], form: 'gable', roof: [ 150, 52, 44 ], source: 'drone2 at 18-21 s' },
	// the park's pavilion on the bank: one storey of brown boards under a dark red roof
	{ at: [ 93, 13 ], is: 'house', storeys: 1, walls: [ 'boards', [ 132, 100, 74 ] ], form: 'gable', source: 'drone4 at 3 s; sheet park' },
	// the primary school by the park: two storeys, pale yellow, windows in rows under a dark red roof
	{ at: [ 138, 61 ], is: 'public', storeys: 2, walls: [ 'render', [ 236, 222, 168 ] ], form: 'gable', source: 'drone2 at 42 and 60-72 s; drone4; sheet school' },
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
];

// Ground that is made: each a flat surface with straight sides (a ring that bulges nowhere inward).
//   of   'concrete' (a paved terrace), 'gravel' (a playground's ground), 'track' (red rubber),
//        'court' (blue acrylic), 'sand', 'brick' (a low brick edge)
export const AREAS = [
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
