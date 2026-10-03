// The buildings that are modelled whole from photographs and footage (tools/blender/*.py, one script
// per model) instead of raised by rule: the churches, and every house that has been seen well enough
// to be built as it is. Each stands on its footprint: the model's origin on the ground at the middle
// of the footprint's rectangle, its front (+z) toward the street it faces. Where the map's outline is
// not the building (an apse left out, a yard it never had), the model says what is: its plan replaces
// the outline, and brings its grounds with it (build/Models.js).
//
//   name      the footprint's name in the map data, for a building the map names; or
//   at        a point in the footprint as the Site has it (after the survey has moved, added and
//             parted what it has), for one it does not
//   faces     the street its front is on (a church at a junction has a street at its back too, and
//             the nearer one is not always the one it faces)
//   model     its file under public/
//   surfaces  what each material of the model is made of: a pattern of the village material
//             (build/VillageMaterial.js SURFACE); a material that is not listed is plain paint
// what the materials of a house built by tools/blender/house.py are made of
const HOUSE = { wall: 'render', plinth: 'concrete', glass: 'glass', tile: 'tile', sheet: 'sheet', fascia: 'boards', soffit: 'render', post: 'boards', brick: 'brick', boards: 'boards', paving: 'concrete', stone: 'concrete', strip: 'render', steel: 'plain' };

// how a landmark is known: by its name, or by its model
export const keyOf = ( l ) => l.name ? l.name.toLowerCase() : l.model;

export const LANDMARKS = [
	{
		name: 'Crkva Svetog Roka', faces: 'Ulica Stjepana Radića', model: 'models/slavonia/st-roch.glb',
		surfaces: { wall: 'render', trim: 'render', plinth: 'concrete', glass: 'glass', tile: 'tile', dome: 'sheet', door: 'boards', louvre: 'boards', stone: 'concrete', paving: 'concrete' },
	},
	{
		name: 'crkva svetog Andrije', faces: 'Ulica Matije Gupca', model: 'models/slavonia/st-andrew.glb',
		surfaces: { wall: 'render', trim: 'render', plinth: 'concrete', glass: 'glass', tile: 'tile', spire: 'sheet', door: 'boards', louvre: 'boards', ridge: 'tile', pipe: 'sheet', brick: 'brick', stone: 'concrete', paving: 'concrete' },
	},
	// the houses, each built as it is from the street tour of 2025 (tools/blender/houses/*.py)
	{ at: [ 21, - 117.6 ], faces: 'Vinkovačka ulica', model: 'models/slavonia/houses/opcina.glb', surfaces: HOUSE },
	{ at: [ 18.3, - 130.5 ], faces: 'Vinkovačka ulica', model: 'models/slavonia/houses/posta.glb', surfaces: HOUSE },
	{ at: [ 129.3, 76.7 ], faces: 'Školska ulica', model: 'models/slavonia/houses/school.glb', surfaces: HOUSE },
];
