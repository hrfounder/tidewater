"""A street of the game straightened out on the state orthophoto, for reading what lies beside it by
eye: its pavements, its rows of parking, the aprons before the gates (Survey.js BESIDE).

    node tools/geodata/plan.mjs                         (the game's roads: cache/<area>/plan.json)
    python3 tools/geodata/unroll.py "Vinkovačka ulica"            -> F:/tidewater-data/shots/unroll-<n>.jpg
    python3 tools/geodata/unroll.py "Vinkovačka ulica" 200,500    (only from 200 to 500 m along it)
    python3 tools/geodata/unroll.py "Vinkovačka ulica" at 210,262,L,0,1.6 300,340,R,0,6,asphalt ...
                                         (strips read off the sheets: from 210 to 262 m along, on the
                                          left, 0 to 1.6 m out from the carriageway, paving unless
                                          said -> their BESIDE entries, a paving one with its colour)
        ... add the word push: also the Survey.js MOVED records that set the footprints standing over
        those strips back behind them
    python3 tools/geodata/unroll.py "Vinkovačka ulica" move 1830:1.6 ...
                                         (footprint 1830 of plan.json set 1.6 m further from the
                                          street, onto its roof -> its Survey.js MOVED record)

The street is its stretches of that name chained end to end, and is laid out left to right in the
order they chain, a panel of PANEL metres to a row. Across it, up is its left (looking along it), and
the scale is the carriageway's middle at 0, a tick every metre in the margin and a dotted line every
five; the
carriageway's edges are drawn yellow, what was surveyed by eye already outlined white and the
game's footprints red. Along it,
a mark every ten metres with the distance.
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from shapely.geometry import LineString, Point, Polygon

import survey as S

PANEL = 50.0                 # metres of the street to a row of the sheet
HALF = 16.0                  # metres shown each side of the middle
PX = 0.05                    # metres to a pixel of the sheet
LIT = ( 60, 90 )             # the percentiles of brightness between which a strip's colour is taken
PIECE = 50.0                 # a strip is written in pieces no longer than this (m)
AWAY = 0.1                   # a footprint pushed back from a pavement stands this far behind it (m)
MOST = 4.0                   # no footprint is pushed further than this: more is a different fault (m)
CHAIN = 3.0                  # stretches whose ends lie within this of each other chain (m)


def chain( roads ):
    """The stretches of a street as one line: ( points, the half width at each point )."""
    left = [ ( [ p[ :2 ] for p in r[ 'pts' ] ], r[ 'half' ] ) for r in roads ]
    # start from an end no other stretch meets
    def meets( q, skip ): return any( math.dist( q, e ) < CHAIN for k, ( pts, _ ) in enumerate( left ) if k != skip for e in ( pts[ 0 ], pts[ - 1 ] ) )
    first = next( ( k for k, ( pts, _ ) in enumerate( left ) if not meets( pts[ 0 ], k ) or not meets( pts[ - 1 ], k ) ), 0 )
    pts, h = left.pop( first )
    if meets( pts[ 0 ], - 1 ) and not meets( pts[ - 1 ], - 1 ): pts = pts[ ::- 1 ]
    line, half = list( pts ), [ h ] * len( pts )
    while left:
        end = line[ - 1 ]
        k = min( range( len( left ) ), key=lambda k: min( math.dist( end, left[ k ][ 0 ][ 0 ] ), math.dist( end, left[ k ][ 0 ][ - 1 ] ) ) )
        pts, h = left[ k ]
        if min( math.dist( end, pts[ 0 ] ), math.dist( end, pts[ - 1 ] ) ) > CHAIN: break
        left.pop( k )
        if math.dist( end, pts[ - 1 ] ) < math.dist( end, pts[ 0 ] ): pts = pts[ ::- 1 ]
        line += pts[ 1: ]; half += [ h ] * ( len( pts ) - 1 )
    if left: print( f'  ({len( left )} stretches of it do not chain on: left out)' )
    return line, half


class Street:

    def __init__( self, plan, name ):
        roads = [ r for r in plan[ 'roads' ] if r[ 'name' ] == name and r[ 'paved' ] ]
        if not roads: raise SystemExit( f'no paved road called {name}' )
        pts, half = chain( roads )
        self.line = LineString( pts )
        self.half = np.asarray( half ); self.at = np.asarray( [ self.line.project( Point( p ) ) for p in pts ] )

    def frame( self, s ):
        """( point, left normal ) at s along the street; x east, z south: looking along t, the left is
        ( t_z, -t_x )."""
        a, b = self.line.interpolate( max( 0, s - 0.5 ) ).coords[ 0 ], self.line.interpolate( min( self.line.length, s + 0.5 ) ).coords[ 0 ]
        t = np.subtract( b, a ); t /= max( np.hypot( *t ), 1e-9 )
        return np.asarray( self.line.interpolate( s ).coords[ 0 ] ), np.asarray( [ t[ 1 ], - t[ 0 ] ] )

    def half_at( self, s ): return float( np.interp( s, self.at, self.half ) )

    def place( self, x, z ):
        """( s, how far left of the middle ) of a point."""
        s = self.line.project( Point( x, z ) )
        p, n = self.frame( s )
        return s, float( np.dot( np.subtract( ( x, z ), p ), n ) )


def sample( ortho, cx, cy, X, Z ):
    """The picture's colour at points of the patch (nearest pixel), each read from whichever grid of
    pictures has it furthest from a picture's middle (where the server writes its mark)."""
    flatE, flatN = ( cx + X ).ravel(), ( cy - Z ).ravel()
    best = np.full( flatE.shape, - 1.0 ); res = np.zeros( ( len( flatE ), 3 ), np.uint8 )
    for shift in ( 0, S.TILE / 2 ):
        e0 = ortho.origin[ 0 ] - shift + np.floor( ( flatE - ortho.origin[ 0 ] + shift ) / S.TILE ) * S.TILE
        n0 = ortho.origin[ 1 ] - shift + np.floor( ( flatN - ortho.origin[ 1 ] + shift ) / S.TILE ) * S.TILE
        off = np.maximum( np.abs( flatE - e0 - S.TILE / 2 ), np.abs( flatN - n0 - S.TILE / 2 ) )
        for key in set( zip( e0.tolist(), n0.tolist() ) ):
            sel = ( e0 == key[ 0 ] ) & ( n0 == key[ 1 ] ) & ( off > best )
            if not sel.any(): continue
            px = S.tile( ortho.cache, *key )
            col = np.clip( ( ( flatE[ sel ] - key[ 0 ] + S.MARGIN ) / S.METRE ).astype( int ), 0, px.shape[ 1 ] - 1 )
            row = np.clip( ( ( key[ 1 ] + S.TILE + S.MARGIN - flatN[ sel ] ) / S.METRE ).astype( int ), 0, px.shape[ 0 ] - 1 )
            res[ sel ] = px[ row, col ]; best[ sel ] = off[ sel ]
    return res.reshape( X.shape + ( 3, ) )


