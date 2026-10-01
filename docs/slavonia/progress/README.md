# Progress timelapse

Every build step is captured from the same fixed views (`src/regions/slavonia/views.js`) with
`tools/progress/shoot.sh "label"`, one folder per view. `python3 tools/progress/timelapse.py` plays a
view's series back as an animated GIF.

| Step (UTC) | Build | What changed | Views |
|---|---|---|---|
| 2026-10-01 2232 | `ca6c982+` | Baseline: real terrain, island shading, 10 m channels | [aerial](aerial/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) · [bankEdge](bankEdge/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) · [overview](overview/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) · [photoBridge](photoBridge/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) · [photoChurch](photoChurch/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) |
| 2026-10-01 2253 | `db35e57+` | Full-res channels, Slavonian ground, platforms, river levels (photoBridge and photoChurch calibrated to the real banks from this step on) | [aerial](aerial/2026-10-01_2253_full-res-channels-slavonian-ground-platf.jpg) · [bankEdge](bankEdge/2026-10-01_2253_full-res-channels-slavonian-ground-platf.jpg) · [overview](overview/2026-10-01_2253_full-res-channels-slavonian-ground-platf.jpg) · [photoBridge](photoBridge/2026-10-01_2253_full-res-channels-slavonian-ground-platf.jpg) · [photoChurch](photoChurch/2026-10-01_2253_full-res-channels-slavonian-ground-platf.jpg) |
