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
// The views on the river bank stand where the bank is. The first three of them (photoBridge,
// photoChurch, bankEdge) stood on the bank of a channel cut 32 m wide; the river is cut from its
// mapped bank line now (40 to 53 m here) and they were left under water, so their series end on
// 2026-10-02 and these take over: the same subjects from the true bank.
export const PROGRESS_VIEWS = {
	// the whole block from high up, looking north-west over the bridge
	overview: { pos: [ 900, 650, 1100 ], target: [ - 100, 0, - 150 ], fov: 55 },
	// the bridge, the river bend and both villages from a low aerial
	aerial: { pos: [ 300, 420, 700 ], target: [ 0, 0, 0 ], fov: 55 },
	// docs/slavonia/photos/bosut-winter-platforms-bridge.jpg: upstream of the bridge on the north
	// bank, looking west along the water to it
	bridgeBank: { pos: [ 150, 1.7, - 51 ], ground: true, target: [ 0, 1.5, 4 ], fov: 60 },
	// docs/slavonia/photos/bosut-spring-anglers-church-reflection.jpg: from the park bank across
	// the water to St Roch's church
	churchBank: { pos: [ 110, 1.6, 2.5 ], ground: true, target: [ 42, 12, - 196 ], fov: 60 },
	// a street in Rokovci, north of the bridge: the village houses along the road
	village: { pos: [ - 40, 6, - 230 ], ground: true, target: [ - 88, 4, - 318 ], fov: 55 },
	// on the park bank, looking down at the water's edge
	waterEdge: { pos: [ 95, 1.7, 3.5 ], ground: true, target: [ 80, - 0.5, - 17 ], fov: 60 },
	// standing on Most Bosut's approach, looking along the road onto the bridge
	bridgeRoad: { pos: [ 8, 1.7, 65 ], ground: true, target: [ 0, 2.5, 0 ], fov: 60 },
};
