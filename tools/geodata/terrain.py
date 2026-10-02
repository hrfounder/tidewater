"""Dry ground and water bodies of an area, from the fetched data (see fetch.py).

    python3 tools/geodata/terrain.py bosut [resolution_m]

Steps:
  1. Resample the Copernicus surface model (DSM) and ESA WorldCover onto a grid in HTRS96/TM.
  2. Bare earth: cells under forest, shrubs and buildings (and a margin around them, where the canopy
     edge bleeds into the 30 m model) are refilled from the surrounding open ground with a push-pull
     (pyramid) interpolation. The plain is flat, so that is close to the real forest floor.
  3. Water bodies, as vectors. Areas are the mapped water polygons, touching ones merged, each with a
     level, a depth and a bank slope. Lines are the rivers, canals, streams and ditches, each with a
     section by class and a level profile along the line that never rises downstream. A river that
     is mapped as a polygon has both: the polygon is its bank line, the line its course.
  4. Dry ground: the 30 m model cannot see a bank. What it reports in and beside the water is a
     smear of surface, slope and trees, so those cells are refilled from the land around them. The
     game cuts every body into this ground itself, at its own resolution, and the bank comes out as
     tall as the plain stands above the water.

Outputs in cache/<area>/terrain/:
  ground.tif     dry bare-earth ground (m above sea level, float32)
  water.json     areas [ { name, class, level, depth, slope, flowing, rings } ] (rings of
                 [ east, north ]: the outer one first, then the islands) and lines [ { name, class,
                 width, depth, slope, dry, pts } ] with pts [ east, north, water level, inside an
                 area (0 / 1) ] every res metres, downstream
  previews       dsm.png, ground.png (hillshades; the water painted on the second)
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
from shapely import STRtree, contains_xy
from shapely.ops import transform as shp_transform, linemerge, unary_union
from shapely.geometry import MultiLineString
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
# still water, by class: depth (m)
STILL_DEPTH = { 'lake': 5.0, 'oxbow': 3.0, 'pond': 2.0, 'reservoir': 4.0, 'water': 3.0, 'river': 4.0, 'stream': 1.0, 'wastewater': 1.5 }
# the bank of a pond or a lake is gentler than a regulated channel's (horizontal per vertical)
STILL_SLOPE = 4.0
# how far the 30 m model smears a water body into the ground beside it: one and a half of its cells
SMEAR = 45.0
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

    # ---- 3. water bodies
    tb = pq.read_table( os.path.join( src, 'overture_water.parquet' ) )
    to_grid = lambda g: shp_transform( lambda x, y, z=None: tf.transform( x, y ), g )
    rows = list( zip( tb[ 'geometry' ].to_pylist(), tb[ 'class' ].to_pylist(), tb[ 'names' ].to_pylist(), tb[ 'is_intermittent' ].to_pylist() ) )

    def sample( z, xs, ys ):

        c = np.clip( ( ( np.asarray( xs ) - x0 ) / res ).astype( int ), 0, width - 1 )
        r = np.clip( ( ( y1 - np.asarray( ys ) ) / res ).astype( int ), 0, height - 1 )
        return z[ r, c ]

    def cells( geom, touched ):

        return features.rasterize( [ ( geom, 1 ) ], out_shape=( height, width ), transform=T, dtype=np.uint8, all_touched=touched ).astype( bool )

    # the mapped polygons; touching ones are one body (a river is mapped reach by reach)
    polys = []
    for g, cl, nm, inter in rows:
        G = wkb.loads( g )
        if not G.geom_type.endswith( 'Polygon' ) or cl == 'swimming_pool': continue
        for P in getattr( to_grid( G ).buffer( 0 ), 'geoms', [ to_grid( G ).buffer( 0 ) ] ):
            if P.geom_type == 'Polygon' and P.area > 0: polys.append( ( P, cl, nm and nm.get( 'primary' ) ) )
    merged = unary_union( [ p[ 0 ] for p in polys ] )
    bodies = [ g for g in getattr( merged, 'geoms', [ merged ] ) if g.geom_type == 'Polygon' and g.area >= 2 * res * res ]
    tree = STRtree( bodies )
    # each body takes the class and the name of the largest polygon it was merged from
    lead = {}
    for P, cl, name in polys:
        for i in tree.query( P.representative_point(), predicate='intersects' ):
            if int( i ) not in lead or P.area > lead[ int( i ) ][ 0 ]: lead[ int( i ) ] = ( P.area, cl, name )

    # rivers, canals, streams and ditches: pieces of the same named river are joined first, so its
    # level profile runs continuously
    groups, singles = {}, []
    for g, cl, nm, inter in rows:
        G = wkb.loads( g )
        if G.geom_type not in ( 'LineString', 'MultiLineString' ): continue
        name = nm and nm.get( 'primary' )
        if name: groups.setdefault( ( name, cl, inter ), [] ).extend( getattr( G, 'geoms', [ G ] ) )
        else: singles.append( ( G, cl, None, inter ) )
    joined = [ ( linemerge( MultiLineString( v ) ), k[ 1 ], k[ 0 ], k[ 2 ] ) for k, v in groups.items() ] + singles
    lines, wide = [], []
    # the course of each body: the line with the most of its points inside it
    course = {}
    for G, cl, name, inter in joined:
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
            inside = np.zeros( n, bool )
            for i in tree.query( line ):
                hit = contains_xy( bodies[ i ], px, py )
                inside |= hit
                if hit.sum() > course.get( int( i ), ( 0, ) )[ 0 ]: course[ int( i ) ] = ( int( hit.sum() ), len( lines ), float( np.median( lvl[ hit ] ) ) )
            lines.append( { 'name': name, 'class': cl, 'width': wid, 'depth': dep, 'slope': slope, 'dry': bool( inter is True and cl in ( 'ditch', 'drain' ) ),
                'pts': [ [ round( float( a ), 1 ), round( float( b ), 1 ), round( float( c ), 2 ), int( d ) ] for a, b, c, d in zip( px, py, lvl, inside ) ] } )
            if wid >= res: wide.append( line.buffer( wid / 2 ) )

    areas = []
    for i, P in enumerate( bodies ):
        _, cl, name = lead[ i ]
        if i in course:
            # a river with its bank line mapped: the line gives the level and the section
            l = lines[ course[ i ][ 1 ] ]
            level, depth, slope, name = course[ i ][ 2 ], l[ 'depth' ], l[ 'slope' ], name or l[ 'name' ]
        else:
            # still water: the DEM flattens water bodies, the low end of the cells inside is the surface
            m = cells( P, True )
            level, depth, slope = float( np.percentile( dsm[ m ], 20 ) ), STILL_DEPTH.get( cl, STILL_DEPTH[ 'water' ] ), STILL_SLOPE
        ring = lambda r: [ [ round( x, 1 ), round( y, 1 ) ] for x, y in r.coords ]
        areas.append( { 'name': name, 'class': cl, 'level': round( level, 2 ), 'depth': depth, 'slope': slope, 'flowing': i in course,
            'rings': [ ring( P.exterior ) ] + [ ring( r ) for r in P.interiors ] } )

    # ---- 4. dry ground
    wet = cells( unary_union( bodies + wide ), True )
    smeared = ndimage.binary_dilation( wet, iterations=max( 1, round( SMEAR / res ) ) )
    ground = push_pull( dtm, ~smeared )
    print( f'water: {len( areas )} areas ({sum( a[ "flowing" ] for a in areas )} with a course), {len( lines )} lines; {wet.mean() * 100:.2f}% of the area wet, {smeared.mean() * 100:.2f}% refilled', flush=True )

    prof = dict( driver='GTiff', height=height, width=width, count=1, dtype='float32', crs=CRS, transform=T, compress='deflate', predictor=3, tiled=True )
    with rasterio.open( os.path.join( out, 'ground.tif' ), 'w', **prof ) as f: f.write( ground, 1 )
    json.dump( { 'crs': CRS, 'areas': areas, 'lines': lines }, open( os.path.join( out, 'water.json' ), 'w', encoding='utf-8' ), ensure_ascii=False )

    # ---- previews
    for name, z in ( ( 'dsm', dsm ), ( 'ground', ground ) ):
        hs = hillshade( z, res )
        lo_, hi_ = np.percentile( ground, [ 1, 99.5 ] )
        t = np.clip( ( z - lo_ ) / ( hi_ - lo_ ), 0, 1 )
        rgb = np.stack( [ 0.45 + 0.5 * t, 0.55 + 0.3 * t, 0.35 + 0.2 * t ], - 1 ) * ( 0.35 + 0.75 * hs )[ ..., None ]
        if name == 'ground': rgb[ wet ] = [ 0.2, 0.4, 0.65 ]
        Image.fromarray( ( np.clip( rgb, 0, 1 ) * 255 ).astype( np.uint8 ) ).save( os.path.join( out, f'{name}.png' ) )
    print( 'wrote', out )


if __name__ == '__main__':

    main()
