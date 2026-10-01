import * as THREE from '../engine/index.js';

// Shared world layout. Coordinates in meters, y up, sea level y = 0.
// The open ocean lies to the south (+z); the island to the north (-z).
// Sun rises in the east (+x) and sets in the west (-x).
export const WORLD = {
	terrainSize: 2048, // heightmap domain, centered at origin
	terrainRes: 2048,

	// Central sandy beach inside the bay, shoreline near z ≈ -42 at x = 0.
	beach: { xMin: - 150, xMax: 170 },

	pier: {
		x: 55,
		zStart: - 64, // on dry sand
		zEnd: 40, // end of pier (~4 m depth)
		deckHeight: 2.3, // deck surface above sea level
		width: 2.6,
		headWidth: 14, // T-shaped platform at the end
		headDepth: 7,
	},

	// Where the boat is moored: east side of the pier head, bow pointing south.
	boatDock: { position: new THREE.Vector3( 64.5, 0, 36.5 ), heading: 0 },

	village: { center: new THREE.Vector3( 40, 0, - 118 ), radius: 95 },

	// the two stalls (FishStand, Chandlery). Each faces ( sin yaw, cos yaw ); a region moves them by
	// writing into these objects, which the stalls hold by reference
	stand: { x: 49.9, z: - 74.6, yaw: 1.45 }, // beside the boardwalk up from the pier foot, facing it
	chandlery: { x: 85.5, z: - 60.5, yaw: - 1.9 }, // faces the beach and the pier

	reef: { center: new THREE.Vector3( - 78, 0, 58 ), radius: 58 },

	spawn: { position: new THREE.Vector3( 18, 0, - 60 ), yaw: Math.PI }, // kept clear of rocks, plants and debris
	// where the player starts: on the boardwalk up from the pier foot, looking down it toward the pier
	start: { position: new THREE.Vector3( 53.6, 0, - 77 ), yaw: Math.PI },

	// Incoming swell direction (unit, travel direction)
	swellDir: new THREE.Vector2( - 0.12, - 1 ).normalize(),
};
