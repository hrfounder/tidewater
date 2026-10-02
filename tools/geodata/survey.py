"""Survey a core block from the state orthophoto: where each building really stands and the colour of
its roof, and where each paved road really runs and how wide it is.

    python3 tools/geodata/survey.py bosut 45.22730,18.74159,4
    python3 tools/geodata/survey.py bosut 45.22730,18.74159,4 rails     (the tracks only, into the survey there is)

The map's footprints were traced by hand from other pictures, and here they lie up to five metres
from the buildings (and each its own way: neighbours are not moved alike). What a building looks
like the map does not say at all. The orthophoto has both: this sets each mapped footprint on its
roof and reads the roof's colour, and writes public/world/<area>/survey.json

  source   what was read, and when
  shifts   one entry per building of places.json, in its order: [ east, north ], the metres its
           mapped footprint has to be moved to stand where the building does
  roofs    likewise: [ r, g, b ] (sRGB 0-255, the lit slope of the roof as the camera saw it, brought
           to the brightness of the game's surfaces), or null where the roof could not be read
           (a tree over it)
  nodes    one entry per node of places.json: [ east, north ], where the roads really meet
  rails    one entry per run of track of places.json: { pts, bridges } as there, on its ballast,
           and `bed`, the ballast's colour ( brought to the game's brightness as the roofs are )
  gain     what the pictures' colours were multiplied by: for a colour read off them by hand
  roads    one entry per road of places.json: { pts: [ [ east, north ], ... ], width }, the line the
           road really runs along between its two nodes, a point every ROAD_STEP metres, and the
           width of its asphalt (null where it was not measured: the game keeps its class's)

Source: the orthophoto of the State Geodetic Administration of Croatia (Državna geodetska uprava),
layer DOF_LIDAR_2022_2023 of its public WMS (geoportal.dgu.hr), asked for at 0.25 m a pixel in the
map grid the tiles use (EPSG:3765). The pictures are kept in cache/<area>/ortho/ and are not
committed or shipped: only what was measured on them is.

How a footprint is set on its roof:
  - A roof differs from what lies beside it along every one of its edges. For a footprint tried at a
    place, each wall's contrast is the distance in colour between the strip BAND metres inside it
    and the strip BAND metres outside it, counted no higher than CAP (one glaring edge, a ridge
    between a lit slope and a shaded one, must not outweigh the others); the place's score is the
    walls' contrasts weighted by their lengths. Every place within REACH metres is tried, STEP apart.
  - The score cannot tell a roof from its shadow: a building's shadow on the ground is as even and
    as sharply edged as a roof, and lies right beside it. (It put the hall with the solar panels,
    mapped where it stands, six metres off onto its own shadow.) On these pictures the sun stands in
    the south-south-east and shadows fall along SHADOW; a place that lies more than TOWARD_SHADOW
    metres that way from the mapped one is not taken, whatever it scores.
  - The map is not out at random: whoever traced a street traced it from one picture, and its
    buildings are out together (here mostly three to four metres to the north-east), but some
    were traced since from a better one and stand right. So a footprint is moved only on evidence:
    it is SURE if its best place alone (less PULL for every metre from the mapped one) fits SURE
    times better than the mapped one and is not at the limit; it then goes there. One that is not
    sure goes with its street (the best place within WITH metres of the median move of the sure
    footprints within NEAR metres) if that fits LIKELY times better than the mapped place.
    Otherwise it stays where the map has it.
  - A place that puts a corner of the footprint on the asphalt of a surveyed road is not taken: the
    asphalt is where it is, and no house stands on it.
  - What is found is where the roof's edge is on the picture, and a roof's edge stands EAVES_UP
    metres above the ground: the footprint goes LEAN * EAVES_UP metres back north of it.

How a track is set on its ballast:
  - A track's bed is a band of ballast BED wide: grey as asphalt is, and brighter than the green
    beside it (BALLAST). Across the mapped line, out to RAIL_REACH, each station is read for it as a
    road's is; the track is where the band is ballast and the strips FLANK wide on its two sides
    are not. What the stations say is the median within RAIL_SMOOTH metres along the track, and
    then the mean over the same (a median steps, a track does not).
  - A run whose stations say too little goes as the nearest station of a run that was read went.

How a road is set on its asphalt (the paved classes only: PAVED):
  - Asphalt on these pictures is grey (its three colours within GREY of each other) and neither as
    dark as a shadow on grass nor as bright as concrete (DARK to BRIGHT). Across the road, every
    ACROSS metres out to ROAD_REACH and half a carriageway more, each station ROAD_STEP metres
    along the mapped line is read for it, and every reading is averaged with its neighbours within
    ROAD_ALONG metres along the road (a parked car, a tree's shadow and a crossing are local).
  - Where the asphalt read through the mapped line's best place is one run narrower than WIDE, the
    road's middle is the run's middle and its width the run's. Where it is wider (a square, parking
    bays beside the road) the middle is where a band a CARRIAGEWAY wide holds most asphalt, less
    ROAD_PULL for every metre from the mapped line. A station that finds less than HALF asphalt
    says nothing. What the stations say is then the median within SMOOTH metres along the road.
  - A road that ends up through a building was set on a roof (grey sheet reads as asphalt): it
    counts as not surveyed.
  - Roads meet at nodes. A node goes where its roads' ends say, as well as they agree (each end
    says how far the node lies to the side of that road, and nothing about along it), held a
    little to its mapped place (DAMP) so that roads in line cannot send it along themselves; every
    road is then bent over EASE metres at each end to meet its nodes where they went.
  - A railway's ballast reads as asphalt does, and so does the dry verge between it and a road
    beside it: such a road is set up to a metre toward the track (Poljska ulica). Leaving the bed
    out of the reading was tried and is worse: the verge then counts as the road's whole width, and
    the roads at the crossing by the cemetery went three to six metres off their asphalt.
  - What is not asphalt (tracks, yard roads, foot ways) cannot be found this way. It was traced from
    the same picture as the houses beside it, so it goes where they went: each of its stations by
    the median move of the footprints within NEAR metres, a node that no surveyed road reaches
    likewise.

How a roof is read:
  - The service stamps its mark across the middle of every picture it gives. Each stretch of ground
    is therefore asked for twice, in two grids of pictures half a picture apart, and a building is
    read from the one in which it lies further from the middle.
  - A roof stands above the ground and the photograph was not taken from straight overhead: on these
    pictures a point leans LEAN metres south for every metre of its height (measured on St Andrew's
    tower, whose cornice is 19 m up and lies 1.9 m south of its foot). A roof is read inside the
    outline that was found for it on the picture, INSET metres in from it.
  - A roof has a lit slope and a shaded one. The colour kept is the mean of the pixels between the
    55th and the 90th percentile of brightness: the lit slope, without its glints.
  - The pictures are brighter than the game's surfaces. The carriageways are the measure: the median
    colour along the middle of the surveyed roads is brought to ASPHALT, and every roof with it.

Needs: pip install pillow numpy shapely pyproj
"""
import os, sys, json, time, math, urllib.request
import numpy as np
from PIL import Image, ImageDraw
from shapely.geometry import Polygon

