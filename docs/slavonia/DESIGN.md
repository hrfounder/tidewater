# The built world: design

Status: **approved 2026-10-02** ("lets start"; "redo the kept parts if you judge it too problematic").
M0 is done: its findings are section 8, and they moved the water and the patch size into the remake.

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
- **Water**: every body as the map draws it — areas with their true bank line (the Bosut is a mapped
  polygon, 33 to 55 m wide here), lines with a class width for what has no polygon (ditches, drains)
  — and one flow function. The fishing, the current and the terrain all read this; none keeps its
  own copy of the river.
- **Domain**: one square, the mapped block (4 km). The metre terrain, the places and the Site cover
  the same ground; nothing is built outside it.
- **Occupancy**: one raster of who owns each square metre — road, building, yard, water, free. This is
  the only thing plants, grass and props consult. It replaces `builtMask`, `CROWN` and the per-system
  exclusions.

## 3. The ground is the dry plain plus edits; roads are terrain, not meshes

The tiles carry the **dry ground**: the bare earth with the water bodies filled back to the level of
the land around them (the 30 m elevation model cannot see a bank; what it reports beside a river is
a smear of water, trees and slope). `TileTerrain` only resamples them. Everything cut into that
ground comes from the Site, in one grading pass at the patch's resolution (`Grade.js`):

1. **Water**: inside a body the bed falls at the bank slope to its depth; outside, the bank rises at
   the same slope from the waterline until it meets the plain. The bank height is whatever the plain
   stands above the water, so there is no bank-top parameter, no blend distance, and dry land beside
   the river cannot end up under it.
2. **Roads**: the bed is levelled along the centreline with its camber, the shoulders blend into the
   ground over a metre or two.
3. **Pads**: the ground under a building is levelled to its floor.

The terrain mesh then *is* the road, so it cannot float, z-fight, or step, and the terrain's LOD
handles distance for free.

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
- **Current**: the wave pattern is not carried along the flow. The first pass offset it by
  flow x time, which sheared it into streaks; a two-phase flow map would bound that, at twice the
  cost of every wave sample, to show a drift of 0.12 m/s that wind ripples cannot show anyway. The
  current is shown by what floats on it (M7: flecks and leaves on the surface, the float, the boat).
  Fixed 2026-10-02, with the strip of undrawn water along the bank (the island's swash sheet was
  still clipping the water on a river with no surf: the "line that walks the shoreline").
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

## 8. M0: what the audit found (2026-10-02)

Measured with `node tools/checks/terrain.mjs` and one-off probes against the real modules.

| Part | Finding | Number | Verdict |
|---|---|---|---|
| River channel | cut at a constant 32 m around the centreline; the map has the Bosut as a polygon | polygon 32.9 to 55.1 m wide in the patch, median 40.1 | **redo**: bank line from the polygon |
| River banks | the tiles carry the polygon's basin at 10 m, the game cuts a narrower one at 1 m on top | 5,125 dry texels under the water plane, 20 to 50 m from the centreline, down to -1.64 m | **redo**: dry ground in the tiles, one cut in the game |
| Bank top | sampled from the 30 m model 25 m beside the channel | 0.35 to 3.18 m over the water along 3 km | **redo**: the bank emerges from the plain |
| Patch size | metre terrain is 2 km, the places block 4 km | 378 of 3,065 buildings stand on the 10 m field | **redo**: one 4 km domain (load 1.0 s -> 4.1 s, bake 0.23 s -> 0.87 s in node) |
| Far ring | asks for 12,288 m, the tiles cover 13 km offset by 24 m | one 1 km column filled with a median | fix: the ring is the exported tiles |
| Patch edge | metre field against the 10 m field | mean 0.05 m; 115 of 8,188 edge points over 0.3 m, all on the river | follows from the redo; re-measure |
| Flood clamp | dry land under the water plane is held at 0.25 m | 3,068 texels (0.07 %) | keep: one water plane is the engine's limit; named and counted |
| Current | declared twice (`buildFlow`, `fish.js sampleAt`) with different profiles; `TileTerrain` imports `world.js`, which imports it | — | **redo** in the Site's water |
| Fine cut | steepest step between texels | 0.65 m per m | fine |
| `TerrainGPU`, `Heightfield` | far field and current share a texture; lookups match the CPU | read through | keep |
| `GroundSurface` | structure sound; every colour typed by eye | — | keep; colours in M7 |
| Flora species, impostors | not audited beyond reading | — | keep; revisit in M6 |
| Fishing table, people, intro | `test/region-slavonia.mjs` passes | all passed | keep |

