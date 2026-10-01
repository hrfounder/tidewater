"""Bare-earth terrain and water bodies of an area, from the fetched data (see fetch.py).

    python3 tools/geodata/terrain.py bosut [resolution_m]

Steps:
  1. Resample the Copernicus surface model (DSM) and ESA WorldCover onto a grid in HTRS96/TM.
  2. Bare earth: cells under forest, shrubs and buildings (and a margin around them, where the canopy
     edge bleeds into the 30 m model) are refilled from the surrounding open ground with a push-pull
     (pyramid) interpolation. The plain is flat, so that is close to the real forest floor.
  3. Water levels: lakes and ponds take the level the DEM's water flattening gives them. Rivers and
     canals take a level profile along their centreline (OSM lines run downstream) that never rises
     downstream.
  4. Channels: every river, canal, stream and ditch is cut into the ground with a trapezoid
     cross-section (bed width, depth, bank slope by class), and lakes get a basin that deepens away
     from the shore.

Outputs in cache/<area>/terrain/:
  dtm.tif        bare-earth ground with the channels and basins (m above sea level, float32)
  ground.tif     the same with the lake basins but without the line channels (the game cuts those)
  water_lines.json  rivers, canals, streams and ditches: width, depth, bank slope and points
                 [ east, north, water level, bank top ] every res metres, downstream
  water.tif      water surface level where there is water, NaN elsewhere (float32)
  water.json     the water bodies: name, class, level (or level range), width, depth
  previews       dsm vs dtm hillshades, the water map
"""
import os, sys, json, math
import numpy as np
import pyarrow.parquet as pq
import rasterio
from rasterio.merge import merge
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_origin
from rasterio import features
from scipy import ndimage
from pyproj import Transformer
from shapely import wkb
from shapely.ops import transform as shp_transform
from shapely.geometry import LineString, Polygon
from PIL import Image
from areas import AREAS

HERE = os.path.dirname( os.path.abspath( __file__ ) )
CRS = 'EPSG:3765'

# Channel cross-sections by class: water width (m), depth below the water level (m), bank slope
# (horizontal per vertical; regulated channels are about 1:2), freeboard: how far the water level
# sits below the surrounding ground (m)
CHANNEL = {
    'river': ( 22, 2.5, 2.0, 1.5 ),
    'canal': ( 10, 1.8, 2.0, 1.2 ),
    'stream': ( 4, 0.9, 1.5, 0.8 ),
    'drain': ( 2.5, 0.6, 1.5, 0.6 ),
    'ditch': ( 1.5, 0.5, 1.2, 0.5 ),
}
# named rivers measured on the imagery / known depths
NAMED = {
    'Bosut': ( 32, 2.5, 2.0, 2.0 ),
    'Sava': ( 190, 7.0, 3.0, 3.0 ),
    'Dunav': ( 400, 9.0, 3.0, 3.0 ),
    'Spačva': ( 20, 2.5, 2.0, 1.5 ),
    'Studva': ( 15, 2.0, 2.0, 1.5 ),
    'Biđ': ( 14, 2.0, 2.0, 1.5 ),
    'Virovi': ( 14, 2.0, 2.0, 1.5 ),
    'Kanal Bosut': ( 12, 2.0, 2.0, 1.5 ),
    'Vuka': ( 15, 2.0, 2.0, 1.5 ),
}
LAKE_DEPTH = { 'lake': 5.0, 'oxbow': 3.0, 'pond': 2.0, 'reservoir': 4.0, 'water': 3.0, 'river': 4.0, 'stream': 1.0, 'wastewater': 1.5 }
MASK_CLASSES = ( 10, 20, 50 )  # tree cover, shrubland, built-up