HERE = os.path.dirname( os.path.abspath( __file__ ) )
ROOT = os.path.abspath( os.path.join( HERE, '..', '..' ) )
WMS = 'https://geoportal.dgu.hr/services/dof/wms'
LAYER = 'DOF_LIDAR_2022_2023'
METRE = 0.25                 # metres to a pixel
TILE = 250                   # a picture's side on the ground (m), and what it shows beyond it on each side
MARGIN = 25
LEAN, EAVES_UP = 0.1, 3.0    # metres south per metre of height; the height of a village roof's edge
REACH, STEP = 6.0, 0.5       # how far a footprint may be moved to its roof, and how far apart the places tried (m)
BAND, ALONG = 0.8, 0.5       # the strips compared each side of a wall: how far from it, and between samples (m)
CAP, PULL = 60.0, 1.0        # the most one wall's contrast counts (RGB distance); what a metre of moving costs
NEAR, SURE = 100.0, 2.0      # neighbours are the footprints within this (m); one is sure if it fits this much better
WITH, LIKELY = 1.5, 1.3      # going with the street: within this of its median move (m), if it fits this much better
SHADOW, TOWARD_SHADOW = ( - 0.49, 0.87 ), 1.0   # the way shadows fall ( east, north ): St Andrew's tower's; metres that way allowed
INSET = 0.75                 # a roof is read this far inside its outline (m)
PAVED = ( 'secondary', 'residential', 'unclassified' )    # the classes surveyed, unless the map says unpaved
ROAD_STEP, ACROSS = 2.0, 0.25      # between stations along a road, and between readings across it (m)
ROAD_REACH, CARRIAGEWAY = 6.0, 5.0 # how far a road may be moved; the band looked for where the asphalt is wide (m)
GREY, DARK, BRIGHT = 20, 55, 185   # asphalt: its colours this close together, its brightness between these
ROAD_ALONG, SMOOTH, EASE = 12.0, 20.0, 15.0   # metres along the road: readings averaged, offsets' median, the bend to a node
WIDE, HALF, ROAD_PULL = 9.0, 0.5, 0.02   # a run wider than this is not one carriageway; the share that counts as asphalt
DAMP = 0.05                        # how hard a node is held to its mapped place, against each road's say of 1
RAIL_SMOOTH = 200.0                # metres along a track over which its offsets' median is taken: a track is drawn off by the same all along
BALLAST = ( 105, BRIGHT )          # a track's bed: its brightness between these (130 on the bed north of the Bosut; the green beside it under 100)
BED, FLANK, RAIL_REACH = 4.5, 1.5, 4.0   # the bed's width; the strip each side of it that is not bed; how far a track may be moved (m)
SHOULDERS = 1.5                    # beyond this from a track's middle its bed is ballast alone: a sleeper is 2.5 m long (m)
LIT = ( 55, 90 )             # the percentiles of brightness between which a roof's colour is taken
FEW = 12                     # a roof with fewer pixels than this to read is not read
# the middle of a paved road in the game's ground: GroundSurface.js draws its asphalt between 0.30 and
# 0.42 of white (sRGB)
ASPHALT = round( 255 * ( 0.30 + 0.42 ) / 2 )


