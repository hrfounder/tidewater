# Progress timelapse

Every build step is captured from the same fixed views (`src/regions/slavonia/views.js`) with
`tools/progress/shoot.sh "label"`, one folder per view. `python3 tools/progress/timelapse.py` plays a
view's series back as an animated GIF.

| Step (UTC) | Build | What changed | Views |
|---|---|---|---|
| 2026-10-01 2232 | `ca6c982+` | Baseline: real terrain, island shading, 10 m channels | [aerial](aerial/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) · [bankEdge](bankEdge/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) · [overview](overview/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) · [photoBridge](photoBridge/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) · [photoChurch](photoChurch/2026-10-01_2232_baseline-real-terrain-island-shading-10.jpg) |
