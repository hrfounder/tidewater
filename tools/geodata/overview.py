"""Overview map of an area from the fetched source data (planning aid, not a game asset).

    python3 tools/geodata/overview.py bosut [out.png] [width_px] [lat,lon,km]

The optional last argument renders a km x km close-up centred on lat, lon instead of the whole area.

Land cover (ESA WorldCover) as the base, shaded with the elevation (Copernicus DEM); water polygons
and lines, roads by class, rails, buildings and place names from Overture. Projected to HTRS96/TM
(EPSG:3765, the Croatian national grid), the projection the game world will use.
"""
import os, sys, math
import numpy as np
import pyarrow.parquet as pq
import rasterio
from rasterio.merge import merge
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_bounds
from pyproj import Transformer
from shapely import wkb
from PIL import Image, ImageDraw, ImageFont
from areas import AREAS

HERE = os.path.dirname( os.path.abspath( __file__ ) )
CRS = 'EPSG:3765'

# ESA WorldCover classes -> map colour
LC = {
    10: ( 74, 112, 58 ),  # tree cover
    20: ( 150, 160, 90 ),  # shrubland
    30: ( 196, 205, 130 ),  # grassland
    40: ( 232, 222, 160 ),  # cropland
    50: ( 205, 120, 110 ),  # built-up
    60: ( 210, 200, 180 ),  # bare / sparse
    80: ( 120, 165, 210 ),  # permanent water
    90: ( 110, 170, 150 ),  # herbaceous wetland
    95: ( 60, 130, 110 ),  # mangroves (none here)
    100: ( 200, 210, 190 ),  # moss and lichen
}
ROAD = {  # class -> ( width m, colour )
    'motorway': ( 14, ( 200, 70, 50 ) ), 'trunk': ( 12, ( 220, 110, 60 ) ), 'primary': ( 10, ( 235, 150, 60 ) ),
    'secondary': ( 8, ( 240, 190, 80 ) ), 'tertiary': ( 7, ( 250, 240, 200 ) ), 'residential': ( 5, ( 255, 255, 255 ) ),
    'unclassified': ( 5, ( 250, 250, 240 ) ), 'living_street': ( 4, ( 255, 255, 255 ) ), 'service': ( 3, ( 245, 245, 245 ) ),
    'track': ( 3, ( 160, 120, 70 ) ), 'path': ( 1.5, ( 140, 100, 70 ) ), 'footway': ( 1.5, ( 140, 100, 70 ) ),
    'cycleway': ( 2, ( 90, 110, 200 ) ), 'unknown': ( 3, ( 230, 230, 230 ) ),
}
WATER = ( 70, 130, 190 )