def tile( cache, e0, n0 ):
    """The picture whose ground square has its south-west corner at ( e0, n0 ), margins included."""
    path = os.path.join( cache, f'{LAYER}_{e0:.0f}_{n0:.0f}.jpg' )
    if not os.path.exists( path ):
        box = ( e0 - MARGIN, n0 - MARGIN, e0 + TILE + MARGIN, n0 + TILE + MARGIN )
        px = round( ( TILE + 2 * MARGIN ) / METRE )
        url = ( f'{WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS={LAYER}&STYLES=&CRS=EPSG:3765'
                f'&BBOX={box[ 0 ]},{box[ 1 ]},{box[ 2 ]},{box[ 3 ]}&WIDTH={px}&HEIGHT={px}&FORMAT=image/jpeg' )
        for attempt in range( 4 ):
            try:
                with urllib.request.urlopen( url, timeout=90 ) as r: data = r.read()
                if data[ :2 ] != b'\xff\xd8': raise IOError( 'not a picture: ' + data[ :200 ].decode( 'utf-8', 'replace' ) )
                break
            except Exception as err:
                if attempt == 3: raise
                time.sleep( 3 * ( attempt + 1 ) )
        with open( path + '.part', 'wb' ) as f: f.write( data )
        os.replace( path + '.part', path )
        time.sleep( 0.2 )
    return np.asarray( Image.open( path ).convert( 'RGB' ) )


# the places a footprint may be moved to: ( east, north ) in metres, the mapped place among them
_steps = np.arange( - REACH, REACH + STEP / 2, STEP )
PLACES = np.stack( [ g.ravel() for g in np.meshgrid( _steps, _steps ) ], axis=1 )
MAPPED = int( np.argmin( np.hypot( PLACES[ :, 0 ], PLACES[ :, 1 ] ) ) )


class Ortho:

    """The orthophoto of a block, a picture at a time."""

    def __init__( self, cache, origin ):
        self.cache, self.origin, self.open = cache, origin, {}
        os.makedirs( cache, exist_ok=True )

    def around( self, e, n ):
        """The picture to read the point ( e, n ) from, of the two grids' the one whose middle is
        further from it: ( pixels, the east of its left edge, the north of its top edge )."""
        best = None
        for shift in ( 0, TILE / 2 ):
            e0 = self.origin[ 0 ] - shift + math.floor( ( e - self.origin[ 0 ] + shift ) / TILE ) * TILE
            n0 = self.origin[ 1 ] - shift + math.floor( ( n - self.origin[ 1 ] + shift ) / TILE ) * TILE
            off = max( abs( e - e0 - TILE / 2 ), abs( n - n0 - TILE / 2 ) )
            if not best or off > best[ 0 ]: best = ( off, e0, n0 )
        _, e0, n0 = best
        if ( e0, n0 ) not in self.open:
            if len( self.open ) > 24: self.open.pop( next( iter( self.open ) ) )
            self.open[ ( e0, n0 ) ] = tile( self.cache, e0, n0 )
        return self.open[ ( e0, n0 ) ], e0 - MARGIN, n0 + TILE + MARGIN

    def fits( self, ring ):
        """How well a mapped ring of ( east, north ) fits the picture at every place it may be moved
        to: one score for each of PLACES (in their order)."""
        poly = Polygon( ring )
        e, n = poly.centroid.x, poly.centroid.y
        px, left, top = self.around( e, n )
        img = px.astype( np.float32 )
        sign = 1 if poly.exterior.is_ccw else - 1
        inner, outer, wall, length = [], [], [], []
        for k in range( len( ring ) - 1 ):
            ( x0, y0 ), ( x1, y1 ) = ring[ k ], ring[ k + 1 ]
            l = math.hypot( x1 - x0, y1 - y0 )
            if l < 2 * ALONG: continue
            # the wall's outward normal: to the right of its direction on a ring that runs anticlockwise
            nx, ny = sign * ( y1 - y0 ) / l, - sign * ( x1 - x0 ) / l
            for t in np.arange( ALONG, l - ALONG / 2, ALONG ):
                x, y = x0 + ( x1 - x0 ) * t / l, y0 + ( y1 - y0 ) * t / l
                inner.append( ( x - nx * BAND, y - ny * BAND ) ); outer.append( ( x + nx * BAND, y + ny * BAND ) )
                wall.append( len( length ) )
            length.append( l )
        if not length: return np.zeros( len( PLACES ) )
        inner, outer, wall, length = np.asarray( inner ), np.asarray( outer ), np.asarray( wall ), np.asarray( length )
        # each wall's mean over its own samples, as a matrix: walls x samples
        mean = ( wall[ None, : ] == np.arange( len( length ) )[ :, None ] ).astype( np.float32 )
        mean /= mean.sum( axis=1, keepdims=True )
        de, dn = PLACES[ :, 0 ], PLACES[ :, 1 ]
        def colours( pts ):
            col = np.clip( np.rint( ( pts[ None, :, 0 ] + de[ :, None ] - left ) / METRE ).astype( int ), 0, img.shape[ 1 ] - 1 )
            row = np.clip( np.rint( ( top - pts[ None, :, 1 ] - dn[ :, None ] ) / METRE ).astype( int ), 0, img.shape[ 0 ] - 1 )
            return np.einsum( 'kpc,wp->kwc', img[ row, col ], mean )
        contrast = np.minimum( np.linalg.norm( colours( inner ) - colours( outer ), axis=2 ), CAP )
        return ( contrast * length ).sum( axis=1 ) / length.sum()

    def asphalt( self, e, n ):
        """Is the picture asphalt at ( east, north )?"""
        px, left, top = self.around( e, n )
        row, col = int( ( top - n ) / METRE ), int( ( e - left ) / METRE )
        if not ( 0 <= row < px.shape[ 0 ] and 0 <= col < px.shape[ 1 ] ): return False
        r, g, b = ( int( v ) for v in px[ row, col ] )
        return max( r, g, b ) - min( r, g, b ) <= GREY and DARK <= ( r + g + b ) / 3 <= BRIGHT

    def inside( self, ring ):
        """The pixels inside a ring of ( east, north ): an array of RGB rows."""
        e = sum( p[ 0 ] for p in ring ) / len( ring ); n = sum( p[ 1 ] for p in ring ) / len( ring )
        px, left, top = self.around( e, n )
        pts = [ ( ( x - left ) / METRE, ( top - y ) / METRE ) for x, y in ring ]
        mask = Image.new( '1', ( px.shape[ 1 ], px.shape[ 0 ] ) )
        ImageDraw.Draw( mask ).polygon( pts, fill=1 )
        return px[ np.asarray( mask ) ]