def push_pull( z, valid ):

    """Fill invalid cells smoothly from valid ones (pyramid down by averaging valid cells, back up by
    blending). Smooth and fast for large holes."""
    levels = []
    w = valid.astype( np.float64 )
    v = np.where( valid, z, 0 ).astype( np.float64 ) * w
    while min( v.shape ) > 2:
        levels.append( ( v, w ) )
        h, wd = v.shape
        h2, w2 = ( h + 1 ) // 2, ( wd + 1 ) // 2
        pv = np.zeros( ( h2 * 2, w2 * 2 ) ); pw = np.zeros( ( h2 * 2, w2 * 2 ) )
        pv[ :h, :wd ] = v; pw[ :h, :wd ] = w
        v = pv.reshape( h2, 2, w2, 2 ).sum( ( 1, 3 ) )
        w = pw.reshape( h2, 2, w2, 2 ).sum( ( 1, 3 ) )
        # normalise so weights stay in 0..1 (a fully valid cell has weight 1)
        s = np.maximum( w, 1e-9 )
        v = v / s * np.minimum( w, 1 ); w = np.minimum( w, 1 )
    est = np.where( w > 0, v / np.maximum( w, 1e-9 ), 0 )
    for v, w in reversed( levels ):
        up = np.repeat( np.repeat( est, 2, 0 ), 2, 1 )[ :v.shape[ 0 ], :v.shape[ 1 ] ]
        up = ndimage.uniform_filter( up, 3, mode='nearest' )
        own = np.where( w > 0, v / np.maximum( w, 1e-9 ), 0 )
        est = own * w + up * ( 1 - w )
    return np.where( valid, z, est ).astype( np.float32 )


def falling_fit( y ):

    """Least-squares non-increasing fit of y (pool adjacent violators)."""
    vals, wts, lens = [], [], []
    for v in y:
        vals.append( float( v ) ); wts.append( 1.0 ); lens.append( 1 )
        while len( vals ) > 1 and vals[ - 2 ] < vals[ - 1 ]:
            w = wts[ - 2 ] + wts[ - 1 ]
            vals[ - 2 ] = ( vals[ - 2 ] * wts[ - 2 ] + vals[ - 1 ] * wts[ - 1 ] ) / w
            wts[ - 2 ] = w; lens[ - 2 ] += lens[ - 1 ]
            vals.pop(); wts.pop(); lens.pop()
    return np.repeat( vals, lens ).astype( np.float32 )


def hillshade( z, res, exag=6 ):

    gy, gx = np.gradient( z, res )
    nx, ny, nz = - gx * exag, gy * exag, np.ones_like( z )
    l = np.array( [ - 0.5, 0.6, 0.62 ] ); l /= np.linalg.norm( l )
    return np.clip( ( nx * l[ 0 ] + ny * l[ 1 ] + nz * l[ 2 ] ) / np.sqrt( nx * nx + ny * ny + nz * nz ), 0, 1 )


