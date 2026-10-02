"""Cut an area's terrain into the game's world tiles.

    python3 tools/geodata/tiles.py bosut                          # every tile -> cache/bosut/tiles/
    python3 tools/geodata/tiles.py bosut core 45.22730,18.74159,12  # a 12 km block around a point -> public/world/bosut/

Tiles are TILE metres square on the HTRS96/TM (EPSG:3765) grid, aligned to multiples of TILE, and named
by their south-west corner in km: `t_<east>_<north>.bin`. Neighbouring tiles share their edge samples.

Tile file (little endian):
  0   char[4]  'TWT2'
  4   u16      n: samples per side (TILE / res + 1)
  6   u16      res: sample spacing (dm)
  8   i32      east, north of the south-west corner (m)
  16  u16[n*n] dry ground height (cm above sea level), rows from north to south
      u8[n*n]  land cover (ESA WorldCover class)

The tiles hold the ground without any water in it (terrain.py). index.json lists the tiles, the grid
and the data credits; water.json holds the water bodies over them as vectors (terrain.py water.json,
clipped to the block), which the game cuts into the ground at its own resolution.
"""
import os, sys, json, math, struct
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from pyproj import Transformer
from shapely.geometry import Polygon, box

HERE = os.path.dirname( os.path.abspath( __file__ ) )
ROOT = os.path.abspath( os.path.join( HERE, '..', '..' ) )
TILE = 1000
# water just outside the block still shapes the ground at its edge: keep this much of it (m)
MARGIN = 300
CREDITS = [
    'Map data © OpenStreetMap contributors (ODbL), via Overture Maps',
    'Copernicus DEM GLO-30 © DLR e.V. 2010-2014 and © Airbus 2014-2018, provided under COPERNICUS by the European Union and ESA',
    'ESA WorldCover 2021 (CC BY 4.0)',
]


def main():

    area = sys.argv[ 1 ] if len( sys.argv ) > 1 else 'bosut'
    core = len( sys.argv ) > 2 and sys.argv[ 2 ] == 'core'
    cache = os.path.join( HERE, 'cache', area )
    src = os.path.join( cache, 'terrain' )
    with rasterio.open( os.path.join( src, 'ground.tif' ) ) as f: ground, T, crs = f.read( 1 ), f.transform, f.crs
    res = T.a
    x0, y1 = T.c, T.f
    h, w = ground.shape
    n = int( TILE / res ) + 1

    # land cover on the same grid
    lc = np.zeros( ( h, w ), np.uint8 )
    for fn in os.listdir( cache ):
        if fn.startswith( 'ESA_WorldCover' ):
            with rasterio.open( os.path.join( cache, fn ) ) as f:
                tmp = np.zeros( ( h, w ), np.uint8 )
                reproject( rasterio.band( f, 1 ), tmp, dst_transform=T, dst_crs=crs, resampling=Resampling.mode )
                lc = np.where( tmp > 0, tmp, lc )

    e0, e1 = math.ceil( x0 / TILE ), math.floor( ( x0 + ( w - 1 ) * res ) / TILE )
    n0, n1 = math.ceil( ( y1 - ( h - 1 ) * res ) / TILE ), math.floor( y1 / TILE )
    center = None
    if core:
        lat, lon, km = map( float, sys.argv[ 3 ].split( ',' ) )
        cx, cy = Transformer.from_crs( 'EPSG:4326', crs, always_xy=True ).transform( lon, lat )
        half = km * 1000 / 2
        e0, e1 = max( e0, math.floor( ( cx - half ) / TILE ) ), min( e1, math.ceil( ( cx + half ) / TILE ) )
        n0, n1 = max( n0, math.floor( ( cy - half ) / TILE ) ), min( n1, math.ceil( ( cy + half ) / TILE ) )
        center = [ round( cx ), round( cy ) ]
    out = os.path.join( ROOT, 'public', 'world', area ) if core else os.path.join( cache, 'tiles' )
    os.makedirs( out, exist_ok=True )

    tiles = []
    for te in range( e0, e1 ):
        for tn in range( n0, n1 ):
            c = int( round( ( te * TILE - x0 ) / res ) )
            r = int( round( ( y1 - ( tn + 1 ) * TILE ) / res ) )
            if c < 0 or r < 0 or c + n > w or r + n > h: continue
            hg = ground[ r:r + n, c:c + n ]
            body = struct.pack( '<4sHHii', b'TWT2', n, int( round( res * 10 ) ), te * TILE, tn * TILE )
            body += np.clip( np.round( hg * 100 ), 0, 65535 ).astype( '<u2' ).tobytes()
            body += lc[ r:r + n, c:c + n ].astype( np.uint8 ).tobytes()
            name = f't_{te}_{tn}.bin'
            open( os.path.join( out, name ), 'wb' ).write( body )
            tiles.append( { 'file': name, 'east': te * TILE, 'north': tn * TILE, 'min': round( float( hg.min() ), 2 ), 'max': round( float( hg.max() ), 2 ) } )

    # the water over these tiles and a margin around them
    water = json.load( open( os.path.join( src, 'water.json' ), encoding='utf-8' ) )
    bx0, bx1, by0, by1 = e0 * TILE - MARGIN, e1 * TILE + MARGIN, n0 * TILE - MARGIN, n1 * TILE + MARGIN
    block = box( bx0, by0, bx1, by1 )
    ring = lambda r: [ [ round( x, 1 ), round( y, 1 ) ] for x, y in r.coords ]
    areas = []
    for a in water[ 'areas' ]:
        P = Polygon( a[ 'rings' ][ 0 ], a[ 'rings' ][ 1: ] )
        if not P.intersects( block ): continue
        # cut at the block's edge: the piece that is left ends in a straight bank out in the margin
        cut = P.intersection( block )
        for piece in getattr( cut, 'geoms', [ cut ] ):
            if piece.geom_type != 'Polygon' or piece.is_empty: continue
            areas.append( { k: v for k, v in a.items() if k != 'rings' } | { 'rings': [ ring( piece.exterior ) ] + [ ring( r ) for r in piece.interiors ] } )
    lines = []
    for l in water[ 'lines' ]:
        # the runs of points inside the block, each its own line
        run = []
        for p in l[ 'pts' ] + [ None ]:
            if p is not None and bx0 <= p[ 0 ] <= bx1 and by0 <= p[ 1 ] <= by1: run.append( p ); continue
            if len( run ) > 1: lines.append( { k: v for k, v in l.items() if k != 'pts' } | { 'pts': run } )
            run = []
    json.dump( { 'crs': str( crs ), 'areas': areas, 'lines': lines }, open( os.path.join( out, 'water.json' ), 'w', encoding='utf-8' ), ensure_ascii=False, separators=( ',', ':' ) )
    print( f'{len( areas )} water areas, {len( lines )} water lines -> water.json' )

    json.dump( { 'version': 2, 'crs': str( crs ), 'center': center, 'water': 'water.json', 'tile': TILE, 'samples': n, 'res': res, 'credits': CREDITS, 'tiles': tiles },
        open( os.path.join( out, 'index.json' ), 'w', encoding='utf-8' ), ensure_ascii=False, indent=1 )
    size = sum( os.path.getsize( os.path.join( out, t[ 'file' ] ) ) for t in tiles )
    print( f'{len( tiles )} tiles of {TILE} m ({n} x {n} samples at {res} m) -> {out} ({size / 1e6:.1f} MB)' )


if __name__ == '__main__':

    main()