def sheet( street, plan, ortho, cx, cy, s0, s1, path ):
    w, h = int( PANEL / PX ), int( 2 * HALF / PX )
    rows = max( 1, math.ceil( ( s1 - s0 ) / PANEL ) )
    img = Image.new( 'RGB', ( w + 60, rows * ( h + 24 ) ), ( 30, 30, 30 ) )
    d = ImageDraw.Draw( img )
    try: font = ImageFont.truetype( 'arial.ttf', 15 )
    except OSError: font = ImageFont.load_default()
    across = HALF - ( np.arange( h ) + 0.5 ) * PX            # left of the middle, top row first
    # the outlines in the street's frame, a point every quarter metre along their sides (a straight
    # side is not straight there where the street bends)
    def unrolled( ring ):
        line = LineString( list( ring ) + [ ring[ 0 ] ] )
        return [ street.place( *line.interpolate( t ).coords[ 0 ] ) for t in np.arange( 0, line.length + 0.125, 0.25 ) ]
    surveyed = [ unrolled( ring ) for ring in plan[ 'surveyed' ] if LineString( ring ).distance( street.line ) < HALF ]
    buildings = [ unrolled( ring ) for ring in plan[ 'buildings' ] if len( ring ) > 1 and LineString( ring ).distance( street.line ) < HALF ]
    for k in range( rows ):
        a = s0 + k * PANEL
        s = a + ( np.arange( w ) + 0.5 ) * PX
        s = np.minimum( s, street.line.length )
        F = [ street.frame( v ) for v in s ]
        P = np.asarray( [ f[ 0 ] for f in F ] ); Nn = np.asarray( [ f[ 1 ] for f in F ] )
        X = P[ None, :, 0 ] + Nn[ None, :, 0 ] * across[ :, None ]; Z = P[ None, :, 1 ] + Nn[ None, :, 1 ] * across[ :, None ]
        top = k * ( h + 24 )
        panel = Image.fromarray( sample( ortho, cx, cy, X, Z ) )
        # ( the outlines on the panel alone: what lies past its edges is cut off there )
        dp = ImageDraw.Draw( panel )
        for rings, colour in ( ( surveyed, ( 255, 255, 255 ) ), ( buildings, ( 255, 40, 40 ) ) ):
            for ring in rings:
                run = []
                for q in ring + [ None ]:
                    if q is not None and a - 1 <= q[ 0 ] <= a + PANEL + 1 and abs( q[ 1 ] ) <= HALF + 1: run.append( ( ( q[ 0 ] - a ) / PX, ( HALF - q[ 1 ] ) / PX ) ); continue
                    if len( run ) > 1: dp.line( run, fill=colour, width=3 )
                    run = []
        img.paste( panel, ( 60, top ) )
        y = lambda o: top + ( HALF - o ) / PX
        xs = lambda v: 60 + ( v - a ) / PX
        for o in range( - int( HALF ), int( HALF ) + 1 ):
            d.line( [ ( 46 if o % 5 else 36, y( o ) ), ( 60, y( o ) ) ], fill=( 255, 255, 255 ), width=1 )
            if o % 5 == 0:
                d.line( [ ( 60 + x, y( o ) ) for x in range( 0, w, 8 ) ][ :1 ] + [ ( 60 + w, y( o ) ) ], fill=( 255, 255, 255 ), width=1 ) if o == 0 else [ d.line( [ ( 60 + x, y( o ) ), ( 60 + x + 3, y( o ) ) ], fill=( 255, 255, 255 ), width=1 ) for x in range( 0, w, 8 ) ]
                d.text( ( 2, y( o ) - 8 ), f'{o:+d}', fill=( 255, 255, 255 ), font=font )
        for v in np.arange( math.ceil( a / 10 ) * 10, a + PANEL + 1e-6, 10 ):
            for yy in range( 0, h, 8 ): d.line( [ ( xs( v ), top + yy ), ( xs( v ), top + yy + 3 ) ], fill=( 255, 255, 255 ), width=1 )
            d.text( ( xs( v ) + 2, top + h + 3 ), f'{v:.0f}', fill=( 255, 255, 255 ), font=font )
        for sign in ( - 1, 1 ):
            d.line( [ ( xs( v ), y( sign * street.half_at( v ) ) ) for v in np.linspace( a, min( a + PANEL, street.line.length ), 50 ) ], fill=( 255, 230, 0 ), width=2 )
    img.save( path, quality=90 )
    print( '->', path )