def stations( pts ):
    """A mapped line as points ROAD_STEP apart (its two ends kept), with the distance along it and
    the unit normal to its right at each: arrays of ( east, north ), metres, ( east, north )."""
    P = np.asarray( pts, dtype=np.float64 )
    seg = np.hypot( *np.diff( P, axis=0 ).T )
    along = np.concatenate( [ [ 0 ], np.cumsum( seg ) ] )
    n = max( 2, int( math.ceil( along[ - 1 ] / ROAD_STEP ) ) + 1 )
    at = np.linspace( 0, along[ - 1 ], n )
    Q = np.stack( [ np.interp( at, along, P[ :, 0 ] ), np.interp( at, along, P[ :, 1 ] ) ], axis=1 )
    T = np.gradient( Q, axis=0 )
    T /= np.maximum( np.hypot( T[ :, 0 ], T[ :, 1 ] ), 1e-9 )[ :, None ]
    return Q, at, np.stack( [ T[ :, 1 ], - T[ :, 0 ] ], axis=1 )


def road_offsets( ortho, Q, at, N ):
    """How far to the right of the mapped line the road's middle is at each station, and the width
    of its asphalt there (NaN where a station says nothing)."""
    half = int( round( CARRIAGEWAY / 2 / ACROSS ) )
    across = np.arange( - ROAD_REACH - CARRIAGEWAY / 2, ROAD_REACH + CARRIAGEWAY / 2 + ACROSS / 2, ACROSS )
    A = np.asarray( [ [ ortho.asphalt( q[ 0 ] + n[ 0 ] * o, q[ 1 ] + n[ 1 ] * o ) for o in across ] for q, n in zip( Q, N ) ], dtype=np.float64 )
    # averaged along the road
    w = max( 1, int( round( ROAD_ALONG / ROAD_STEP ) ) )
    c = np.concatenate( [ np.zeros( ( 1, A.shape[ 1 ] ) ), np.cumsum( A, axis=0 ) ] )
    lo, hi = np.maximum( 0, np.arange( len( Q ) ) - w ), np.minimum( len( Q ), np.arange( len( Q ) ) + w + 1 )
    A = ( c[ hi ] - c[ lo ] ) / ( hi - lo )[ :, None ]
    # the band a carriageway wide, at every place its middle may be
    c = np.concatenate( [ np.zeros( ( len( Q ), 1 ) ), np.cumsum( A, axis=1 ) ], axis=1 )
    mids = np.arange( half, len( across ) - half )
    band = ( c[ :, mids + half + 1 ] - c[ :, mids - half ] ) / ( 2 * half + 1 )
    best = np.argmax( band - ROAD_PULL * np.abs( across[ mids ] )[ None, : ], axis=1 )
    off, wide = np.full( len( Q ), np.nan ), np.full( len( Q ), np.nan )
    for i, k in enumerate( best ):
        if band[ i, k ] < HALF: continue
        j = mids[ k ]
        a = b = j
        while a > 0 and A[ i, a - 1 ] >= HALF: a -= 1
        while b + 1 < len( across ) and A[ i, b + 1 ] >= HALF: b += 1
        run = across[ b ] - across[ a ] + ACROSS
        open_ended = a == 0 or b == len( across ) - 1
        if run <= WIDE and not open_ended and abs( ( across[ a ] + across[ b ] ) / 2 ) <= ROAD_REACH: off[ i ], wide[ i ] = ( across[ a ] + across[ b ] ) / 2, run
        else: off[ i ] = across[ j ]
    return off, wide


def survey_roads( ortho, places ):
    """The paved roads of the map on their asphalt: one record per road of the map, with its
    stations Q, their distance along and normals, the offset found at each, the width, and whether
    it was surveyed at all."""
    R, lines = places[ 'roads' ], []
    for r in R:
        Q, at, N = stations( r[ 'pts' ] )
        off = np.zeros( len( Q ) ); width = None
        seen = r[ 'class' ] in PAVED and r[ 'surface' ] != 'unpaved' and not r[ 'bridge' ]
        if seen:
            raw, wide = road_offsets( ortho, Q, at, N )
            if np.isfinite( raw ).mean() >= HALF:
                k = max( 1, int( round( SMOOTH / ROAD_STEP ) ) )
                off = np.asarray( [ np.nanmedian( raw[ max( 0, i - k ):i + k + 1 ] ) if np.isfinite( raw[ max( 0, i - k ):i + k + 1 ] ).any() else np.nan for i in range( len( Q ) ) ] )
                off = np.where( np.isfinite( off ), off, np.nanmedian( raw ) )
                if np.isfinite( wide ).mean() >= HALF: width = round( float( np.nanmedian( wide ) ), 2 )
            else: seen = False
        lines.append( dict( Q=Q, at=at, N=N, off=off, width=width, seen=seen ) )
    return lines


