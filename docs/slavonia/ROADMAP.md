# Slavonia: a freshwater fishing sim on the Drava, Sava and Dunav

The goal is to turn Tidewater into a realistic fishing sim set in the lowlands of Slavonia and Baranja
in eastern Croatia: the rivers Drava, Sava and Dunav (Danube), their side arms, oxbows and floodplain lakes
(Kopački rit), the willow and poplar forest along the banks, and the villages behind the dykes.

This file is the plan and the record of decisions. Update it as milestones land.

## Principles

- **Regions, not a rewrite.** Anything specific to a place lives in `src/regions/<id>/`. The engine, sky,
  post-processing, fishing mechanics, UI and save system stay shared. `?region=slavonia` selects the new
  region. The Caribbean island stays the default and keeps working until Slavonia is playable, so `main`
  is never broken halfway through the port.
- **Move systems behind the region one at a time.** When a system becomes region-specific, its
  Caribbean data moves into `regions/caribbean/` unchanged. The shared code keeps its API, and its
  tests keep passing.
- **Reuse the simulations.** The FFT wave model works for lakes and wide rivers with a short fetch and
  light wind. The shallow-water shore sim and boat wake carry over. Only the ocean-only parts are
  dropped for this region: swell, plunging breakers and surf.
- **One water level.** The engine has a single global water plane (`G.seaLevel`). Slavonia is flat:
  the Drava falls about 0.2 m per km, so the level changes by less than half a metre across the 2 km map.
  Rivers, oxbows and lakes share the plane. The river's current is a flow field over the plane, not a
  slope.
- **Real data, marked when unverified.** Species, sizes and length-weight relations come from published
  values (FishBase-style). Numbers that still need checking say so in a comment, for example prices and
  any fishing regulations.

## Milestones

### M0: Foundation (done)
- [x] Region system: `src/regions/index.js` and `?region=`, with a separate save per region.
- [x] Caribbean fish table and habitat model moved into `regions/caribbean/fish.js`, unchanged.
- [x] Slavonian species table with 20 species and Croatian names: carp, wels, pike, zander, asp,
  barbel, sterlet, bream, tench, chub, ide, perch, roach, bleak, burbot, Prussian carp, grass and
  silver carp, brown bullhead and pumpkinseed.
- [x] River and lake habitats: shallows, weeds, current, slack, still, snags and deep. Spots are
  described by depth, flow, river, weeds and cover.
- [x] Tests: `test/region-slavonia.mjs`.

### M1: Make the world region-driven, with no visual change to the Caribbean region
- [ ] `region.layout` replaces `WORLD` (world/WorldLayout.js). Hardcoded positions move into it: the
  village houses, STAND, CHANDLERY, the ShoreSim centre, the Breakers stations and the minimap origin.
- [ ] `region.water`: absorption and scattering (`G.waterAbsorption`/`waterScattering`), wind, the
  OceanFFT systems (fetch, swell share, cascade sizes, depth), ShoreWaves amplitude and period, and
  SeaDetail. Ocean-only systems are toggled by the region: breakers, swell, the whale and marine snow.
- [ ] Decouple `FishSchools` from `Reef`, which owns every swimming fish today. Then the reef can be
  optional.
- [ ] Guard the systems App.js builds unconditionally (Reef, Breakers, Wildlife updates) so a region
  can leave them out.
- [ ] The game asks the region for the habitat at a point (`Game.habitatAtPoint`). The Caribbean
  version keeps using the reef and pier distances.
- [ ] Pull location strings (vendor names, loading texts, guide) into the region.

### M2: Floodplain terrain
- [ ] Split `TerrainData` into the shared grid, queries and masks plus a region "shape" strategy.
  The island shape covers `_coast`, `_base`, the ridges, beach, cliffs, stacks and reef platform.
- [ ] A Slavonian shape: a meandering main channel 150–300 m wide and 6–12 m deep, with a cut bank
  and a point bar; an oxbow lake; a side arm; flood levees; the dyke; and flat fields behind it. Edges
  fade to land, not to -90 m.
- [ ] Stone groynes (*naperi*) on the river: the classic Danube fishing spots.
- [ ] Flow field: a texture of current speed and direction, from the channel's centreline and width
  with eddies behind the groynes and bends. It feeds the habitat (`flow`), the drift of the float
  and line, floating debris, the boat, and the water shader's advected foam lines.
