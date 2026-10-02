"""Export the roads and buildings of a core block for the game.

    python3 tools/geodata/places.py bosut 45.22730,18.74159,4

Reads the Overture layers fetched into cache/<area>/ (OpenStreetMap-derived, ODbL) and writes
public/world/<area>/places.json: the road centrelines and the building footprints of the block,
in the same projected grid as the tiles (EPSG:3765), as metres east / north.

places.json:
  center   [ east, north ] of the block, the same point index.json uses
  roads    [ { class, name, lanes, bridge, pts: [ [ e, n ], ... ] } ]
  buildings[ { class, name, height, levels, ring: [ [ e, n ], ... ] } ]  (outer ring, closed)

The game places them relative to its patch centre, so nothing here depends on the patch size.
"""
import os, sys, json, math
import pyarrow.parquet as pq
from pyproj import Transformer
from shapely import wkb
from shapely.geometry import shape
from areas import AREAS

HERE = os.path.dirname( os.path.abspath( __file__ ) )
ROOT = os.path.abspath( os.path.join( HERE, '..', '..' ) )

# The roads that matter on the ground here. Overture's classes; the width is the carriageway in
# metres, as built in this part of Slavonia: a two-lane country road is about 6 m, a village street
# 5 m, a field track a pair of ruts.
ROADS = {
    'motorway': 11.0, 'trunk': 9.0, 'primary': 7.5, 'secondary': 7.0, 'tertiary': 6.0,
    'residential': 5.0, 'living_street': 4.5, 'unclassified': 4.5, 'service': 3.6,
    'track': 3.0, 'footway': 1.4, 'path': 1.2, 'cycleway': 2.0, 'steps': 1.2,
}


def main():

    area = sys.argv[ 1 ] if len( sys.argv ) > 1 else 'bosut'
    lat, lon, km = ( float( v ) for v in sys.argv[ 2 ].split( ',' ) ) if len( sys.argv ) > 2 else ( 45.22730, 18.74159, 4 )
    cache = os.path.join( HERE, 'cache', area )
    out_dir = os.path.join( ROOT, 'public', 'world', area )

    to_grid = Transformer.from_crs( 'EPSG:4326', 'EPSG:3765', always_xy=True )
    cx, cy = to_grid.transform( lon, lat )
    # the block is aligned to the tile grid the same way tiles.py aligns it
    half = km * 1000 / 2
    cx, cy = round( cx ), round( cy )
    west, east, south, north = cx - half, cx + half, cy - half, cy + half

    roads = read_roads( cache, to_grid, ( west, south, east, north ) )
    buildings = read_buildings( cache, to_grid, ( west, south, east, north ) )

    os.makedirs( out_dir, exist_ok=True )
    path = os.path.join( out_dir, 'places.json' )
    with open( path, 'w', encoding='utf-8' ) as f:
        json.dump( { 'center': [ cx, cy ], 'roads': roads, 'buildings': buildings }, f, separators=( ',', ':' ) )
    print( f'{len( roads )} roads, {len( buildings )} buildings -> {os.path.relpath( path, ROOT )}'
           f' ({os.path.getsize( path ) >> 10} kB)' )


def rows( path, columns ):

    t = pq.read_table( path, columns=columns )
    return t.to_pylist()


def clip( pts, box ):

    """Keep the parts of a line inside the block, as separate lines."""
    west, south, east, north = box
    inside = lambda p: west <= p[ 0 ] <= east and south <= p[ 1 ] <= north
    out, cur = [], []
    for i, p in enumerate( pts ):
        if inside( p ):
            cur.append( p )
        else:
            # keep one point past the edge so the line leaves the block instead of stopping short
            if cur:
                cur.append( p )
                out.append( cur )
                cur = []
            elif i + 1 < len( pts ) and inside( pts[ i + 1 ] ):
                cur.append( p )
    if cur: out.append( cur )
    return [ l for l in out if len( l ) > 1 ]


def read_roads( cache, to_grid, box ):

    path = os.path.join( cache, 'overture_segment.parquet' )
    if not os.path.exists( path ): sys.exit( f'missing {path} (run fetch.py <area> overture)' )
    out = []
    for r in rows( path, [ 'geometry', 'subtype', 'class', 'names', 'road_surface', 'road_flags' ] ):
        if r[ 'subtype' ] != 'road': continue
        cls = r[ 'class' ]
        if cls not in ROADS: continue
        g = wkb.loads( bytes( r[ 'geometry' ] ) )
        if g.geom_type != 'LineString': continue
        pts = [ list( to_grid.transform( x, y ) ) for x, y in g.coords ]
        name = ( r.get( 'names' ) or {} ).get( 'primary' )
        flags = r.get( 'road_flags' ) or []
        bridge = any( 'bridge' in str( f ) for f in flags )
        for part in clip( pts, box ):
            out.append( {
                'class': cls, 'name': name, 'width': ROADS[ cls ], 'bridge': bridge,
                'pts': [ [ round( x, 1 ), round( y, 1 ) ] for x, y in part ],
            } )
    return out


def read_buildings( cache, to_grid, box ):

    path = os.path.join( cache, 'overture_building.parquet' )
    if not os.path.exists( path ): sys.exit( f'missing {path} (run fetch.py <area> overture)' )
    west, south, east, north = box
    out = []
    for r in rows( path, [ 'geometry', 'subtype', 'class', 'names', 'height', 'num_floors', 'roof_shape' ] ):
        g = wkb.loads( bytes( r[ 'geometry' ] ) )
        if g.geom_type == 'MultiPolygon': g = max( g.geoms, key=lambda p: p.area )
        if g.geom_type != 'Polygon': continue
        ring = [ list( to_grid.transform( x, y ) ) for x, y in g.exterior.coords ]
        xs = [ p[ 0 ] for p in ring ]; ys = [ p[ 1 ] for p in ring ]
        # the whole footprint has to be in the block: half a house is worse than none
        if min( xs ) < west or max( xs ) > east or min( ys ) < south or max( ys ) > north: continue
        out.append( {
            'class': r.get( 'class' ) or r.get( 'subtype' ), 'name': ( r.get( 'names' ) or {} ).get( 'primary' ),
            'height': r.get( 'height' ), 'levels': r.get( 'num_floors' ), 'roof': r.get( 'roof_shape' ),
            'ring': [ [ round( x, 1 ), round( y, 1 ) ] for x, y in ring ],
        } )
    return out


if __name__ == '__main__':
    main()