def rail_offsets( ortho, Q, at, N ):
    """How far to the right of the mapped line a track's bed lies at each station (NaN where a
    station says nothing). The bed is a band of ballast BED wide, brighter than what lies beside it:
    the place is taken where the band is ballast and the strips on its two sides are not."""
    across = np.arange( - RAIL_REACH - BED / 2 - FLANK, RAIL_REACH + BED / 2 + FLANK + ACROSS / 2, ACROSS )
    def ballast( e, n ):
        px, left, top = ortho.around( e, n )
        row, col = int( ( top - n ) / METRE ), int( ( e - left ) / METRE )
        if not ( 0 <= row < px.shape[ 0 ] and 0 <= col < px.shape[ 1 ] ): return False
        r, g, b = ( int( v ) for v in px[ row, col ] )
        return max( r, g, b ) - min( r, g, b ) <= GREY and BALLAST[ 0 ] <= ( r + g + b ) / 3 <= BALLAST[ 1 ]
    A = np.asarray( [ [ ballast( q[ 0 ] + n[ 0 ] * o, q[ 1 ] + n[ 1 ] * o ) for o in across ] for q, n in zip( Q, N ) ], dtype=np.float64 )
    w = max( 1, int( round( ROAD_ALONG / ROAD_STEP ) ) )
    c = np.concatenate( [ np.zeros( ( 1, A.shape[ 1 ] ) ), np.cumsum( A, axis=0 ) ] )
    lo, hi = np.maximum( 0, np.arange( len( Q ) ) - w ), np.minimum( len( Q ), np.arange( len( Q ) ) + w + 1 )
    A = ( c[ hi ] - c[ lo ] ) / ( hi - lo )[ :, None ]
    c = np.concatenate( [ np.zeros( ( len( Q ), 1 ) ), np.cumsum( A, axis=1 ) ], axis=1 )
    half, flank = int( round( BED / 2 / ACROSS ) ), int( round( FLANK / ACROSS ) )
    mids = np.arange( half + flank, len( across ) - half - flank )
    bed = ( c[ :, mids + half + 1 ] - c[ :, mids - half ] ) / ( 2 * half + 1 )
    beside = ( c[ :, mids - half ] - c[ :, mids - half - flank ] + c[ :, mids + half + flank + 1 ] - c[ :, mids + half + 1 ] ) / ( 2 * flank )
    score = bed - beside
    best = np.argmax( score - ROAD_PULL * np.abs( across[ mids ] )[ None, : ], axis=1 )
    return np.where( score[ np.arange( len( Q ) ), best ] >= HALF, across[ mids ][ best ], np.nan )


def survey_rails( ortho, places ):
    """The tracks of the map on their ballast: one record per run of places.json, { pts, bridges } as
    the map has them, moved to where the track runs. A run that says too little (a siding against a
    platform's concrete, a track under trees) goes as the nearest station of a run that was read
    went, and has its bed's colour. `bed` is the colour of the ballast on the bed's shoulders, as the
    pictures have it. Also returns how
    far each run went (median, m) and whether it was read."""
    runs = []
    # ( the bed's two shoulders: nearer the middle lie the sleepers and the rails )
    inside = np.concatenate( [ - np.arange( SHOULDERS, BED / 2, ACROSS ), np.arange( SHOULDERS, BED / 2, ACROSS ) ] )
    for r in places.get( 'rails', [] ):
        Q, at, N = stations( r[ 'pts' ] )
        raw = rail_offsets( ortho, Q, at, N )
        bed = []
        for q, n, o in zip( Q, N, raw ):
            if not np.isfinite( o ): continue
            for d in inside:
                e, nn = q[ 0 ] + n[ 0 ] * ( o + d ), q[ 1 ] + n[ 1 ] * ( o + d )
                px, left, top = ortho.around( e, nn )
                row, col = int( ( top - nn ) / METRE ), int( ( e - left ) / METRE )
                if 0 <= row < px.shape[ 0 ] and 0 <= col < px.shape[ 1 ]: bed.append( px[ row, col ] )
        print( f'    {len( Q )} stations, {np.isfinite( raw ).mean():.2f} of them read; offsets (10 % / median / 90 %) {np.round( np.nanpercentile( raw, [ 10, 50, 90 ] ), 2 ).tolist() if np.isfinite( raw ).any() else None}' )
        read = bool( np.isfinite( raw ).mean() >= HALF )
        off = np.zeros( len( Q ) )
        if read:
            k = max( 1, int( round( RAIL_SMOOTH / 2 / ROAD_STEP ) ) )
            off = np.asarray( [ np.nanmedian( raw[ max( 0, i - k ):i + k + 1 ] ) if np.isfinite( raw[ max( 0, i - k ):i + k + 1 ] ).any() else np.nan for i in range( len( Q ) ) ] )
            off = np.where( np.isfinite( off ), off, np.nanmedian( raw ) )
            # ( a median steps where the stations change their mind: a track does not, so the step is spread over the same length )
            c = np.concatenate( [ [ 0 ], np.cumsum( off ) ] )
            lo, hi = np.maximum( 0, np.arange( len( Q ) ) - k ), np.minimum( len( Q ), np.arange( len( Q ) ) + k + 1 )
            off = ( c[ hi ] - c[ lo ] ) / ( hi - lo )
        runs.append( dict( Q=Q, at=at, moved=N * off[ :, None ], read=read, bed=np.median( np.asarray( bed, dtype=np.float64 ), axis=0 ) if read else None ) )
    known = [ L for L in runs if L[ 'read' ] ]
    if known:
        for L in runs:
            if not L[ 'read' ]: L[ 'bed' ] = known[ 0 ][ 'bed' ]
        KQ, KM = np.concatenate( [ L[ 'Q' ] for L in known ] ), np.concatenate( [ L[ 'moved' ] for L in known ] )
        for L in runs:
            if not L[ 'read' ]: L[ 'moved' ] = np.stack( [ KM[ np.argmin( np.hypot( KQ[ :, 0 ] - q[ 0 ], KQ[ :, 1 ] - q[ 1 ] ) ) ] for q in L[ 'Q' ] ] )
    out, went = [], []
    for r, L in zip( places.get( 'rails', [] ), runs ):
        # each mapped point, and each end of a bridge, goes as the station nearest to it went
        def to( p ):
            m = L[ 'moved' ][ np.argmin( np.hypot( L[ 'Q' ][ :, 0 ] - p[ 0 ], L[ 'Q' ][ :, 1 ] - p[ 1 ] ) ) ]
            return [ round( float( p[ 0 ] + m[ 0 ] ), 2 ), round( float( p[ 1 ] + m[ 1 ] ), 2 ) ]
        out.append( { 'pts': [ to( p ) for p in r[ 'pts' ] ], 'bridges': [ [ to( p ) for p in pair ] for pair in r[ 'bridges' ] ], 'bed': L[ 'bed' ] } )
        went.append( ( float( np.median( np.hypot( L[ 'moved' ][ :, 0 ], L[ 'moved' ][ :, 1 ] ) ) ), [ round( float( v ), 2 ) for v in np.median( L[ 'moved' ], axis=0 ) ], L[ 'read' ] ) )
    return out, went


