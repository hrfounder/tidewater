"""Rectangles read off a turned survey sheet, as records of Survey.js ADDED.

    python3 tools/geodata/trace.py bosut <x>,<z> <turn> <u0>,<u1>,<v0>,<v1>[,<own turn>] ...

( x, z ) and `turn` are the sheet's (sheet.py with a turn: its middle, and the direction that runs
to the right on it, degrees from east toward south). Each rectangle is what was read off its grid:
from u0 to u1 across the sheet and from v0 to v1 down it, in metres from the middle. One that does not
lie along the sheet's axes is given by its own middle ( u0 = u1, v0 = v1 are not allowed: give
<u>,<v>,<length>,<width>,<own turn> instead, the turn in the game's frame ).

Prints, for each, the record: its middle in the game's metres, its size, its turn, and the colour
of its roof as the orthophoto has it, read inside the rectangle the way survey.py reads a roof (the
lit share of it, INSET metres in from its edges).
"""
import os, sys, json, math
import numpy as np
import survey as S


def main():

    area = sys.argv[ 1 ]
    x, z = ( float( v ) for v in sys.argv[ 2 ].split( ',' ) )
    turn = float( sys.argv[ 3 ] )
    places = json.load( open( os.path.join( S.ROOT, 'public', 'world', area, 'places.json' ), encoding='utf-8' ) )
    cx, cy = places[ 'center' ]
    ortho = S.Ortho( os.path.join( S.HERE, 'cache', area, 'ortho' ), ( cx - 2000, cy - 2000 ) )
    t = math.radians( turn )
    U, V = ( math.cos( t ), math.sin( t ) ), ( - math.sin( t ), math.cos( t ) )
    for arg in sys.argv[ 4: ]:
        v = [ float( n ) for n in arg.split( ',' ) ]
        if len( v ) == 4:
            u0, u1, v0, v1 = v
            uc, vc, size, own = ( u0 + u1 ) / 2, ( v0 + v1 ) / 2, ( u1 - u0, v1 - v0 ), turn
        else:
            uc, vc, size, own = v[ 0 ], v[ 1 ], ( v[ 2 ], v[ 3 ] ), v[ 4 ]
        at = ( x + uc * U[ 0 ] + vc * V[ 0 ], z + uc * U[ 1 ] + vc * V[ 1 ] )
        o = math.radians( own )
        a, b = ( math.cos( o ), math.sin( o ) ), ( - math.sin( o ), math.cos( o ) )
        ring = [ ( cx + at[ 0 ] + i * ( size[ 0 ] / 2 - S.INSET ) * a[ 0 ] + j * ( size[ 1 ] / 2 - S.INSET ) * b[ 0 ],
                   cy - ( at[ 1 ] + i * ( size[ 0 ] / 2 - S.INSET ) * a[ 1 ] + j * ( size[ 1 ] / 2 - S.INSET ) * b[ 1 ] ) ) for i, j in ( ( - 1, - 1 ), ( 1, - 1 ), ( 1, 1 ), ( - 1, 1 ) ) ]
        px = ortho.inside( ring ).astype( np.float64 )
        light = px.sum( axis=1 )
        lo, hi = np.percentile( light, S.LIT )
        lit = px[ ( light >= lo ) & ( light <= hi ) ].mean( axis=0 )
        num = lambda n: f'- {abs( n ):.1f}' if n < 0 else f'{n:.1f}'
        print( f"\t{{ at: [ {num( at[ 0 ] )}, {num( at[ 1 ] )} ], size: [ {size[ 0 ]:.1f}, {size[ 1 ]:.1f} ], turn: {num( own )}, roof: [ {', '.join( str( int( round( c ) ) ) for c in lit )} ], source: '' }}," )


if __name__ == '__main__':
    main()