def main():

    area = sys.argv[ 1 ] if len( sys.argv ) > 1 else 'bosut'
    res = float( sys.argv[ 2 ] ) if len( sys.argv ) > 2 else 10.0
    src = os.path.join( HERE, 'cache', area )
    out = os.path.join( src, 'terrain' )
    os.makedirs( out, exist_ok=True )
    W, S, E, N = AREAS[ area ]
    tf = Transformer.from_crs( 'EPSG:4326', CRS, always_xy=True )
    xs, ys = tf.transform( [ W, E, E, W ], [ S, S, N, N ] )
    x0, y1 = math.floor( min( xs ) / 100 ) * 100, math.ceil( max( ys ) / 100 ) * 100
    x1, y0 = math.ceil( max( xs ) / 100 ) * 100, math.floor( min( ys ) / 100 ) * 100
    width, height = int( ( x1 - x0 ) / res ), int( ( y1 - y0 ) / res )
    T = from_origin( x0, y1, res, res )
    print( f'{area}: grid {width} x {height} at {res} m, origin ({x0}, {y1}) {CRS}', flush=True )

    def warp( names, resampling, dtype=np.float32 ):

        srcs = [ rasterio.open( os.path.join( src, f ) ) for f in names ]
        a, t = merge( srcs, bounds=( W - 0.05, S - 0.05, E + 0.05, N + 0.05 ) )
        o = np.zeros( ( height, width ), dtype )
        reproject( a[ 0 ], o, src_transform=t, src_crs=srcs[ 0 ].crs, dst_transform=T, dst_crs=CRS, resampling=resampling )
        return o

    files = sorted( os.listdir( src ) )
    dsm = warp( [ f for f in files if f.startswith( 'dem_' ) ], Resampling.bilinear )
    lc = warp( [ f for f in files if f.startswith( 'ESA_WorldCover' ) ], Resampling.nearest, np.uint8 )

    # ---- 2. bare earth
    mask = np.isin( lc, MASK_CLASSES )
    # the 30 m model smears the canopy ~1.5 cells past its edge; small clearings inside a forest are
    # not trustworthy ground either
    mask = ndimage.binary_dilation( mask, iterations=max( 1, round( 30 / res ) ) )
    mask |= ndimage.binary_closing( mask, iterations=max( 1, round( 40 / res ) ) )
    ground = np.where( mask, np.nan, dsm )
    # open ground still carries hedges, tree lines, single trees and houses the land cover misses:
    # a local minimum keeps the ground under them
    k = max( 3, int( 90 / res ) | 1 )
    lo = ndimage.minimum_filter( np.where( mask, 1e4, dsm ), size=k )
    lo = ndimage.uniform_filter( lo, size=k )
    bump = ~mask & ( dsm - lo > 2.5 )
    valid = ~mask & ~bump
    dtm = push_pull( dsm, valid )
    # leftover mounds: tree groups and clearings' edges the land cover missed stand above the
    # large-scale surface near the refilled areas; drop them and refill (twice: big mounds shrink)
    near = ndimage.binary_dilation( ~valid, iterations=max( 1, round( 400 / res ) ) )
    for _ in range( 3 ):
        smooth = ndimage.gaussian_filter( dtm, 250 / res )
        valid &= ~( near & ( dtm - smooth > 1.2 ) )
        dtm = push_pull( dsm, valid )
    dtm = np.where( valid, dsm, ndimage.gaussian_filter( dtm, 30 / res ) )
    print( f'bare earth: refilled {( ~valid ).mean() * 100:.1f}% of the cells; mean lowering {np.mean( ( dsm - dtm )[ ~valid ] ):.1f} m', flush=True )

    # ---- 3/4. water
    tb = pq.read_table( os.path.join( src, 'overture_water.parquet' ) )
    to_grid = lambda g: shp_transform( lambda x, y, z=None: tf.transform( x, y ), g )
    water = np.full( ( height, width ), np.nan, np.float32 )
    bed = np.full( ( height, width ), np.inf, np.float32 )
    bodies = []

    def sample( z, xs, ys ):

        c = np.clip( ( ( np.asarray( xs ) - x0 ) / res ).astype( int ), 0, width - 1 )
        r = np.clip( ( ( y1 - np.asarray( ys ) ) / res ).astype( int ), 0, height - 1 )
        return z[ r, c ]

    # lakes, ponds and the mapped river areas: a level and a basin
    for g, sub, cl, nm, inter in zip( tb[ 'geometry' ].to_pylist(), tb[ 'subtype' ].to_pylist(), tb[ 'class' ].to_pylist(), tb[ 'names' ].to_pylist(), tb[ 'is_intermittent' ].to_pylist() ):
        G = wkb.loads( g )
        if not G.geom_type.endswith( 'Polygon' ) or cl == 'swimming_pool': continue
        P = to_grid( G )
        m = features.rasterize( [ ( P, 1 ) ], out_shape=( height, width ), transform=T, dtype=np.uint8, all_touched=False ).astype( bool )
        if m.sum() < 2: continue
        # the water's level: the DEM flattens water bodies, the low end of the cells inside is the surface
        lvl = float( np.percentile( dsm[ m ], 20 ) )
        inside = ndimage.distance_transform_edt( m ) * res
        depth = LAKE_DEPTH.get( cl, 3.0 )
        ramp = min( 25.0, max( 4.0, np.sqrt( m.sum() ) * res * 0.15 ) )
        b = lvl - depth * np.clip( inside / ramp, 0, 1 ) ** 0.7
        bed = np.where( m, np.minimum( bed, b ), bed )
        water = np.where( m, np.fmax( water, lvl ), water )
        bodies.append( { 'kind': 'area', 'name': nm and nm.get( 'primary' ), 'class': cl, 'level': round( lvl, 2 ), 'depth': depth, 'cells': int( m.sum() ), 'intermittent': bool( inter ) } )

    # bare earth with the lake basins but without the line channels: the game cuts those itself at
    # full resolution from the line vectors (water_lines.json)
    ground = np.minimum( dtm, bed ).astype( np.float32 )
    lines_out = []

    # rivers, canals, streams and ditches: a level profile along the line and a trapezoid channel
    # pieces of the same named river are joined first, so its level profile runs continuously
    from shapely.ops import linemerge
    from shapely.geometry import MultiLineString
    groups, singles = {}, []
    for g, sub, cl, nm, inter in zip( tb[ 'geometry' ].to_pylist(), tb[ 'subtype' ].to_pylist(), tb[ 'class' ].to_pylist(), tb[ 'names' ].to_pylist(), tb[ 'is_intermittent' ].to_pylist() ):
        G = wkb.loads( g )
        if G.geom_type not in ( 'LineString', 'MultiLineString' ): continue
        name = nm and nm.get( 'primary' )
        if name: groups.setdefault( ( name, cl, inter ), [] ).extend( getattr( G, 'geoms', [ G ] ) )
        else: singles.append( ( G, cl, None, inter ) )
    merged = [ ( linemerge( MultiLineString( v ) ), k[ 1 ], k[ 0 ], k[ 2 ] ) for k, v in groups.items() ] + singles
    for G, cl, name, inter in merged:
        key = next( ( k for k in NAMED if name and name.split( ' /' )[ 0 ] == k ), None )
        wid, dep, slope, free = NAMED[ key ] if key else CHANNEL.get( cl, CHANNEL[ 'ditch' ] )
        L = to_grid( G )
        for line in getattr( L, 'geoms', [ L ] ):
            n = max( 2, int( line.length / res ) + 1 )
            pts = [ line.interpolate( t, normalized=True ) for t in np.linspace( 0, 1, n ) ]
            px, py = np.array( [ p.x for p in pts ] ), np.array( [ p.y for p in pts ] )
            # ground at the line: the lowest ground within the channel's half width
            g0 = sample( dtm, px, py )
            for dx, dy in ( ( 1, 0 ), ( - 1, 0 ), ( 0, 1 ), ( 0, - 1 ) ):
                g0 = np.minimum( g0, sample( dtm, px + dx * wid / 2, py + dy * wid / 2 ) )
            # never rises downstream: the best non-increasing fit (a running minimum would drag the
            # whole river down to the lowest spot anywhere upstream)
            lvl = falling_fit( ndimage.uniform_filter1d( g0 - free, size=max( 3, int( 300 / res ) ), mode='nearest' ) )
            # bank top: the ground beside the channel on both sides (perpendicular to the line)
            tx, ty = np.gradient( px ), np.gradient( py )
            tn = np.maximum( np.hypot( tx, ty ), 1e-6 )
            off = wid / 2 + dep * slope + 25
            gl = sample( dtm, px - ty / tn * off, py + tx / tn * off )
            gr = sample( dtm, px + ty / tn * off, py - tx / tn * off )
            bank = ndimage.uniform_filter1d( np.maximum( np.minimum( gl, gr ), lvl + 0.3 ), size=max( 3, int( 100 / res ) ), mode='nearest' )
            lines_out.append( { 'name': name, 'class': cl, 'width': wid, 'depth': dep, 'slope': slope, 'dry': bool( inter is True and cl in ( 'ditch', 'drain' ) ),
                'pts': [ [ round( float( a ), 1 ), round( float( b ), 1 ), round( float( c ), 2 ), round( float( e ), 2 ) ] for a, b, c, e in zip( px, py, lvl, bank ) ] } )
            half = wid / 2 + dep * slope  # water half width + the underwater bank
            reach = half + free * slope
            # cells near the line: distance to it and the level of its nearest point
            buf = line.buffer( reach + res )
            minx, miny, maxx, maxy = buf.bounds
            c0, c1 = max( 0, int( ( minx - x0 ) / res ) ), min( width, int( ( maxx - x0 ) / res ) + 1 )
            r0, r1 = max( 0, int( ( y1 - maxy ) / res ) ), min( height, int( ( y1 - miny ) / res ) + 1 )
            if c1 <= c0 or r1 <= r0: continue
            cx = x0 + ( np.arange( c0, c1 ) + 0.5 ) * res
            cy = y1 - ( np.arange( r0, r1 ) + 0.5 ) * res
            X, Y = np.meshgrid( cx, cy )
            # nearest sample point (dense samples: good enough for a res-sized grid)
            from scipy.spatial import cKDTree
            d, i = cKDTree( np.c_[ px, py ] ).query( np.c_[ X.ravel(), Y.ravel() ], distance_upper_bound=reach + res )
            ok = np.isfinite( d )
            d = np.where( ok, d, 1e9 ).reshape( X.shape )
            li = np.where( ok, lvl[ np.minimum( i, n - 1 ) ], np.nan ).reshape( X.shape )
            # trapezoid: flat bed out to wid/2, then the bank slope up through the water line to the ground
            prof = li - dep + np.clip( d - wid / 2 + dep * slope * 0, 0, None ) / slope
            prof = np.where( d < wid / 2 - dep * slope, li - dep, li - dep + np.clip( d - ( wid / 2 - dep * slope ), 0, None ) / slope )
            sub_bed = bed[ r0:r1, c0:c1 ]
            sub_bed[ : ] = np.where( d <= reach, np.fmin( sub_bed, prof ), sub_bed )
            wet = ( d <= wid / 2 ) & ~( inter is True and cl in ( 'ditch', 'drain' ) )
            sub_w = water[ r0:r1, c0:c1 ]
            sub_w[ : ] = np.where( wet, np.fmax( sub_w, li ), sub_w )
            if key or cl in ( 'river', 'canal' ):
                bodies.append( { 'kind': 'line', 'name': name, 'class': cl, 'level': [ round( float( lvl[ 0 ] ), 2 ), round( float( lvl[ - 1 ] ), 2 ) ], 'width': wid, 'depth': dep, 'length_m': round( line.length ) } )

    dtm_final = np.minimum( dtm, bed ).astype( np.float32 )
    water = np.where( water > dtm_final + 0.02, water, np.nan ).astype( np.float32 )
    prof = dict( driver='GTiff', height=height, width=width, count=1, dtype='float32', crs=CRS, transform=T, compress='deflate', predictor=3, tiled=True )
    with rasterio.open( os.path.join( out, 'dtm.tif' ), 'w', **prof ) as f: f.write( dtm_final, 1 )
    with rasterio.open( os.path.join( out, 'water.tif' ), 'w', **prof, nodata=np.nan ) as f: f.write( water, 1 )
    with rasterio.open( os.path.join( out, 'ground.tif' ), 'w', **prof ) as f: f.write( ground, 1 )
    # line vectors: points every `res` m downstream, [ east, north, water level, bank top ] (m)
    json.dump( { 'crs': CRS, 'lines': lines_out }, open( os.path.join( out, 'water_lines.json' ), 'w' ), ensure_ascii=False )
    json.dump( { 'crs': CRS, 'origin': [ x0, y1 ], 'res': res, 'size': [ width, height ], 'bodies': bodies }, open( os.path.join( out, 'water.json' ), 'w' ), ensure_ascii=False, indent=1 )
    print( f'water: {len( bodies )} bodies, {np.isfinite( water ).mean() * 100:.2f}% of the area wet', flush=True )

    # ---- previews
    for name, z in ( ( 'dsm', dsm ), ( 'dtm', dtm_final ) ):
        hs = hillshade( z, res )
        lo_, hi_ = np.percentile( dtm_final, [ 1, 99.5 ] )
        t = np.clip( ( z - lo_ ) / ( hi_ - lo_ ), 0, 1 )
        rgb = np.stack( [ 0.45 + 0.5 * t, 0.55 + 0.3 * t, 0.35 + 0.2 * t ], - 1 ) * ( 0.35 + 0.75 * hs )[ ..., None ]
        if name == 'dtm':
            wet = np.isfinite( water )
            rgb[ wet ] = [ 0.2, 0.4, 0.65 ]
        Image.fromarray( ( np.clip( rgb, 0, 1 ) * 255 ).astype( np.uint8 ) ).save( os.path.join( out, f'{name}.png' ) )
    print( 'wrote', out )


if __name__ == '__main__':

    main()