def asphalt_gain( ortho, roads, cx, cy, km ):
    """The measure of the pictures' brightness: the colour along the middle of the surveyed roads'
    asphalt inside the block, and what brings it to ASPHALT."""
    grey = []
    for r in roads:
        if not r[ 'width' ]: continue
        for e, n in r[ 'pts' ][ 2:- 2:5 ]:
            if abs( e - cx ) > km * 500 or abs( n - cy ) > km * 500 or not ortho.asphalt( e, n ): continue
            px, left, top = ortho.around( e, n )
            grey.append( px[ int( ( top - n ) / METRE ), int( ( e - left ) / METRE ) ] )
    grey = np.median( np.asarray( grey, dtype=np.float64 ), axis=0 )
    return grey, ASPHALT / grey.mean()


def to_game( colour, gain ):
    return None if colour is None else [ int( min( 255, round( v * gain ) ) ) for v in colour ]


def finish_roads( places, lines, went ):
    """Every road of the map where it runs: ( nodes, roads ) as survey.json has them, and how far the
    surveyed ones moved. went( east, north ): where the buildings round a point went, ( east, north )."""
    R = places[ 'roads' ]
    # ---- the nodes: where their surveyed roads' ends put them
    nodes = np.asarray( places[ 'nodes' ], dtype=np.float64 )
    says = [ [] for _ in nodes ]
    for r, L in zip( R, lines ):
        if not L[ 'seen' ]: continue
        says[ r[ 'a' ] ].append( ( L[ 'N' ][ 0 ], L[ 'off' ][ 0 ] ) )
        says[ r[ 'b' ] ].append( ( L[ 'N' ][ - 1 ], L[ 'off' ][ - 1 ] ) )
    moved = np.zeros_like( nodes )
    for i, ends in enumerate( says ):
        if not ends: moved[ i ] = went( *nodes[ i ] ); continue
        M = np.asarray( [ n for n, _ in ends ] ); d = np.asarray( [ o for _, o in ends ] )
        # the least move that puts the node as far to the side of each road as the road says. Roads
        # that leave a node nearly in line say nothing of where it lies along them, and a hair's
        # difference between them would send it far that way: the move is held (DAMP) and, like a
        # road's, never further than ROAD_REACH
        v = np.linalg.solve( M.T @ M + DAMP * len( ends ) * np.eye( 2 ), M.T @ d )
        moved[ i ] = v * min( 1.0, ROAD_REACH / max( np.hypot( *v ), 1e-9 ) )

    # ---- every road bent to its two nodes
    out, by = [], []
    ease = lambda t: 1 - np.clip( t, 0, 1 ) ** 2 * ( 3 - 2 * np.clip( t, 0, 1 ) )
    for r, L in zip( R, lines ):
        P = L[ 'Q' ] + L[ 'N' ] * L[ 'off' ][ :, None ] if L[ 'seen' ] else L[ 'Q' ] + np.asarray( [ went( *q ) for q in L[ 'Q' ] ] )
        length = L[ 'at' ][ - 1 ]
        ca, cb = nodes[ r[ 'a' ] ] + moved[ r[ 'a' ] ] - P[ 0 ], nodes[ r[ 'b' ] ] + moved[ r[ 'b' ] ] - P[ - 1 ]
        reach = min( EASE, length / 2 ) or 1
        P = P + ca[ None, : ] * ease( L[ 'at' ] / reach )[ :, None ] + cb[ None, : ] * ease( ( length - L[ 'at' ] ) / reach )[ :, None ]
        out.append( { 'pts': [ [ round( float( e ), 2 ), round( float( n ), 2 ) ] for e, n in P ], 'width': L[ 'width' ] } )
        if L[ 'seen' ]: by.append( float( np.median( np.abs( L[ 'off' ] ) ) ) )
    return [ [ round( float( e ), 2 ), round( float( n ), 2 ) ] for e, n in nodes + moved ], out, by