- [ ] Consider real geography: Copernicus DEM / EU-DEM and OSM river lines for a specific reach,
  for example the Drava–Dunav confluence at Aljmaš or Kopački rit. They need procedural detail at 1 m.

### M3: Freshwater fish models
- [ ] Anatomy in `world/fish/FishSpecies.js` and skin patterns in `FishMaterial.js` for the 20
  species. Several share body plans: the cyprinids (roach, ide, chub, bleak, asp), carps (carp,
  Prussian carp, grass carp, silver carp), percids (perch, zander), pike, catfish (wels, bullhead,
  burbot) and the sturgeon.
- [ ] New geometry: barbels (carp, barbel, wels, sterlet, burbot), the sterlet's scutes and
  heterocercal tail, and the wels's long anal fin.
- [ ] Swimming fish in the river: schools of bleak in the current, carp grubbing in the shallows,
  and asp striking at the surface.

### M4: Water look
- [ ] Turbid, green-brown water (visibility 0.5–1.5 m in the rivers, clearer in the oxbows):
  absorption and scattering, caustics strength, and the underwater fog.
- [ ] Lake waves: short fetch and light wind, with the existing FFT and the shore sim on the banks.
- [ ] Floating leaves, foam lines and driftwood that follow the flow; mist over the oxbows at dawn.

### M5: Landscape and life
- [ ] Vegetation: white willow, black and white poplar, pedunculate oak (Slavonian oak), reeds,
  cattails, water lilies and duckweed, plus maize and sunflower fields behind the dyke.
- [ ] Birds: grey heron, great egret, cormorant, white-tailed eagle, white stork and kingfisher.
  Frogs and mosquitoes at dusk.
- [ ] The village: Slavonian gable-end houses facing the street, a *čarda* (the riverside fish
  restaurant, which buys the catch), a fishermen's hut on stilts, and a wooden *čamac* (flat-bottomed
  boat) in place of the motor boat.
- [ ] Soundscape: the river, the wind in the reeds and poplars, frogs, cuckoos, church bells.

### M6: Fishing realism
- [ ] Techniques: float, feeder/ledger, carp rigs, spinning, and the catfish clonk (*bućkalica*)
  from the boat. Baits change what bites.
- [ ] Seasons and water temperature: spring floods, summer low water, autumn fog.
- [ ] Regulations: closed seasons (*lovostaj*), minimum sizes (*lovna mjera*) and licences per
  water. These must be checked against the current Croatian freshwater fishing rules before they go in.
- [ ] Economy in euros. Gear names for river fishing.

### M7: Switch the default
- [ ] When Slavonia plays better than the island, make it the default region. Then decide whether
  to keep the Caribbean region.

## Where the island is baked in

The coupling map, made while planning M1/M2:

- `WORLD` (world/WorldLayout.js) is read by about 20 modules: terrain, reef, pier, fish, rocks, debris,
  vegetation scatter, birds, crabs, game, minimap, audio, player and boat. Terrain.js bakes
  `swellDir` and the reef into its WGSL as literals.
- `TerrainData` builds the island from hardcoded ellipses (`_coast`), the bay box (`beachZoneAt`),
  `IslandShape.RIDGES`/`SEA_STACKS`/`PATHS`, and z-ranges in `_detail`/`_features`/`_seabed`. The
  borders fade to -90 m.
- The water globals are in `engine/render/Frame.js`: `seaLevel`, `waterAbsorption`,
  `waterScattering`, `windSpeed` and `windDir`. OceanFFT systems use the `local` and `swell` defaults
  (App.js passes no options). AppUI's clarity slider scales around the tropical defaults.
- `Reef` owns `FishSchools`, so every swimming fish. App.js updates Reef, Breakers and Wildlife
  unconditionally.
- Fish skins are one WGSL branch per `PATTERN` id in FishMaterial.js.

## Development

- `npm test`: the game logic, the Slavonian region data, and an engine smoke test (needs a WebGPU
  adapter; in a headless Linux container, install `mesa-vulkan-drivers` for lavapipe).
- `npm run dev`, then open `/?region=slavonia`. Until M2 this shows the island with the Slavonian
  fish table.
