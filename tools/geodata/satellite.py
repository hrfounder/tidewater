"""Sentinel-2 true-colour mosaic of an area (or a close-up), projected like overview.py: the
top-down visual target for terrain colours, field patterns, forest and water.

    python3 tools/geodata/satellite.py bosut [out.jpg] [width_px] [lat,lon,km]
"""
import os, sys, math
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_bounds
from pyproj import Transformer
from PIL import Image
from areas import AREAS, IMAGERY

HERE = os.path.dirname( os.path.abspath( __file__ ) )
CRS = 'EPSG:3765'


def main():

    area = sys.argv[ 1 ] if len( sys.argv ) > 1 else 'bosut'
    out = sys.argv[ 2 ] if len( sys.argv ) > 2 else os.path.join( HERE, 'cache', area, 'satellite.jpg' )
    width = int( sys.argv[ 3 ] ) if len( sys.argv ) > 3 else 3000
    W, S, E, N = AREAS[ area ]
    if len( sys.argv ) > 4:
        lat, lon, km = map( float, sys.argv[ 4 ].split( ',' ) )
        dlat, dlon = km / 2 / 110.57, km / 2 / ( 111.32 * math.cos( math.radians( lat ) ) )
        W, S, E, N = lon - dlon, lat - dlat, lon + dlon, lat + dlat
    tf = Transformer.from_crs( 'EPSG:4326', CRS, always_xy=True )
    xs, ys = tf.transform( [ W, E, E, W ], [ S, S, N, N ] )
    x0, x1, y0, y1 = min( xs ), max( xs ), min( ys ), max( ys )
    height = int( width * ( y1 - y0 ) / ( x1 - x0 ) )
    dst_t = from_bounds( x0, y0, x1, y1, width, height )
    rgb = np.zeros( ( 3, height, width ), np.uint8 )
    for sid in IMAGERY[ area ]:
        with rasterio.open( os.path.join( HERE, 'cache', area, f'{sid}_TCI.tif' ) ) as src:
            for b in range( 3 ):
                tmp = np.zeros( ( height, width ), np.uint8 )
                reproject( rasterio.band( src, b + 1 ), tmp, dst_transform=dst_t, dst_crs=CRS, resampling=Resampling.average if ( x1 - x0 ) / width > 10 else Resampling.cubic )
                rgb[ b ] = np.where( tmp > 0, tmp, rgb[ b ] )
    # TCI is a linear stretch of reflectance; a mild gamma reads closer to what the eye sees
    img = ( 255 * ( rgb.transpose( 1, 2, 0 ) / 255.0 ) ** 0.8 ).astype( np.uint8 )
    Image.fromarray( img ).save( out, quality=88 )
    print( 'wrote', out, ( width, height ), f'{( x1 - x0 ) / width:.1f} m/px' )


if __name__ == '__main__':

    main()
