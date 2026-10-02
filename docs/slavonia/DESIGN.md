# The built world: design

Status: **proposed, awaiting approval** (2026-10-02). Nothing below is built yet.

This replaces the first pass at Slavonia's roads, houses, yards, bridges, plant placement and river
current, which was written without a design and then patched. It does not replace the terrain, the
tiles, the far field, the species, the fishing or the region plumbing: those are audited (section 8)
and kept where they hold.

## 1. What went wrong, in one line each

| First pass | Fault | Evidence |
|---|---|---|
| Houses: a box on the footprint's rectangle | 24% of footprints are not rectangles | area / rectangle below 0.90 for 733 of 3065; 879 have 6+ corners |
| Houses: angle paired with the wrong extent | 85% were built at 90° to their footprint | fixed in `4d73f6a`, measured there |
| Roads: a strip floating 7 cm over the ground | not part of the terrain, so it z-fights, steps and floats at distance | your screenshot 3 |
| Yards: a fence hung off each house wall | no notion of a plot or a street line; 1.2 M triangles of pickets | measured in the game |
| Plants: a coin flip per grid cell, then a keep-out mask and a "sink" to hide the result | each system patches the others' mistakes | trees in houses, plants hanging off the bank |
| Current: the wave pattern offset by flow × time | the offset shears without bound, since the flow differs across the channel | your "broken wave patterns" screenshots |
| Bridge, interim church | written from memory, not from the photographs | — |

The common cause: no shared model of the place. Each system read `places.json` on its own and
guessed what the others would do.

## 2. Principle: one model of the site, then everything is derived from it

`places.json` + the terrain are turned **once**, at load, into a plain-data **Site**. No meshes, no
GPU. Every system reads the Site; none reads `places.json` directly, and none asks another system
what it did.

```
places.json ─┐
terrain ─────┼─► Site (data) ─┬─► terrain edit (heights + masks)   roads, pads, banks
landmarks ───┘                ├─► meshes        buildings, kit pieces, bridges, landmarks
                              ├─► colliders
                              ├─► occupancy ──► plants, grass, props
                              └─► checks (numbers, section 7)
```

### The Site

- **RoadGraph**: nodes are junctions and ends (the data has 100 shared end points among 194 roads);
  edges are centrelines with a class. One table, `ROAD_CLASSES`, gives each class its carriageway,
  shoulder, kerb, camber and surface. Bridges are edges with a deck instead of a bed.
- **Buildings**: each has its true ring, the rectilinear pieces it decomposes into (one for the 72%
  that are rectangles, two or three for the L and T shapes), a **frontage** — the street edge it faces
  and the side of that edge it stands on, from the RoadGraph, streets only — and a kind (house,
  outbuilding, hall, landmark).
- **Plots**: the strip of land a house stands on, from its frontage to the next house either side.
  (Real cadastral parcels replace this when the DGU data arrives; the field is the same.)
- **Water**: the channel lines (kept as they are) and the flow field.
- **Occupancy**: one raster of who owns each square metre — road, building, yard, water, free. This is
  the only thing plants, grass and props consult. It replaces `builtMask`, `CROWN` and the per-system
  exclusions.

## 3. Roads are terrain, not meshes

A road is **graded into the heightfield** by the same pass that already cuts the river channels:
the bed is levelled along the centreline with its camber, the shoulders blend into the ground over
a metre or two. The terrain mesh then *is* the road, so it cannot float, z-fight, or step, and the
terrain's LOD handles distance for free.

The surface is drawn by the ground shader from a **road mask**: the distance to the carriageway edge
and the surface class, written into the terrain's rock channel, which is all zeros in this region and
which the region's shader is free to give its own meaning (as it already does for the four splat
channels). No new texture: the fragment stage is at its limit of 32.

Only what stands above the ground is geometry: kerbs in the village, bridge decks, and later signs
and lamps. Junctions come out right because the mask is a union, not overlapping strips.

## 4. Buildings: archetypes on true footprints, landmarks as models

- **Archetype table** (`ARCHETYPES`): one entry per kind of building — Šokac house, modern house,
  outbuilding, barn or hall. Each entry holds the wall height, roof form and pitch, openings rule,
  chimney, and palette. A building is built from its ring's pieces by its archetype; adding a kind
  touches one table.
- **Roofs follow the ring**: a gable along each piece, joined by a valley where an L or T meets,
  instead of one roof on a rectangle that overhangs the real walls.
- **The front** (door, street windows, the fence line) comes from the frontage, not from the
  rectangle's shorter end.
- **Kit pieces from Blender**: doors, windows, chimneys, gates, fence panels are modelled once
  (`tools/blender/kit_*.py`), exported, and instanced. That is where the look improves cheaply.
- **Landmarks** are whole models from photographs, as St Roch's now is (`tools/blender/st_roch.py`,
  `Landmarks.js`, both kept). Next: St Andrew's (photos in `docs/slavonia/andrijasevci`), Most Bosut
  (your two bridge photos).