Suspected, to be measured in the running game when the terrain is back up: the terrain mesh is 1.6 m
between vertices at 100 m and 3.2 m at 250 m, and a 1:2 bank moves under that by up to half the
spacing, so the waterline shifts as the mesh morphs with distance. That would be the "line that
walks the shoreline" and part of the "artifacts at distance". The ground shader also takes the wet
band from the mesh height rather than the true height.

## 9. Order of work

| | Milestone | Ends with |
|---|---|---|
| M0 | Audit (done) | section 8 |
| M1 | Water as vectors and dry ground in the tiles; Site model + its checks | the numbers of section 7 that need no rendering |
| M2 | Grading pass: water, roads, pads; roads drawn by the ground shader | street-level and aerial captures |
| M3 | Buildings on true footprints by archetype; colliders | village capture; overlap check at 0 |
| M4 | Landmarks: finish St Roch's, St Andrew's, Most Bosut | side-by-side with each photograph |
| M5 | Kit pieces, plots, fences | budget check |
| M6 | Plant placement from occupancy; ground contact | overlap check at 0 |
| M7 | The current shown by what floats; colour and waves by numbers | measured against the photographs |

Removed when their replacement lands: `TileTerrain`'s channel cut and flow, `rivers.json`, `Roads.js`, `Buildings.js`, `Yards.js`, `Bridge.js`,
`Church.js`, and in `Flora.js` the scatter, `builtMask` and the sink.

## 10. Open, for you to decide when we get there

- Textures on buildings (section 4) — or flat colour for now.
- Cadastral parcels from DGU for real plots, if and when you can supply them.
- The yard fence around St Roch's and the kerb lines: not in the map data; a photo of each would do.

## 11. The twin: what the map does not know (2026-10-02, night)

The goal moved from "a believable village on the right map" to a twin: every building and yard as
it is, built outward from the landmarks a ring at a time. The map (Overture / OpenStreetMap) is no
longer the truth, only the list of what there is. Three more sources sit on top of it, each
overriding the one before, and the Site is still the only thing anything reads:

| Source | What it gives | Where |
|---|---|---|
| the map | which buildings and roads exist, their outlines, names, how roads join | `places.json` (`tools/geodata/places.py`) |
| the orthophoto, measured | where each footprint really stands, each roof's colour, each paved road's line and width | `survey.json` (`tools/geodata/survey.py`) |
| what was seen by eye | per building: its kind, storeys, walls, roof form; beside the roads: parking and pavements | `src/regions/slavonia/Survey.js` |
| a landmark's model | its true plan, what cannot be walked through, its grounds: fence, paving, trees | the model's custom properties (`tools/blender/*.py` PLAN) |

The orthophoto is the State Geodetic Administration's (DGU geoportal WMS, layer
`DOF_LIDAR_2022_2023`, in the tiles' own grid, sharp to about 0.25 m). It showed that the mapped
footprints lie up to five metres from the buildings (median 3.7 m, mostly to the north-east) and the
road lines two to three metres beside the asphalt, and that the map leaves St Andrew's apse out.
The pictures stay outside the repository; only measurements are kept.

