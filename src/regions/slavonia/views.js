// Fixed camera views of the Slavonian core block, used for the progress timelapse
// (tools/progress/shoot.sh -> docs/slavonia/progress/<view>/). Never move a view: every build step
// is captured from exactly the same places so the series can be played back. Add new views instead
// (they start their own series).
//
// Coordinates: the patch is centred on Most Bosut, the road bridge between Rokovci (north) and
// Andrijaševci (south); x = east, z = south (m). `pos` / `target` are [ x, y, z ]; with `ground`
// the y of pos is metres above the ground there instead of above the water. The sun and time of
// day are fixed by the shooter.
//
// photoBridge and photoChurch were calibrated once, after the first (baseline) capture, against the
// real banks (the precise channel and the corrected river level).
export const PROGRESS_VIEWS = {
	// the whole block from high up, looking north-west over the bridge
	overview: { pos: [ 900, 650, 1100 ], target: [ - 100, 0, - 150 ], fov: 55 },
	// the bridge, the river bend and both villages from a low aerial
	aerial: { pos: [ 300, 420, 700 ], target: [ 0, 0, 0 ], fov: 55 },
	// docs/slavonia/photos/bosut-winter-platforms-bridge.jpg: upstream of the bridge on the north
	// bank, looking west along the water to it
	photoBridge: { pos: [ 150, 1.7, - 46 ], ground: true, target: [ 0, 1.5, 4 ], fov: 60 },
	// docs/slavonia/photos/bosut-spring-anglers-church-reflection.jpg: from the park bank across
	// the water to St Roch's church
	photoChurch: { pos: [ 110, 1.6, - 3 ], ground: true, target: [ 42, 12, - 196 ], fov: 60 },
	// on the bank among the fishing platforms, looking down at the water's edge
	bankEdge: { pos: [ 95, 1.7, - 2 ], ground: true, target: [ 80, - 0.5, - 22 ], fov: 60 },
};