def main():

    area = sys.argv[ 1 ] if len( sys.argv ) > 1 else 'bosut'
    out_dir = os.path.join( ROOT, 'public', 'world', area )
    places = json.load( open( os.path.join( out_dir, 'places.json' ), encoding='utf-8' ) )
    km = float( sys.argv[ 2 ].split( ',' )[ 2 ] ) if len( sys.argv ) > 2 else 4
    cx, cy = places[ 'center' ]
    ortho = Ortho( os.path.join( HERE, 'cache', area, 'ortho' ), ( cx - km * 500, cy - km * 500 ) )
    path = os.path.join( out_dir, 'survey.json' )

    # ---- the tracks onto their ballast
    rails, rails_went = survey_rails( ortho, places )
    print( '  tracks: ' + '; '.join( f'{d:.1f} m by {v} ({"read" if read else "with the nearest read"})' for d, v, read in rails_went ), flush=True )
    if sys.argv[ 3: ] == [ 'rails' ]:
        survey = json.load( open( path, encoding='utf-8' ) )
        _, gain = asphalt_gain( ortho, survey[ 'roads' ], cx, cy, km )
        for r in rails: r[ 'bed' ] = to_game( r[ 'bed' ], gain )
        survey[ 'rails' ], survey[ 'gain' ] = rails, round( float( gain ), 3 )
        print( f'  gain {gain:.3f}; beds {[ r[ "bed" ] for r in rails ]}' )
        with open( path, 'w', encoding='utf-8' ) as f: json.dump( survey, f, separators=( ',', ':' ), ensure_ascii=False )
        print( f'{len( rails )} tracks -> {os.path.relpath( path, ROOT )} ({os.path.getsize( path ) >> 10} kB); the rest of the survey as it was' )
        return

    # ---- the paved roads onto their asphalt
    t = time.time()
    lines = survey_roads( ortho, places )
    print( f'  {sum( 1 for L in lines if L[ "seen" ] )} of {len( lines )} roads surveyed ({time.time() - t:.0f} s)', flush=True )
    # their asphalt, for keeping footprints off it: the middle of every surveyed station, and half its width
    tar = np.concatenate( [ L[ 'Q' ] + L[ 'N' ] * L[ 'off' ][ :, None ] for L in lines if L[ 'seen' ] ] )
    tar_half = np.concatenate( [ np.full( len( L[ 'Q' ] ), ( L[ 'width' ] or CARRIAGEWAY ) / 2 ) for L in lines if L[ 'seen' ] ] )
    def on_asphalt( ring ):
        for e, n in ring:
            near = np.abs( tar[ :, 0 ] - e ) < WIDE
            if near.any() and ( np.hypot( tar[ near, 0 ] - e, tar[ near, 1 ] - n ) < tar_half[ near ] ).any(): return True
        return False

    # ---- each footprint onto its roof: alone first, then with its neighbours
    B, t = places[ 'buildings' ], time.time()
    fit = np.stack( [ ortho.fits( b[ 'ring' ] ) for b in B ] )
    print( f'  {len( B )} footprints tried at {len( PLACES )} places each ({time.time() - t:.0f} s)', flush=True )
    # ( places toward the shadow are out of the running )
    fit = np.where( ( PLACES @ np.asarray( SHADOW ) > TOWARD_SHADOW )[ None, : ], 0.0, fit )
    alone = np.argmax( fit - PULL * np.hypot( PLACES[ :, 0 ], PLACES[ :, 1 ] )[ None, : ], axis=1 )
    moved = PLACES[ alone ]
    mapped = np.maximum( fit[ :, MAPPED ], 1e-6 )
    sure = ( fit[ np.arange( len( B ) ), alone ] / mapped >= SURE ) & ( np.abs( moved ).max( axis=1 ) < REACH )
    mid = np.asarray( [ ( sum( p[ 0 ] for p in b[ 'ring' ] ) / len( b[ 'ring' ] ), sum( p[ 1 ] for p in b[ 'ring' ] ) / len( b[ 'ring' ] ) ) for b in B ] )
    found = np.zeros( ( len( B ), 2 ) )
    with_street = 0
    for i in range( len( B ) ):
        if sure[ i ]: found[ i ] = moved[ i ]; continue
        near = sure & ( np.hypot( mid[ :, 0 ] - mid[ i, 0 ], mid[ :, 1 ] - mid[ i, 1 ] ) <= NEAR )
        if near.sum() < 3: continue
        street = np.median( moved[ near ], axis=0 )
        close = np.hypot( PLACES[ :, 0 ] - street[ 0 ], PLACES[ :, 1 ] - street[ 1 ] ) <= WITH
        k = int( np.argmax( np.where( close, fit[ i ], - 1 ) ) )
        if fit[ i, k ] / mapped[ i ] >= LIKELY: found[ i ] = PLACES[ k ]; with_street += 1
    off_asphalt = 0
    for i, b in enumerate( B ):
        if ( found[ i ] != 0 ).any() and on_asphalt( [ ( e + found[ i, 0 ], n + found[ i, 1 ] ) for e, n in b[ 'ring' ] ] ) and not on_asphalt( b[ 'ring' ] ):
            found[ i ] = 0; off_asphalt += 1
    # where the buildings round a point went: the median move of those within NEAR of it
    def went( e, n ):
        near = np.hypot( mid[ :, 0 ] - e, mid[ :, 1 ] - n ) <= NEAR
        return np.median( found[ near ], axis=0 ) if near.sum() >= 3 else np.zeros( 2 )

    # ---- the roof's colour where it was found
    shifts, roofs, t = [], [], time.time()
    for i, b in enumerate( B ):
        de, dn = float( found[ i, 0 ] ), float( found[ i, 1 ] )
        # ( a footprint that stays where it is mapped is not moved for the lean either: whoever traced it
        # right traced its walls )
        shifts.append( [ de, round( dn + LEAN * EAVES_UP, 2 ) ] if de or dn else [ 0, 0 ] )
        ring = Polygon( [ ( e + de, n + dn ) for e, n in b[ 'ring' ] ] )
        inner = ring.buffer( - INSET )
        if inner.is_empty or inner.geom_type != 'Polygon': inner = ring
        px = ortho.inside( list( inner.exterior.coords ) )
        if len( px ) < FEW: roofs.append( None ); continue
        light = px.astype( np.float64 ).sum( axis=1 )
        lo, hi = np.percentile( light, LIT )
        lit = px[ ( light >= lo ) & ( light <= hi ) ].mean( axis=0 )
        # greener than it is red or blue: the crown of a tree, not a roof
        roofs.append( None if lit[ 1 ] > lit[ 0 ] and lit[ 1 ] > lit[ 2 ] else lit )
        if i % 1000 == 999: print( f'  {i + 1} roofs read ({time.time() - t:.0f} s)', flush=True )

    # ---- a road that was set through a building was set on its roof: grey sheet reads as asphalt.
    # It is not surveyed after all, and goes with the buildings beside it like any unsurveyed way.
    from shapely.strtree import STRtree
    from shapely.geometry import Point
    rings = [ Polygon( [ ( e + found[ i, 0 ], n + found[ i, 1 ] ) for e, n in b[ 'ring' ] ] ) for i, b in enumerate( B ) ]
    tree, on_roof = STRtree( rings ), 0
    for L in lines:
        if not L[ 'seen' ]: continue
        P = L[ 'Q' ] + L[ 'N' ] * L[ 'off' ][ :, None ]
        if any( rings[ k ].contains( Point( e, n ) ) for e, n in P[ 1:- 1 ] for k in tree.query( Point( e, n ) ) ):
            L[ 'seen' ], L[ 'width' ], on_roof = False, None, on_roof + 1
            L[ 'off' ] = np.zeros( len( P ) )

    # ---- every road to its nodes, the unsurveyed ones with the buildings beside them
    nodes, roads, by = finish_roads( places, lines, went )
    widths = sorted( r[ 'width' ] for r in roads if r[ 'width' ] )

    # ---- the measure: the middle of the surveyed roads' asphalt
    grey, gain = asphalt_gain( ortho, roads, cx, cy, km )
    out = [ to_game( c, gain ) for c in roofs ]
    for r in rails: r[ 'bed' ] = to_game( r[ 'bed' ], gain )
    source = f'Državna geodetska uprava, orthophoto {LAYER} (geoportal.dgu.hr WMS) at {METRE} m a pixel, read {time.strftime( "%Y-%m-%d" )}'
    with open( path, 'w', encoding='utf-8' ) as f:
        json.dump( { 'source': source, 'shifts': shifts, 'roofs': out, 'nodes': nodes, 'roads': roads, 'rails': rails, 'gain': round( float( gain ), 3 ) }, f, separators=( ',', ':' ), ensure_ascii=False )
    far = sorted( math.hypot( *v ) for v in shifts )
    gone = np.hypot( found[ :, 0 ], found[ :, 1 ] ) > 0
    print( f'footprints: {int( sure.sum() )} of {len( B )} moved on their own evidence, {with_street} with their street, {off_asphalt} kept off the asphalt they were moved onto, {len( B ) - int( gone.sum() )} left where the map has them;'
           f' those moved went {far[ len( far ) - int( gone.sum() ) + int( gone.sum() ) // 2 ]:.1f} m (median), by {np.median( found[ gone, 0 ] ):.1f} m east and {np.median( found[ gone, 1 ] ):.1f} m north (median)' )
    by.sort()
    print( f'{on_roof} roads were set through a building and left to go with their neighbours instead' )
    print( f'roads moved onto their asphalt: {by[ len( by ) // 10 ]:.1f} / {by[ len( by ) // 2 ]:.1f} / {by[ len( by ) * 9 // 10 ]:.1f} m (10 % / median / 90 % of {len( by )} roads);'
           f' asphalt {widths[ len( widths ) // 10 ]:.1f} / {widths[ len( widths ) // 2 ]:.1f} / {widths[ len( widths ) * 9 // 10 ]:.1f} m wide on the {len( widths )} measured' )
    read = [ c for c in out if c ]
    red = sum( 1 for r, g, b in read if r > 1.15 * b and r > g )
    print( f'{len( read )} of {len( out )} roofs read; the roads\' asphalt is {grey.round().tolist()} on the pictures, brought to {ASPHALT} (gain {gain:.2f});'
           f' {red} roofs are red or brown, {len( read ) - red} grey -> {os.path.relpath( path, ROOT )} ({os.path.getsize( path ) >> 10} kB)' )


if __name__ == '__main__':
    main()