How a footprint is moved, and why it is held back: the fit compares the colour inside and outside
each wall. It cannot tell a roof from its shadow, and put the hall with the solar panels (mapped
right) onto its shadow. So a footprint moves only on strong evidence of its own, or with its street,
never toward the shadow and never onto surveyed asphalt; 630 of 3065 stay where the map has them.
This is good to a metre or so, not to a decimetre. The land registry's own outlines and parcels
(`tools/geodata/cadastre.py`, DGU's INSPIRE services) would replace both the fit and the invented
plots; the service gave no answer on the day and nothing reads it yet.

A ring is worked with a survey sheet: `python tools/geodata/sheet.py bosut <x>,<z> <half side>
<out.jpg>` draws the orthophoto of a square with every footprint numbered (mapped and surveyed),
the roads, and a grid in the game's metres. What is read off it goes into `Survey.js`.

A landmark is checked against its photographs before it goes into the game:
`tools/blender/look.py` renders the model from the places the photographs were taken from.

### What `Survey.js` holds

One file of what was seen, each kind of record with its own builder; adding a thing seen is adding
a record.

| Record | What it is | Built by |
|---|---|---|
| `SEEN` | per building: the kind it is, storeys, walls, roof form, a roof colour newer than the orthophoto | `build/Village.js` over its archetype |
| `BESIDE` | a strip of parking or pavement along a stretch of road | `site/Beside.js`, graded and drawn with the road or as a slab |
| `OPEN` | ground the land cover calls a wood and is not (a park): nothing planted by rule, the grass mown | `terrain/Grade.js`, `flora/` |
| `AREAS` | made ground with straight sides: a terrace, a playground, a track, a court | a level slab |
| `TREES` | a tree where its crown is on the orthophoto, and its height | `flora/Habitats.js`, before any rule plants |
| `MARINAS`, `DECKS` | a pontoon with its fingers, gangway and boats; a railed deck on piles and what is moored at it | `build/Marina.js` |

### Tried on the orthophoto, and why each was left

So that they are not tried again the same way:

- **Trees found automatically.** Crowns on these pictures are as dark and as blue as cast shadows
  (a crown's shaded side reads 26, 34, 44; a shadow on grass 31, 35, 48); only the lit part of a
  crown is green, and a bank of reeds is greener. A mask of green, dark, textured pixels found 73
  "trees" in the park, most of them reeds and shrubs along the bank, and missed the large crowns.
  Trees are entered by hand where they matter (`TREES`, a landmark's grounds).
- **Storeys from shadow length.** The sun stood 42 degrees up (St Andrew's 26 m tower throws 28.7 m),
  so a wall's shadow is 1.1 times its height. Measured from the footprint's shadow-side walls it
  gave 6.8 m for the school (right) and 5.5 m for the hall, but nothing for one building in three:
  a footprint a metre off starts the measurement on a lit roof or beyond the shadow, and a shaded
  slope cannot be told from the shadow it throws. It needs outlines good to a few decimetres: the
  cadastre's.
- **Labelling a drone frame.** A camera fitted to ten marked points of St Andrew's (all near the
  plane of its facade) was off by 11 px and put every other building on the horizon: the footage is
  wide-angle and reframed, and points in one plane do not fix a camera's depth. A frame with marked
  points at several depths, from an undistorted picture, would do.
- **A footprint's place by contrast alone**, without the guards: see above, the hall on its shadow.

## 12. State (2026-10-02, night)

Built, each with its check and a timelapse frame (`docs/slavonia/progress/`):

| | What | Where | Check |
|---|---|---|---|
| M0 | audit | section 8 | — |
| M1 | the Site: water, road graph, footprints, plots, occupancy | `src/regions/slavonia/site/` | `tools/checks/site.mjs` |
| M2 | dry ground in the tiles; water, pads and roads cut into a 4 km metre patch; roads drawn by the ground shader | `terrain/`, `GroundSurface.js`, `tools/geodata/` | `tools/checks/terrain.mjs` |
| M3 | buildings by archetype, kit openings, roofs with valleys, colliders | `build/`, `tools/blender/kit.py` | `tools/checks/village.mjs` |
| M4 | bridges along their roads; St Roch's and St Andrew's, each with its yard, from the footage and the orthophoto | `build/Bridges.js`, `Landmarks.js`, `tools/blender/st_roch.py`, `st_andrew.py`, `grounds.py` | `village.mjs`, `site.mjs` |
| M5 | fences and gates along the plots' street lines; anglers' platforms | `site/Fences.js`, `site/Park.js` | `village.mjs` |
| M6 | plants from the habitat table and the occupancy map; a landmark's surveyed trees | `flora/` | `tools/checks/flora.mjs` |
| T1 | the survey of the orthophoto: footprints, roofs, roads | `tools/geodata/survey.py`, `survey.json` | `site.mjs` |
| T2 (begun) | ring 1 round St Andrew's: the street's parking and pavements, the yellow row, the hall, two long houses | `Survey.js`, `site/Beside.js` | `site.mjs` |
| T3 | the named places: the municipality and post office, the school, the parish house, the restaurant; the park, the sports ground; the marina and the landing with their boats | `Survey.js`, `build/Marina.js`, `tools/blender/kit.py` | `site.mjs`, `village.mjs`, `flora.mjs` |

Still to do, in this order:

1. **Ring 1 round St Andrew's**: the rest of its neighbours (walls, storeys, fences, yards), the
   crossing's markings, the trees of the street.
2. **St Roch's ring**: the houses round it, the shop (Boso), the streets' corner where the stone
   cross and the lime stand (the fence's line there is a guess: the tree and the church's shadow
   hide it on the orthophoto).
3. **The park's newer things**, which are in the footage of 2025 and not on the orthophoto: the
   outdoor gym on its red ground, the fire pit, the benches and lamps, the bank's paved edge at the
   marina. Their places have to be judged from the frames.
4. **The cadastre**, when the service answers (it failed on three tries on 2026-10-02): parcels for
   yards and fences, the registry's outlines, and with them storeys from shadows.
5. **Walls.** Nothing measures a wall's colour: the orthophoto sees roofs, the footage a few streets.
   Street-level pictures of the other streets are what every further ring needs.
6. **M7** colour by numbers; what floats on the water to show the current.

Known and left: one house at 754,-1083, near the block's edge, stands a metre onto a lane that was not surveyed
(`site.mjs` reports it).

How things are run:

- Checks: `node tools/checks/terrain.mjs`, `site.mjs`, `village.mjs`, `flora.mjs`.
- Headless render: `node test/world-slavonia.mjs <dir> --view=<name>` or `--look=name:x,y,z:tx,ty,tz[:fov]`.
- In the game: `npm run dev` (port 5189), `?region=slavonia`; on a phone `npm run dev:lan` (5192).
  Shots: `node tools/progress/collector.mjs <dir>`, then `?region=slavonia&bench&shots=<views>&tag=game`,
  then `python tools/progress/collect.py <dir> <stamp> "<label>"`.
- Published build: `npm run deploy` after every push (the `deploy` branch, served as it is).
- Blender through the `mcp__Blender__*` tools: `tools/blender/kit.py`, `st_roch.py`, `st_andrew.py`, `look.py`.
- Geodata: `terrain.py bosut`, `tiles.py bosut core 45.22730,18.74159,12`, `places.py bosut 45.22730,18.74159,4`,
  `survey.py bosut 45.22730,18.74159,4`, `sheet.py`, `cadastre.py` (the cache is on F:).
- A ring: `python tools/geodata/sheet.py bosut <x>,<z> <half side> <out.jpg>` for the sheet,
  `node tools/checks/ring.mjs <x> <z> <metres>` for its buildings, `node tools/checks/around.mjs
  "<name>"` for a landmark's neighbours in its model's frame.
- Reference footage: frames of the five drone videos in `F:/tidewater-data/ref/drone1..5`.
- Untracked: `docs/slavonia/rokovci/`, `docs/slavonia/andrijasevci/` (your reference photos).
