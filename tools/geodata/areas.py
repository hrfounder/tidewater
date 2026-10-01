# Map areas of the open world, in WGS84 degrees: ( west, south, east, north ).
# The world is laid out in real coordinates, so areas added later join up with these.
AREAS = {
    # Vinkovci, Andrijaševci, the Bosut, the Spačva forest and the Sava at Županja (first playable area)
    'bosut': ( 18.55, 45.03, 19.10, 45.36 ),
}

# Sentinel-2 L2A true-colour scenes (ESA Copernicus, sentinel-cogs on AWS) covering each area: one
# clear-sky date, all of its MGRS tiles. Picked by cloud cover and full coverage (no nodata).
IMAGERY = {
    'bosut': [ 'S2C_34TCR_20250702_0_L2A', 'S2C_34TCQ_20250702_0_L2A' ],
}
