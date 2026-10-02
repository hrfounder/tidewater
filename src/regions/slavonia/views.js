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
	// St Roch's from across Ulica Stjepana Radića: its front and its tower (the texturing target)
	churchFront: { pos: [ 66, 1.7, - 213 ], ground: true, target: [ 44, 11, - 195 ], fov: 70 },
	// a long house of that street from its own verge: walls, windows and roof close up
	houseFront: { pos: [ 275.4, 1.7, - 203.9 ], ground: true, target: [ 273.5, 2.4, - 217.7 ], fov: 65 },
	// standing on Most Bosut's approach, looking along the road onto the bridge
	bridgeRoad: { pos: [ 8, 1.7, 65 ], ground: true, target: [ 0, 2.5, 0 ], fov: 60 },
	// St Andrew's from the parking across Ulica Matije Gupca, where the street tour of the footage
	// stood (drone1 f_020): the facade, the tower, the fence
	andrewStreet: { pos: [ - 54.7, 1.7, 160.7 ], ground: true, target: [ - 42.4, 15, 184.5 ], fov: 62 },
	// St Andrew's from before and above, as the orbit of the footage saw its front (drone5 f012)
	andrewAir: { pos: [ - 66.4, 20.8, 165.7 ], ground: true, target: [ - 59.0, 20.5, 172.4 ], fov: 78 },
	// and from behind and above: the apse between the two annexes (drone5 f006)
	andrewRear: { pos: [ - 6.1, 18, 211.3 ], ground: true, target: [ - 32.0, 10, 193.8 ], fov: 60 },
	// St Roch's north-west flank from the pavement of Vinkovačka ulica, as the street tour of the
	// footage passed it (drone1 at 24 s): the three windows, the three-sided end, the iron fence
	rochFlank: { pos: [ 30.3, 1.7, - 221.7 ], ground: true, target: [ 40.6, 11, - 196.8 ], fov: 62 },
	// St Roch's and its yard from before and above
	rochAir: { pos: [ 68.2, 22, - 229.4 ], ground: true, target: [ 43.9, 7, - 199.3 ], fov: 60 },
	// the park on the south bank, the school behind it, from over the river
	parkAir: { pos: [ 60, 60, - 40 ], ground: true, target: [ 135, 0, 70 ], fov: 60 },
	// the school's sports ground: the track, the courts
	sportAir: { pos: [ 150, 70, 230 ], ground: true, target: [ 215, 0, 130 ], fov: 60 },
	// the municipality and the shop from across Vinkovačka ulica, St Roch's beyond (drone1 at 30 s)
	opcinaStreet: { pos: [ - 6, 1.7, - 108 ], ground: true, target: [ 22, 6, - 118 ], fov: 70 },
};
