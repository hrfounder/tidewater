# Progress timelapse

Every build step is captured from the same fixed views (`src/regions/slavonia/views.js`), **in the real
game on a GPU**, one folder per view. Never move a view: the whole point is that each step is shot
from exactly the same places. Add new views instead; they start their own series.

Three steps, from the repo root:

```bash
node tools/progress/collector.mjs <shotDir> 5190
```

then load the game with the bench driving the views (any browser with WebGPU):

```
http://127.0.0.1:5189/?region=slavonia&bench&shots=overview,aerial,photoBridge,photoChurch,bankEdge&tag=game
```

and file the shots, which also appends the row below:

```bash
python tools/progress/collect.py <shotDir> "$(date -u +%Y-%m-%d_%H%M)" "label of the step"
```

`python tools/progress/timelapse.py` plays a view's series back as an animated GIF (not committed:
regenerate any time).

Until 2026-10-02 the shots came from the headless render test instead, which had no water surface,
no sky and no post-processing; the series changes look at that point.

| Step (UTC) | Build | What changed | Views |
|---|---|---|---|
| 2026-10-01 2232 | `ca6c982+` | Baseline: real terrain, island shading, 10 m channels | [aerial](aerial/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) Â· [bankEdge](bankEdge/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) Â· [overview](overview/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) Â· [photoBridge](photoBridge/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) Â· [photoChurch](photoChurch/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) |
| 2026-10-01 2253 | `db35e57+` | Full-res channels, Slavonian ground, platforms, river levels (photoBridge and photoChurch calibrated to the real banks from this step on) | [aerial](aerial/2026-10-01_2253_full-res-channels-slavonian-ground-platf.jpg) Â· [bankEdge](bankEdge/2026-10-01_2253_full-res-channels-slavonian-ground-platf.jpg) Â· [overview](overview/2026-10-01_2253_full-res-channels-slavonian-ground-platf.jpg) Â· [photoBridge](photoBridge/2026-10-01_2253_full-res-channels-slavonian-ground-platf.jpg) Â· [photoChurch](photoChurch/2026-10-01_2253_full-res-channels-slavonian-ground-platf.jpg) |
| 2026-10-01 2327 | `903035b+` | First capture from the real game on a GPU: water, sky, post | [aerial](aerial/2026-10-01_2327_first-capture-from-the-real-game-on-a-gp.jpg) · [bankEdge](bankEdge/2026-10-01_2327_first-capture-from-the-real-game-on-a-gp.jpg) · [overview](overview/2026-10-01_2327_first-capture-from-the-real-game-on-a-gp.jpg) · [photoBridge](photoBridge/2026-10-01_2327_first-capture-from-the-real-game-on-a-gp.jpg) · [photoChurch](photoChurch/2026-10-01_2327_first-capture-from-the-real-game-on-a-gp.jpg) |
| 2026-10-01 2339 | `16eeee0+` | Inland water: the plain runs to the horizon, only the channels wet | [aerial](aerial/2026-10-01_2339_inland-water-the-plain-runs-to-the-horiz.jpg) · [bankEdge](bankEdge/2026-10-01_2339_inland-water-the-plain-runs-to-the-horiz.jpg) · [overview](overview/2026-10-01_2339_inland-water-the-plain-runs-to-the-horiz.jpg) · [photoBridge](photoBridge/2026-10-01_2339_inland-water-the-plain-runs-to-the-horiz.jpg) · [photoChurch](photoChurch/2026-10-01_2339_inland-water-the-plain-runs-to-the-horiz.jpg) |
| 2026-10-01 2357 | `b426f92+` | Flora: willows, poplars, oak wood, reed beds, bank meadow | [aerial](aerial/2026-10-01_2357_flora-willows-poplars-oak-wood-reed-beds.jpg) · [bankEdge](bankEdge/2026-10-01_2357_flora-willows-poplars-oak-wood-reed-beds.jpg) · [overview](overview/2026-10-01_2357_flora-willows-poplars-oak-wood-reed-beds.jpg) · [photoBridge](photoBridge/2026-10-01_2357_flora-willows-poplars-oak-wood-reed-beds.jpg) · [photoChurch](photoChurch/2026-10-01_2357_flora-willows-poplars-oak-wood-reed-beds.jpg) |
| 2026-10-02 0007 | `2b39894+` | Roads and the villages on their real footprints | [aerial](aerial/2026-10-02_0007_roads-and-the-villages-on-their-real-foo.jpg) · [bankEdge](bankEdge/2026-10-02_0007_roads-and-the-villages-on-their-real-foo.jpg) · [overview](overview/2026-10-02_0007_roads-and-the-villages-on-their-real-foo.jpg) · [photoBridge](photoBridge/2026-10-02_0007_roads-and-the-villages-on-their-real-foo.jpg) · [photoChurch](photoChurch/2026-10-02_0007_roads-and-the-villages-on-their-real-foo.jpg) · [village](village/2026-10-02_0007_roads-and-the-villages-on-their-real-foo.jpg) |
| 2026-10-02 0010 | `a051833+` | Most Bosut and the road bridges | [aerial](aerial/2026-10-02_0010_most-bosut-and-the-road-bridges.jpg) · [bankEdge](bankEdge/2026-10-02_0010_most-bosut-and-the-road-bridges.jpg) · [overview](overview/2026-10-02_0010_most-bosut-and-the-road-bridges.jpg) · [photoBridge](photoBridge/2026-10-02_0010_most-bosut-and-the-road-bridges.jpg) · [photoChurch](photoChurch/2026-10-02_0010_most-bosut-and-the-road-bridges.jpg) · [village](village/2026-10-02_0010_most-bosut-and-the-road-bridges.jpg) |
| 2026-10-02 0021 | `9018cf4` | Churches, and the rivers carry on past the patch | [aerial](aerial/2026-10-02_0021_churches-and-the-rivers-carry-on-past-th.jpg) · [bankEdge](bankEdge/2026-10-02_0021_churches-and-the-rivers-carry-on-past-th.jpg) · [overview](overview/2026-10-02_0021_churches-and-the-rivers-carry-on-past-th.jpg) · [photoBridge](photoBridge/2026-10-02_0021_churches-and-the-rivers-carry-on-past-th.jpg) · [photoChurch](photoChurch/2026-10-02_0021_churches-and-the-rivers-carry-on-past-th.jpg) · [village](village/2026-10-02_0021_churches-and-the-rivers-carry-on-past-th.jpg) |
| 2026-10-02 0030 | `86cb6b2` | Yards and fences; nothing grows through a wall | [aerial](aerial/2026-10-02_0030_yards-and-fences-nothing-grows-through-a.jpg) · [bankEdge](bankEdge/2026-10-02_0030_yards-and-fences-nothing-grows-through-a.jpg) · [overview](overview/2026-10-02_0030_yards-and-fences-nothing-grows-through-a.jpg) · [photoBridge](photoBridge/2026-10-02_0030_yards-and-fences-nothing-grows-through-a.jpg) · [photoChurch](photoChurch/2026-10-02_0030_yards-and-fences-nothing-grows-through-a.jpg) · [village](village/2026-10-02_0030_yards-and-fences-nothing-grows-through-a.jpg) |
| 2026-10-02 0036 | `a65f640` | Far crowns as impostors | [aerial](aerial/2026-10-02_0036_far-crowns-as-impostors.jpg) · [bankEdge](bankEdge/2026-10-02_0036_far-crowns-as-impostors.jpg) · [overview](overview/2026-10-02_0036_far-crowns-as-impostors.jpg) · [photoBridge](photoBridge/2026-10-02_0036_far-crowns-as-impostors.jpg) · [photoChurch](photoChurch/2026-10-02_0036_far-crowns-as-impostors.jpg) · [village](village/2026-10-02_0036_far-crowns-as-impostors.jpg) |
| 2026-10-02 0215 | `c66411a` | Temperate leaves; fishing reads the river | [aerial](aerial/2026-10-02_0215_temperate-leaves-fishing-reads-the-river.jpg) · [bankEdge](bankEdge/2026-10-02_0215_temperate-leaves-fishing-reads-the-river.jpg) · [overview](overview/2026-10-02_0215_temperate-leaves-fishing-reads-the-river.jpg) · [photoBridge](photoBridge/2026-10-02_0215_temperate-leaves-fishing-reads-the-river.jpg) · [photoChurch](photoChurch/2026-10-02_0215_temperate-leaves-fishing-reads-the-river.jpg) · [village](village/2026-10-02_0215_temperate-leaves-fishing-reads-the-river.jpg) |
| 2026-10-02 0422 | `c9bf3fc` | The water carries a current | [aerial](aerial/2026-10-02_0422_the-water-carries-a-current.jpg) · [bankEdge](bankEdge/2026-10-02_0422_the-water-carries-a-current.jpg) · [overview](overview/2026-10-02_0422_the-water-carries-a-current.jpg) · [photoBridge](photoBridge/2026-10-02_0422_the-water-carries-a-current.jpg) · [photoChurch](photoChurch/2026-10-02_0422_the-water-carries-a-current.jpg) · [village](village/2026-10-02_0422_the-water-carries-a-current.jpg) |
