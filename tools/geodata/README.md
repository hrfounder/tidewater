# Geodata: the real world behind the Slavonian map

Scripts that download open map data for an area of the open world and turn it into planning images.
Later, they will also turn it into game tiles. Areas are defined in `areas.py` in WGS84 degrees. The
world uses the Croatian national grid, HTRS96/TM (EPSG:3765), so areas added later join up seamlessly.

```sh
pip install pyarrow s3fs rasterio numpy pillow pyproj shapely
python3 tools/geodata/fetch.py bosut              # ~1 GB into tools/geodata/cache/bosut/ (not committed)
python3 tools/geodata/overview.py bosut           # map: land cover, relief, water, roads, buildings, names
python3 tools/geodata/satellite.py bosut          # Sentinel-2 true colour mosaic
python3 tools/geodata/overview.py bosut out.png 2000 45.225,18.75,6    # 6 km close-up (lat, lon, km)
```

## Sources

All of these are open data on AWS S3, with anonymous access.

| Data | Source | Licence | Use |
|---|---|---|---|
| Water, roads, rails, buildings, land use, bridges, places | [Overture Maps](https://overturemaps.org), mostly from OpenStreetMap | ODbL (OSM-derived) / CDLA-Permissive 2.0 | Rivers, lakes, the road network, building footprints, fishing places |
| Elevation, 30 m | [Copernicus DEM GLO-30](https://registry.opendata.aws/copernicus-dem/) | © DLR e.V. 2010–2014 and © Airbus 2014–2018, provided under the Copernicus programme | Terrain |
| Land cover, 10 m | [ESA WorldCover 2021](https://esa-worldcover.org) | CC BY 4.0 | Forest, fields, built-up areas, wetland |
| Imagery, 10 m | Sentinel-2 L2A (`sentinel-cogs`), modified Copernicus Sentinel data 2025 | Free and open | Visual target for colours and field patterns |

The game must credit OpenStreetMap contributors (via Overture), Copernicus and ESA WorldCover when
derived data ships in it.

## What the Bosut area contains

The area runs 44 × 38 km from Vinkovci south to the Sava, and from Ivankovo east to Lipovac and Vukovar.

- Elevation is 60–141 m with a median around 85 m. It is flat: the relief is levees, old river
  terraces and the Vukovar loess plateau in the north-east.
- Land cover: 57% cropland, 33% forest (the Spačva basin), 3% built-up and 1.3% water.
- 107,860 buildings, of which about 2,700 are classified (house, apartments, church, school,
  industrial). Only 11 have a height and about 100 have floor counts, so building heights must be
  procedural.
- About 2,150 km of field tracks and 1,700 km of other roads, plus 105 km of the A3 motorway and
  450 km of railway. There are 245 bridges.
- Water features (1,251 in all):
  - Rivers: Bosut, Spačva, Studva, Biđ, Berava, Vuka, the Sava and the Danube.
  - Canals: Kanal Bosut, Biđ and Savak, plus hundreds of drainage ditches.
  - The Banja and Bajer lakes in Vinkovci, the Akumulacija Grabovo reservoir, and the Sava oxbows.
- Fishing places in the data:
  - Adrenalinski park Bosut (Rokovci–Andrijaševci)
  - Ribička kuća on the Rakovac
  - ŠRD Strušac (Retkovci)
  - Tackle shops in Vinkovci, Cerna and Županja
  - The hunters' lodges in Cerna and Kunjevci

## Known data problems

- **The elevation model is a surface model.** Forests stand 15–25 m above the fields as plateaus,
  and towns are bumpy too. Use the land cover to cut the canopy out and fill it from the surrounding
  ground before the terrain is used.
- **30 m is too coarse for river banks and levees.** The channel cross-sections must be rebuilt
  from the water polygons and centrelines, since the elevation model doesn't capture them.
- **The area crosses borders.** It includes Orašje (Bosnia and Herzegovina) south of the Sava and
  the Šid area (Serbia) in the south-east. Decide whether they are playable or only scenery.