def entry( street, name, s0, s1, side, o0, o1, of, colour ):
    """A strip read off the sheets as Survey.js BESIDE has it: its ends beside the road, at its middle."""
    mid = lambda s: street.frame( s )[ 0 ] + street.frame( s )[ 1 ] * ( 1 if side == 'L' else - 1 ) * ( street.half_at( s ) + ( o0 + o1 ) / 2 )
    a, b = mid( s0 ), mid( s1 )
    paint = f', colour: [ {", ".join( str( v ) for v in colour )} ]' if colour else ''
    return f"{{ along: '{name}', from: [ {a[ 0 ]:.1f}, {a[ 1 ]:.1f} ], to: [ {b[ 0 ]:.1f}, {b[ 1 ]:.1f} ], out: [ {o0:g}, {o1:g} ], of: '{of}'{paint}, source: 'unrolled {name} {s0:.0f}-{s1:.0f}' }},"


def behind( street, plan, s0, s1, side, outer, moved ):
    """The footprints that reach over a strip ( s0..s1 on `side`, out to `outer` from the carriageway ):
    for each, how far it goes back from the street to stand behind it, by AWAY more (no house stands on
    the pavement; a footprint there is the map's or the survey's error). Into `moved`: index ->
    ( metres, a point inside it, the way away from the street, s )."""
    sign = 1 if side == 'L' else - 1
    for i, ring in enumerate( plan[ 'buildings' ] ):
        if len( ring ) < 3: continue
        reach = 0.0; at = None
        # ( the corners of its outline and of the rectangles the game builds it from )
        for x, z in ring + [ c for piece in plan.get( 'pieces', [ [] ] * len( plan[ 'buildings' ] ) )[ i ] for c in piece ]:
            v, o = street.place( x, z )
            if not s0 - 1 <= v <= s1 + 1 or o * sign <= 0: continue
            need = street.half_at( v ) + outer + AWAY - o * sign
            if need > reach: reach, at = need, v
        if at is None or reach <= 0 or reach > MOST: continue
        n = street.frame( at )[ 1 ] * sign
        point = Polygon( ring ).representative_point().coords[ 0 ]
        if i not in moved or moved[ i ][ 0 ] < reach: moved[ i ] = ( round( reach, 2 ), point, n, at )


