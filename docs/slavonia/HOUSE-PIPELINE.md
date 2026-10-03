# Building the twin, area by area

How a stretch of the village goes from friends' photos to the game. Written from the first area
(Kolodvorska ulica 642 and its neighbours, 2026-10-03); every rule here cost time once. Keep it
current: a lesson learned on a house goes in here, not only in the chat.

## Principles

- **Ring out by area.** One area at a time (a street stretch, a junction), outward from the last.
  Never all over the village.
- **Passes, speed first.** Pass 1 is rough: size, colours, position, pavements. Then a **critic**
  looks at pictures only (the game against the photos, never the code). Then the detail pass, then a
  final visual critic. Big deviations are fixed in a later pass, not by measuring harder now.
- **Plan from above, faces from photos.** A house's width, depth and place come from the state
  orthophoto's roof (and the street front's width in one photo); the photos give storeys, openings,
  materials, colours, as *proportions* of that width. No camera-height solving, no vanishing points,
  no brick counting.
- **Most photos are reference.** Measure on one or two per building (a square-on front, a corner);
  look at the rest.
- **The map's footprints are often wrong** (642 was). Trust the orthophoto and the photos; a model's
  plan replaces the outline.

## Tools

| Step | Command | Gives |
|---|---|---|
| Photos in | `python tools/geodata/terraframe.py fetch <survey> <since-UTC> [dir]` | photos, metadata, `contact.jpg`, `map.jpg` (each photo on the orthophoto) |
| Plan dump | `node tools/geodata/plan.mjs` | the game's roads, footprints, pieces (`cache/bosut/plan.json`); rerun after Survey.js changes |
| Street sheets | `python tools/geodata/unroll.py "<street>" s0,s1` | the street straightened on the orthophoto, metre scale, footprints red, surveyed strips white |
| Pavements | `python tools/geodata/unroll.py "<street>" at s0,s1,L,in,out[,asphalt] ... push` | Survey.js BESIDE entries (colour measured) and MOVED records for footprints over them |
| House | `tools/blender/houses/<name>.py` on `tools/blender/house.py`, run in Blender (MCP) | `public/models/slavonia/houses/<name>.glb` |
| Declare | `src/regions/slavonia/Landmarks.js`: `{ at, faces, model, surfaces: HOUSE }` | the house stands on its footprint |
| Checks | `node tools/checks/site.mjs` (also village, terrain, flora), `npm test` | must all pass before a commit |
| Critic, above | `python tools/geodata/topdown.py <name> x,z [half]` | orthophoto beside the game from straight above |
| Critic, street | `python tools/geodata/fromphoto.py <name> <fetched dir> N [N ...]` | each photo beside the game rendered from its GPS spot and heading |

## Pass 1 for an area, in order

1. **Fetch** the photos; open `contact.jpg` and `map.jpg`. Note which photo shows which building
   (square-on front, corners, back).
2. **Pavements** first, they do not depend on the houses: `unroll.py` the street over the area, read
   each side's verge and pavement (offsets from the centre line, the yellow lines are the
   carriageway's edges), write them with `at ... push`, insert the BESIDE and MOVED lines into
   Survey.js (the house style writes `- 5` for minus numbers), stop strips at side streets.
3. **Each house**: its plan from the orthophoto roof (walls = roof less ~0.5 m overhang each side)
   or from a square-on front photo's width; its place from the photo's GPS (outdoors good to under a
   metre) in the footprint's frame (`toWorld` of the footprint, the model's origin is the middle of
   the footprint's rectangle, x along the front, -y toward the street). Storeys, openings, colours
   by proportion on one front photo. Copy `kolodvorska642.py` as the pattern.
4. **Checks**, then **critic**: `topdown.py` over the area and a street view from one photo's spot,
   compared with that photo. List what is off; fix only what is big.
5. **Commit**, push, deploy (`npm run deploy`).

## What the photo metadata is worth

- **GPS** outdoors: well under a metre (Ivan checked his feet on the orthophoto). Indoors: ~10 m off.
- **Compass heading**: ~10° (642: 8°). Fine to find which building a photo shows; correct it by the
  building's facade when it matters.
- **Pitch and roll**: accurate (accelerometer).
- **Field of view**: the lens's estimate from focal length and sensor; checked on 642 (the house's
  converging corners agree within 1%).
- **Camera height**: unknown (the phone at the face, the ground under the house lower than the
  verge): do not use it for scale. The scale comes from the plan.
- **Colours**: skip overexposed and hazy photos (shot 1 read the brown roof as grey); prefer a sunlit,
  well-exposed square-on face, and bring sunlit samples down about a quarter.

## Lessons from 642
- **Yard walls and gates** on the street line: house.py `walls` (gates are leaves in the wall's line).
  Keep a house's grounds (its `yard`) off the neighbours' footprints: the site check fails otherwise.
- The village builds a **hipped roof only over a one-rectangle footprint**; an L-shaped building
  (a corner shop) needs its own model to get its real roof.
- SEEN `is` takes an archetype name (`shed`, `house`, `longhouse`, ...), not the village's kind
  (`outbuilding`): the wrong one leaves the building unbuilt (village check).
- A SEEN or MOVED `at` must lie inside the footprint *as the survey moved it*: places.json + the
  survey's shifts (plan.mjs needs the world to load, so it cannot help while a record is wrong).

- The front was **not flat**: the garage bay stands one brick back (house.py `recesses`). Look for
  the shadow line round a bay.
- **Side walls** often have only small bathroom windows: do not assume a side's windows from the
  front's. The owner's word (or a corner photo) settles it.
- An **"anfor"** (drive-through) behind a garage door is open to the yard, not a room.
- Footprints that reach over a pavement are the map's error: `push` sets them back (the game tests
  the rectangles it builds a footprint from, `plan.mjs` exports them).
