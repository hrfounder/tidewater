"""Export the roads and buildings of a core block for the game.

    python3 tools/geodata/places.py bosut 45.22730,18.74159,4

Reads the Overture layers fetched into cache/<area>/ (OpenStreetMap-derived, ODbL) and writes
public/world/<area>/places.json, in the same projected grid as the tiles (EPSG:3765), as metres
east / north:

  center    [ east, north ] of the block, the same point index.json uses
  nodes     [ [ east, north ], ... ] where roads meet, end, or change (a bridge begins)
  roads     [ { class, name, surface, bridge, a, b, pts: [ [ e, n ], ... ] } ]: one stretch of road
            between two nodes (a, b: indices into nodes). The map's segments are cut at every
            junction along them and at the ends of every bridge, so a road here is either all
            bridge or none. A stretch that leaves the block ends at a node of its own just outside.
            class is the map's (secondary, residential, track ...), surface 'paved' / 'unpaved' /
            null where the map does not say; the game decides what each class is on the ground.
  buildings [ { class, name, height, levels, roof, ring: [ [ e, n ], ... ] } ]  (outer ring, closed)

The game places them relative to its patch centre, so nothing here depends on the patch size.
"""
import os, sys, json
import pyarrow.parquet as pq
from pyproj import Transformer
from shapely import wkb
from shapely.geometry import LineString
from shapely.ops import substring

HERE = os.path.dirname( os.path.abspath( __file__ ) )
ROOT = os.path.abspath( os.path.join( HERE, '..', '..' ) )

# surfaces the map names, as the two the ground can show
PAVED = { 'paved', 'asphalt', 'concrete', 'paving_stones', 'sett', 'cobblestone', 'metal', 'wood' }
# fractions of a segment closer than this are the same cut
EPS = 1e-6


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
    box = ( cx - half, cy - half, cx + half, cy + half )

    nodes, roads = read_roads( cache, to_grid, box )
    buildings = read_buildings( cache, to_grid, box )

    os.makedirs( out_dir, exist_ok=True )
    path = os.path.join( out_dir, 'places.json' )
    with open( path, 'w', encoding='utf-8' ) as f:
        json.dump( { 'center': [ cx, cy ], 'nodes': nodes, 'roads': roads, 'buildings': buildings }, f, separators=( ',', ':' ), ensure_ascii=False )
    print( f'{len( roads )} roads between {len( nodes )} nodes ({sum( r[ "bridge" ] for r in roads )} bridges), {len( buildings )} buildings -> {os.path.relpath( path, ROOT )}'
           f' ({os.path.getsize( path ) >> 10} kB)' )


def rows( path, columns ):

    return pq.read_table( path, columns=columns ).to_pylist()


def covering( rules, t, key ):

    """The value of the first linear-referenced rule that covers fraction t of the segment."""
    for r in rules or []:
        lo, hi = r.get( 'between' ) or ( 0.0, 1.0 )
        if lo - EPS <= t <= hi + EPS: return r[ key ]
    return None


def inside_runs( pts, box ):

    """The runs of a line inside the block, each with one point past the edge where it leaves, and
    whether its first / last point is the line's own end."""
    west, south, east, north = box
    inside = [ west <= x <= east and south <= y <= north for x, y in pts ]
    out, i = [], 0
    while i < len( pts ):
        if not inside[ i ]: i += 1; continue
        j = i
        while j + 1 < len( pts ) and inside[ j + 1 ]: j += 1
        a, b = max( 0, i - 1 ), min( len( pts ) - 1, j + 1 )
        if b > a: out.append( ( pts[ a:b + 1 ], a == 0 and inside[ 0 ], b == len( pts ) - 1 and inside[ - 1 ] ) )
        i = j + 1
    return out


def read_roads( cache, to_grid, box ):

    path = os.path.join( cache, 'overture_segment.parquet' )
    if not os.path.exists( path ): sys.exit( f'missing {path} (run fetch.py <area> overture)' )
    nodes, index, roads = [], {}, []

    def node( key, p ):

        if key not in index:
            index[ key ] = len( nodes )
            nodes.append( [ round( p[ 0 ], 1 ), round( p[ 1 ], 1 ) ] )
        return index[ key ]

    for r in rows( path, [ 'id', 'geometry', 'subtype', 'class', 'names', 'connectors', 'road_surface', 'road_flags' ] ):
        if r[ 'subtype' ] != 'road': continue
        g = wkb.loads( bytes( r[ 'geometry' ] ) )
        if g.geom_type != 'LineString': continue
        line = LineString( [ to_grid.transform( x, y ) for x, y in g.coords ] )
        x0, y0, x1, y1 = line.bounds
        if x1 < box[ 0 ] or x0 > box[ 2 ] or y1 < box[ 1 ] or y0 > box[ 3 ]: continue
        # where the segment is cut: its junctions, and the ends of its bridges
        cuts = { 0.0: ( r[ 'id' ], 0.0 ), 1.0: ( r[ 'id' ], 1.0 ) }
        bridges = [ f.get( 'between' ) or [ 0.0, 1.0 ] for f in r.get( 'road_flags' ) or [] if 'is_bridge' in ( f.get( 'values' ) or [] ) ]
        for lo, hi in bridges:
            for t in ( lo, hi ): cuts.setdefault( min( 1.0, max( 0.0, t ) ), ( r[ 'id' ], t ) )
        # a junction names its node by the map's connector, so every road through it shares it
        for c in r.get( 'connectors' ) or []:
            t = min( 1.0, max( 0.0, c[ 'at' ] ) )
            near = next( ( k for k in cuts if abs( k - t ) < EPS ), t )
            cuts[ near ] = c[ 'connector_id' ]
        ts = sorted( cuts )
        name = ( r.get( 'names' ) or {} ).get( 'primary' )
        for ta, tb in zip( ts, ts[ 1: ] ):
            piece = substring( line, ta, tb, normalized=True )
            if piece.geom_type != 'LineString' or piece.length < 0.05: continue
            mid = ( ta + tb ) / 2
            surface = covering( r.get( 'road_surface' ), mid, 'value' )
            bridge = any( lo - EPS <= mid <= hi + EPS for lo, hi in bridges )
            for k, ( pts, first, last ) in enumerate( inside_runs( list( piece.coords ), box ) ):
                a = node( cuts[ ta ] if first else ( r[ 'id' ], ta, k, 'in' ), pts[ 0 ] )
                b = node( cuts[ tb ] if last else ( r[ 'id' ], ta, k, 'out' ), pts[ - 1 ] )
                roads.append( { 'class': r[ 'class' ], 'name': name, 'bridge': bridge, 'a': a, 'b': b,
                    'surface': None if surface is None else 'paved' if surface in PAVED else 'unpaved',
                    'pts': [ [ round( x, 1 ), round( y, 1 ) ] for x, y in pts ] } )
    return nodes, roads


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
