// The landmarks of the block: buildings that are modelled whole from photographs
// (tools/blender/*.py, one script per model) instead of raised by rule like the houses. A landmark is
// found by the name its footprint carries in the map data, and stands on that footprint: the model's
// origin on the ground at the middle of the footprint's rectangle, its front (+z) toward the street
// it faces. Where the map's outline is not the building (an apse left out, a yard it never had), the
// model says what is: its plan replaces the outline, and brings its grounds with it (build/Models.js).
//
//   name      the footprint's name in the map data
//   faces     the street its front is on (a church at a junction has a street at its back too, and
//             the nearer one is not always the one it faces)
//   model     its file under public/
//   surfaces  what each material of the model is made of: a pattern of the village material
//             (build/VillageMaterial.js SURFACE); a material that is not listed is plain paint
export const LANDMARKS = [
	{
		name: 'Crkva Svetog Roka', faces: 'Ulica Stjepana Radića', model: 'models/slavonia/st-roch.glb',
		surfaces: { wall: 'render', trim: 'render', plinth: 'concrete', glass: 'glass', tile: 'tile', dome: 'sheet', door: 'boards', louvre: 'boards', stone: 'concrete', paving: 'concrete' },
	},
	{
		name: 'crkva svetog Andrije', faces: 'Ulica Matije Gupca', model: 'models/slavonia/st-andrew.glb',
		surfaces: { wall: 'render', trim: 'render', plinth: 'concrete', glass: 'glass', tile: 'tile', spire: 'sheet', door: 'boards', louvre: 'boards', ridge: 'tile', pipe: 'sheet', brick: 'brick', stone: 'concrete', paving: 'concrete' },
	},
];