def colour_of( street, ortho, cx, cy, gain, s0, s1, side, o0, o1 ):
    """The median colour of a strip's ground on the pictures, at the game's brightness (survey.py)."""
    sign = 1 if side == 'L' else - 1
    S_ = np.arange( s0, s1, 0.5 ); O = np.arange( o0 + 0.15, o1 - 0.1, 0.25 )
    F = [ street.frame( v ) for v in S_ ]
    X = np.asarray( [ [ f[ 0 ][ 0 ] + sign * f[ 1 ][ 0 ] * ( street.half_at( v ) + o ) for o in O ] for f, v in zip( F, S_ ) ] )
    Z = np.asarray( [ [ f[ 0 ][ 1 ] + sign * f[ 1 ][ 1 ] * ( street.half_at( v ) + o ) for o in O ] for f, v in zip( F, S_ ) ] )
    px = sample( ortho, cx, cy, X, Z ).reshape( - 1, 3 ).astype( float )
    # ( what stands on it or shades it, a car, a tree's crown, a house's shadow, is not its ground: its
    # lit part, as survey.py reads a roof )
    v = px.mean( axis=1 ); lo, hi = np.percentile( v, LIT )
    return S.to_game( np.median( px[ ( v >= lo ) & ( v <= hi ) ], axis=0 ), gain )


def main():
    name = sys.argv[ 1 ]
    plan = json.load( open( os.path.join( S.HERE, 'cache', 'bosut', 'plan.json' ), encoding='utf-8' ) )
    cx, cy = plan[ 'center' ]
    street = Street( plan, name )
    ortho = S.Ortho( os.path.join( S.HERE, 'cache', 'bosut', 'ortho' ), ( cx - 2000, cy - 2000 ) )
    if sys.argv[ 2:3 ] == [ 'at' ]:
        # one strip a word: s0,s1,side,o0,o1[,of]
        gain = json.load( open( os.path.join( S.ROOT, 'public', 'world', 'bosut', 'survey.json' ), encoding='utf-8' ) )[ 'gain' ]
        push = 'push' in sys.argv[ 3: ]
        moved = {}
        for word in sys.argv[ 3: ]:
            if word == 'push': continue
            f = word.split( ',' )
            s0, s1, o0, o1, side, of = float( f[ 0 ] ), float( f[ 1 ] ), float( f[ 3 ] ), float( f[ 4 ] ), f[ 2 ], f[ 5 ] if len( f ) > 5 else 'paving'
            c = colour_of( street, ortho, cx, cy, gain, s0, s1, side, o0, o1 ) if of == 'paving' else None
            # ( in pieces: site/Beside.js takes the side of a strip from the middle of its two ends,
            # which on a long strip round a bend could lie across the road )
            n = max( 1, math.ceil( ( s1 - s0 ) / PIECE ) )
            for k in range( n ): print( '	' + entry( street, name, s0 + ( s1 - s0 ) * k / n, s0 + ( s1 - s0 ) * ( k + 1 ) / n, side, o0, o1, of, c ) )
            if push: behind( street, plan, s0, s1, side, o1, moved )
        for i, ( d, point, normal, s ) in sorted( moved.items() ):
            print( f"	{{ at: [ {point[ 0 ]:.1f}, {point[ 1 ]:.1f} ], by: [ {normal[ 0 ] * d:.2f}, {normal[ 1 ] * d:.2f} ], source: 'unrolled {name} at {s:.0f}: behind its pavement' }}," )
        return
    if sys.argv[ 2:3 ] == [ 'move' ]:
        # one footprint a word: its index in plan.json, and how far it goes away from the street (m)
        for word in sys.argv[ 3: ]:
            i, d = word.split( ':' )
            ring = plan[ 'buildings' ][ int( i ) ]
            # ( a point inside it: an L's centroid may lie outside )
            mx, mz = Polygon( ring ).representative_point().coords[ 0 ]
            v, o = street.place( mx, mz )
            n = street.frame( v )[ 1 ] * ( 1 if o > 0 else - 1 ) * float( d )
            print( f"	{{ at: [ {mx:.1f}, {mz:.1f} ], by: [ {n[ 0 ]:.1f}, {n[ 1 ]:.1f} ], source: 'unrolled {name} at {v:.0f}' }}," )
        return
    s0, s1 = ( float( v ) for v in sys.argv[ 2 ].split( ',' ) ) if len( sys.argv ) > 2 else ( 0.0, street.line.length )
    print( f'{name}: {street.line.length:.0f} m, from {np.round( street.line.coords[ 0 ], 1 ).tolist()} to {np.round( street.line.coords[ - 1 ], 1 ).tolist()}' )
    k = 0
    for a in np.arange( s0, s1, 3 * PANEL ):
        sheet( street, plan, ortho, cx, cy, a, min( s1, a + 3 * PANEL ), f'F:/tidewater-data/shots/unroll-{k}.jpg' ); k += 1


if __name__ == '__main__':
    main()