- **Materials**: a village material with a small texture set (lime render, clay tile, timber,
  concrete) in place of flat vertex colours. This is the largest single gain in looks. It needs a
  check against the texture budget first; if it does not fit, the pattern functions the prop
  material already has are extended instead.
- **Colliders** for every building, from its pieces. There are none today: the player walks through
  the houses.

## 5. Yards and fences

A fence runs along the **plot's street line**, between a house and its neighbour, with the gate where
the yard opens. It is instanced kit panels with a fade distance, not merged pickets. Budget: under
150 k triangles for the block (today: 1.2 M).

## 6. Plants, and the river

- **Placement** is per species from one `HABITATS` table (where it grows: distance to water, height
  over it, cover class, occupancy), sampled as blue noise so spacing is even, not a coin flip per
  cell. Nothing is planted where occupancy is not free, so no keep-out patches.
- **Ground contact**: plants hung in the air because the terrain mesh cuts convex corners between
  its vertices. The fix belongs in the plant, not the placement: each model's root runs below its
  origin, so it meets the ground whatever the mesh does. "Sink by a fraction" goes.
- **Current**: two copies of the wave pattern, each carried along the flow for a few seconds and
  cross-faded as it resets (a flow map). The distortion is bounded by that period, instead of growing
  for as long as the game runs.
- **Colour by numbers**: the water, grass, roofs and walls are matched to your photographs as
  measured values, not by eye — sampled patches, corrected for the light in each photo, compared
  against the same patches rendered at the matching sun height and season. Wave height and frequency
  likewise (the 9 Hz → 1.37 Hz measurement is the model for this).

## 7. How each stage is checked

Every milestone ends with numbers, then a timelapse capture.

| Check | Passes when |
|---|---|
| Footprint fit | no ring point more than 0.5 m outside its building (today: 0 of 3065 after the fix) |
| Road conformance | road surface equals terrain by construction; no grade over 8% outside the data's own |
| Overlap | 0 plants, fences or props on occupied ground; 0 buildings intersecting a road |
| Bridges | deck meets the road at both ends within 2 cm |
| Budget | frame time at the bench views no worse than today (7.9 ms at the bridge, 2560×1267); triangle counts per system reported |
| Water | surface frequency and wave height measured at the boat; pattern distortion bounded by the flow period |
| Colour | each sampled patch within tolerance of its photo-derived target |
| Island | the Caribbean region loads and renders unchanged after every engine-side change |

## 8. Kept, subject to audit

Read each, run its checks, fix or flag. In order:

1. `TileTerrain` — tile mosaic, channel cut, far field (the first pass's "median of dry ground" for
   the outside height is a guess to re-examine).
2. `TerrainGPU` / `Heightfield` — far field and flow packed in one texture; `terrainInside`.
3. `GroundSurface` — far farmland, parcel grid.
4. Flora's species, leaf stage and impostors (the *placement* is remade, section 6).
5. Fishing `sampleAt`, region `people` / `intro`.
6. Geodata tools and the timelapse capture.

## 9. Order of work

| | Milestone | Ends with |
|---|---|---|
| M0 | Audit of section 8 | a list of findings, fixes for anything wrong |
| M1 | Site model + its checks | the numbers of section 7 that need no rendering |
| M2 | Roads graded into the terrain, drawn by the ground shader | street-level and aerial captures |
| M3 | Buildings on true footprints by archetype; colliders | village capture; overlap check at 0 |
| M4 | Landmarks: finish St Roch's, St Andrew's, Most Bosut | side-by-side with each photograph |
| M5 | Kit pieces, plots, fences | budget check |
| M6 | Plant placement from occupancy; ground contact | overlap check at 0 |
| M7 | River current as a flow map; colour and waves by numbers | measured against the photographs |

Removed when their replacement lands: `Roads.js`, `Buildings.js`, `Yards.js`, `Bridge.js`,
`Church.js`, and in `Flora.js` the scatter, `builtMask` and the sink.

## 10. Open, for you to decide when we get there

- Textures on buildings (section 4) — or flat colour for now.
- Cadastral parcels from DGU for real plots, if and when you can supply them.
- The yard fence around St Roch's and the kerb lines: not in the map data; a photo of each would do.

## 11. State at hand-off (2026-10-02)

- Branch `ccr-f1d94ae0-dxdfac`. Last commits: `847797c` (St Roch's model + landmark loader),
  `4d73f6a` (houses on real footprints, ribbon roads). Pushed.
- Untracked: `docs/slavonia/rokovci/`, `docs/slavonia/andrijasevci/` (your reference photos).
- Blender is driven through the `mcp__Blender__*` tools (the official extension). The `blender` entry
  in `~/.claude.json` (`uvx blender-mcp`) is a different addon's bridge; it times out and can go.
- The game's dev server: `npm run dev` on port 5189; `?region=slavonia`. The browser pane throttles
  when hidden, so in-game checks are slow unless it is visible; node checks against the real modules
  are the quicker evidence.
- Reported and still open, all covered above: waves read as too much wind; broken wave patterns
  (the current, M7); the line that walks the shoreline; artifacts at distance; water colour.