def main():

    area = sys.argv[ 1 ] if len( sys.argv ) > 1 else 'bosut'
    out_png = sys.argv[ 2 ] if len( sys.argv ) > 2 else os.path.join( HERE, 'cache', area, 'overview.png' )
    width = int( sys.argv[ 3 ] ) if len( sys.argv ) > 3 else 3000
    src = os.path.join( HERE, 'cache', area )
    W, S, E, N = AREAS[ area ]
    if len( sys.argv ) > 4:
        lat, lon, km = map( float, sys.argv[ 4 ].split( ',' ) )
        dlat, dlon = km / 2 / 110.57, km / 2 / ( 111.32 * math.cos( math.radians( lat ) ) )
        W, S, E, N = lon - dlon, lat - dlat, lon + dlon, lat + dlat

    tf = Transformer.from_crs( 'EPSG:4326', CRS, always_xy=True )
    xs, ys = tf.transform( [ W, E, E, W ], [ S, S, N, N ] )
    x0, x1, y0, y1 = min( xs ), max( xs ), min( ys ), max( ys )
    mpp = ( x1 - x0 ) / width
    height = int( ( y1 - y0 ) / mpp )
    print( f'{area}: {( x1 - x0 ) / 1000:.1f} x {( y1 - y0 ) / 1000:.1f} km, {mpp:.1f} m/px' )
    dst_t = from_bounds( x0, y0, x1, y1, width, height )

    def warp( paths, resampling ):

        srcs = [ rasterio.open( p ) for p in paths ]
        a, t = merge( srcs, bounds=( W - 0.05, S - 0.05, E + 0.05, N + 0.05 ) )
        out = np.zeros( ( height, width ), np.float32 )
        reproject( a[ 0 ].astype( np.float32 ), out, src_transform=t, src_crs=srcs[ 0 ].crs, dst_transform=dst_t, dst_crs=CRS, resampling=resampling )
        return out

    files = os.listdir( src )
    dem = warp( [ os.path.join( src, f ) for f in files if f.startswith( 'dem_' ) ], Resampling.bilinear )
    lc = warp( [ os.path.join( src, f ) for f in files if f.startswith( 'ESA_WorldCover' ) ], Resampling.mode ).astype( np.int32 )
    print( f'elevation {dem.min():.0f}–{dem.max():.0f} m; land cover:', { k: f'{( lc == k ).mean() * 100:.1f}%' for k in LC if ( lc == k ).any() } )

    rgb = np.zeros( ( height, width, 3 ), np.float32 )
    for k, c in LC.items(): rgb[ lc == k ] = c
    # hillshade, exaggerated (the plain is flat: the levees, terraces and river banks show)
    gy, gx = np.gradient( dem, mpp )
    nx, ny, nz = - gx * 4, gy * 4, np.ones_like( dem )
    l = np.array( [ - 0.5, 0.6, 0.62 ] ); l /= np.linalg.norm( l )
    shade = ( nx * l[ 0 ] + ny * l[ 1 ] + nz * l[ 2 ] ) / np.sqrt( nx * nx + ny * ny + nz * nz )
    rgb *= np.clip( 0.55 + 0.6 * shade, 0.4, 1.15 )[ ..., None ]
    img = Image.fromarray( np.clip( rgb, 0, 255 ).astype( np.uint8 ) )
    d = ImageDraw.Draw( img )

    def px( coords ):

        cx, cy = tf.transform( *zip( *coords ) )
        return [ ( ( x - x0 ) / mpp, ( y1 - y ) / mpp ) for x, y in zip( cx, cy ) ]

    def geoms( name ):

        p = os.path.join( src, f'overture_{name}.parquet' )
        if not os.path.exists( p ): return []
        t = pq.read_table( p )
        cols = { c: t[ c ].to_pylist() for c in ( 'subtype', 'class', 'names' ) if c in t.column_names }
        for i, g in enumerate( t[ 'geometry' ].to_pylist() ):
            yield wkb.loads( g ), { c: v[ i ] for c, v in cols.items() }

    def draw( g, fill=None, line=None, w=1 ):

        if g.geom_type in ( 'Polygon', 'MultiPolygon' ):
            for p in getattr( g, 'geoms', [ g ] ):
                d.polygon( px( p.exterior.coords ), fill=fill, outline=line )
                for h in p.interiors: d.polygon( px( h.coords ), fill=None, outline=line )
        elif g.geom_type in ( 'LineString', 'MultiLineString' ):
            for p in getattr( g, 'geoms', [ g ] ): d.line( px( p.coords ), fill=line or fill, width=max( 1, round( w ) ) )

    for g, a in geoms( 'water' ):
        if g.geom_type.endswith( 'Polygon' ) and a.get( 'class' ) != 'swimming_pool': draw( g, fill=WATER )
    for g, a in geoms( 'water' ):
        if g.geom_type.endswith( 'LineString' ):
            big = a.get( 'subtype' ) == 'river'
            draw( g, line=WATER, w=( 12 if big else 4 if a.get( 'class' ) in ( 'canal', 'stream' ) else 2 ) / mpp + 1 )
    segs = list( geoms( 'segment' ) )
    order = list( ROAD )[ ::-1 ]
    for g, a in sorted( ( s for s in segs if s[ 1 ].get( 'subtype' ) == 'road' ), key=lambda s: - order.index( s[ 1 ].get( 'class' ) ) if s[ 1 ].get( 'class' ) in order else 0 ):
        w, c = ROAD.get( a.get( 'class' ), ROAD[ 'unknown' ] )
        draw( g, line=c, w=w / mpp + 1 )
    for g, a in segs:
        if a.get( 'subtype' ) == 'rail': draw( g, line=( 40, 40, 40 ), w=2 )
    for g, a in geoms( 'building' ): draw( g, fill=( 90, 60, 50 ) )

    try: font = ImageFont.truetype( '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', max( 12, width // 140 ) )
    except OSError: font = ImageFont.load_default()
    t = pq.read_table( os.path.join( src, 'overture_division_area.parquet' ) ) if os.path.exists( os.path.join( src, 'overture_division_area.parquet' ) ) else None
    if t is not None:
        for g, sub, nm in zip( t[ 'geometry' ].to_pylist(), t[ 'subtype' ].to_pylist(), t[ 'names' ].to_pylist() ):
            if sub != 'locality' or not nm: continue
            c = wkb.loads( g ).representative_point()
            ( x, y ), = px( [ ( c.x, c.y ) ] )
            d.text( ( x, y ), nm[ 'primary' ], fill=( 20, 20, 20 ), font=font, anchor='mm', stroke_width=3, stroke_fill=( 255, 255, 255 ) )
    # scale bar: 5 km
    sb = 5000 / mpp
    d.rectangle( [ 40, height - 60, 40 + sb, height - 48 ], fill=( 0, 0, 0 ) )
    d.text( ( 40 + sb / 2, height - 70 ), '5 km', fill=( 0, 0, 0 ), font=font, anchor='mb', stroke_width=3, stroke_fill=( 255, 255, 255 ) )
    img.save( out_png )
    print( 'wrote', out_png, img.size )


if __name__ == '__main__':

    main()
