"""Download the source data of a map area into tools/geodata/cache/<area>/ (not committed).

    python3 tools/geodata/fetch.py bosut [overture|dem|landcover|imagery|all]

Sources (all open data on AWS S3, anonymous access):
  - Overture Maps (OpenStreetMap-derived; ODbL / CDLA): water, roads and rails, buildings, land use,
    infrastructure (bridges, piers, ...) and places, as GeoParquet clipped to the area's bounding box.
  - Copernicus DEM GLO-30 (© DLR / Airbus, Copernicus programme): 30 m elevation. It is a surface
    model: forest canopy and buildings are included (see the README).
  - ESA WorldCover 2021 v200 (CC BY 4.0): 10 m land cover classes.
  - Sentinel-2 L2A true colour (Copernicus Sentinel data, free and open): 10 m summer imagery, the
    top-down reference for colours and field patterns (areas.IMAGERY names the scenes).

Needs: pip install pyarrow s3fs rasterio numpy
"""
import os, sys, time, math
from areas import AREAS, IMAGERY

HERE = os.path.dirname( os.path.abspath( __file__ ) )
OVERTURE = 'overturemaps-us-west-2/release/2026-09-23.1'
LAYERS = [ ( 'base', 'water' ), ( 'transportation', 'segment' ), ( 'buildings', 'building' ),
    ( 'base', 'land_use' ), ( 'base', 'land_cover' ), ( 'base', 'infrastructure' ), ( 'places', 'place' ),
    ( 'divisions', 'division_area' ) ]


def s3():

    import s3fs
    proxy = os.environ.get( 'HTTPS_PROXY' ) or os.environ.get( 'https_proxy' )
    return s3fs.S3FileSystem( anon=True, client_kwargs={ 'region_name': 'us-west-2' },
        config_kwargs={ 'proxies': { 'https': proxy } } if proxy else {} )


def fetch_overture( bbox, out ):

    import pyarrow.dataset as ds, pyarrow.compute as pc, pyarrow.parquet as pq
    W, S, E, N = bbox
    fs = s3()
    for theme, typ in LAYERS:

        path = f'{out}/overture_{typ}.parquet'
        if os.path.exists( path ): continue
        t = time.time()
        d = ds.dataset( f'{OVERTURE}/theme={theme}/type={typ}/', filesystem=fs, format='parquet' )
        f = ( pc.field( 'bbox', 'xmin' ) < E ) & ( pc.field( 'bbox', 'xmax' ) > W ) & ( pc.field( 'bbox', 'ymin' ) < N ) & ( pc.field( 'bbox', 'ymax' ) > S )
        tb = d.to_table( filter=f )
        pq.write_table( tb, path + '.part' )
        os.replace( path + '.part', path )
        print( f'overture {typ}: {tb.num_rows} features ({time.time() - t:.0f} s)', flush=True )


def download( url, path ):

    if os.path.exists( path ): return
    import urllib.request
    t = time.time()
    with urllib.request.urlopen( url ) as r, open( path + '.part', 'wb' ) as f:
        while True:
            b = r.read( 1 << 20 )
            if not b: break
            f.write( b )
    os.replace( path + '.part', path )
    print( f'{os.path.basename( path )}: {os.path.getsize( path ) >> 20} MB ({time.time() - t:.0f} s)', flush=True )


def fetch_dem( bbox, out ):

    W, S, E, N = bbox
    for lat in range( math.floor( S ), math.ceil( N ) ):
        for lon in range( math.floor( W ), math.ceil( E ) ):
            t = f'Copernicus_DSM_COG_10_N{lat:02d}_00_E{lon:03d}_00_DEM'
            download( f'https://copernicus-dem-30m.s3.amazonaws.com/{t}/{t}.tif', f'{out}/dem_N{lat:02d}E{lon:03d}.tif' )


def fetch_landcover( bbox, out ):

    W, S, E, N = bbox
    # 3x3 degree tiles named by their south-west corner
    for lat in range( math.floor( S / 3 ) * 3, math.ceil( N / 3 ) * 3, 3 ):
        for lon in range( math.floor( W / 3 ) * 3, math.ceil( E / 3 ) * 3, 3 ):
            n = f'ESA_WorldCover_10m_2021_v200_N{lat:02d}E{lon:03d}_Map.tif'
            download( f'https://esa-worldcover.s3.amazonaws.com/v200/2021/map/{n}', f'{out}/{n}' )


def fetch_imagery( area, out ):

    for sid in IMAGERY.get( area, [] ):
        zone, band, sq = sid[ 4:6 ], sid[ 6 ], sid[ 7:9 ]
        y, m = sid[ 10:14 ], int( sid[ 14:16 ] )
        download( f'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/{zone}/{band}/{sq}/{y}/{m}/{sid}/TCI.tif', f'{out}/{sid}_TCI.tif' )


if __name__ == '__main__':

    area = sys.argv[ 1 ] if len( sys.argv ) > 1 else 'bosut'
    what = sys.argv[ 2 ] if len( sys.argv ) > 2 else 'all'
    bbox = AREAS[ area ]
    out = os.path.join( HERE, 'cache', area )
    os.makedirs( out, exist_ok=True )
    if what in ( 'dem', 'all' ): fetch_dem( bbox, out )
    if what in ( 'landcover', 'all' ): fetch_landcover( bbox, out )
    if what in ( 'imagery', 'all' ): fetch_imagery( area, out )
    if what in ( 'overture', 'all' ): fetch_overture( bbox, out )
