"""A survey sheet: the orthophoto of a square of the block with the map drawn over it, for looking at
what really stands there building by building.

    python3 tools/geodata/sheet.py bosut <x>,<z> <half side, m> <out.jpg> [metres per pixel]

( x, z ) is the square's middle in the game's metres (east and south of the block's centre). The
mapped footprints are outlined (thin, blue) and numbered with their index in places.json, each again
where the survey moved it to (survey.json, if there is one: thick, yellow-green), the mapped roads
drawn as their centrelines (thin, yellow) and the surveyed ones as their middle and their two edges
(orange), and a grid of 10 m ticks runs along the edges with the game's coordinates.

The orthophoto is the State Geodetic Administration's (see survey.py). The service stamps its mark
across the middle of every picture, so the square is asked for as one quarter of a picture four
times its size, and the sheet is that quarter. Sheets are working material: they are written
outside the repository and are not shipped.
"""
import os, sys, json, io, urllib.request
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname( os.path.abspath( __file__ ) )
ROOT = os.path.abspath( os.path.join( HERE, '..', '..' ) )
WMS = 'https://geoportal.dgu.hr/services/dof/wms'
LAYER = 'DOF_LIDAR_2022_2023'


def main():

    area = sys.argv[ 1 ]
    x, z = ( float( v ) for v in sys.argv[ 2 ].split( ',' ) )
    half = float( sys.argv[ 3 ] )
    out = sys.argv[ 4 ]
    metre = float( sys.argv[ 5 ] ) if len( sys.argv ) > 5 else 0.1
    places = json.load( open( os.path.join( ROOT, 'public', 'world', area, 'places.json' ), encoding='utf-8' ) )
    cE, cN = places[ 'center' ]
    survey = os.path.join( ROOT, 'public', 'world', area, 'survey.json' )
    survey = json.load( open( survey, encoding='utf-8' ) ) if os.path.exists( survey ) else {}
    shifts = survey.get( 'shifts' )
    e0, n1 = cE + x - half, cN - z + half             # the sheet's west edge and its north edge
    side = round( 2 * half / metre )
    # the picture asked for: the sheet is its north-west quarter
    url = ( f'{WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS={LAYER}&STYLES=&CRS=EPSG:3765'
            f'&BBOX={e0},{n1 - 4 * half},{e0 + 4 * half},{n1}&WIDTH={2 * side}&HEIGHT={2 * side}&FORMAT=image/jpeg' )
    with urllib.request.urlopen( url, timeout=120 ) as r: data = r.read()
    im = Image.open( io.BytesIO( data ) ).convert( 'RGB' ).crop( ( 0, 0, side, side ) )
    d = ImageDraw.Draw( im )
    px = lambda e, n: ( ( e - e0 ) / metre, ( n1 - n ) / metre )
    try: font = ImageFont.truetype( 'arial.ttf', max( 12, round( 1.6 / metre ) ) )
    except OSError: font = ImageFont.load_default()
    for r in places[ 'roads' ]:
        pts = [ px( e, n ) for e, n in r[ 'pts' ] ]
        if any( 0 <= p[ 0 ] < side and 0 <= p[ 1 ] < side for p in pts ): d.line( pts, fill=( 255, 235, 60 ), width=1 if survey else 2 )
    for r in survey.get( 'roads', [] ):
        P = r[ 'pts' ]
        if not any( 0 <= px( e, n )[ 0 ] < side and 0 <= px( e, n )[ 1 ] < side for e, n in P ): continue
        d.line( [ px( e, n ) for e, n in P ], fill=( 255, 140, 0 ), width=3 )
        if not r[ 'width' ]: continue
        for sign in ( - 1, 1 ):
            edge = []
            for k, ( e, n ) in enumerate( P ):
                a, b = P[ max( 0, k - 1 ) ], P[ min( len( P ) - 1, k + 1 ) ]
                l = ( ( b[ 0 ] - a[ 0 ] ) ** 2 + ( b[ 1 ] - a[ 1 ] ) ** 2 ) ** 0.5 or 1
                edge.append( px( e + sign * ( b[ 1 ] - a[ 1 ] ) / l * r[ 'width' ] / 2, n - sign * ( b[ 0 ] - a[ 0 ] ) / l * r[ 'width' ] / 2 ) )
            d.line( edge, fill=( 255, 140, 0 ), width=1 )
    for i, b in enumerate( places[ 'buildings' ] ):
        pts = [ px( e, n ) for e, n in b[ 'ring' ] ]
        if not any( 0 <= p[ 0 ] < side and 0 <= p[ 1 ] < side for p in pts ): continue
        d.line( pts, fill=( 60, 200, 255 ), width=1 if shifts else 2 )
        if shifts: d.line( [ px( e + shifts[ i ][ 0 ], n + shifts[ i ][ 1 ] ) for e, n in b[ 'ring' ] ], fill=( 200, 255, 60 ), width=3 )
        cx, cy = sum( p[ 0 ] for p in pts[ :- 1 ] ) / ( len( pts ) - 1 ), sum( p[ 1 ] for p in pts[ :- 1 ] ) / ( len( pts ) - 1 )
        label = str( i )
        box = d.textbbox( ( cx, cy ), label, font=font, anchor='mm' )
        d.rectangle( box, fill=( 0, 0, 0 ) )
        d.text( ( cx, cy ), label, fill=( 255, 255, 255 ), font=font, anchor='mm' )
    # ticks every 10 m along the top and the left, labelled every 50 with the game's x and z
    first = lambda v: int( -( - v // 10 ) * 10 )
    for gx in range( first( x - half ), int( x + half ) + 1, 10 ):
        p = ( gx - ( x - half ) ) / metre
        d.line( [ ( p, 0 ), ( p, 14 if gx % 50 else 30 ) ], fill=( 255, 255, 255 ), width=2 )
        if gx % 50 == 0: d.text( ( p + 4, 16 ), f'x {gx}', fill=( 255, 255, 255 ), font=font )
    for gz in range( first( z - half ), int( z + half ) + 1, 10 ):
        p = ( gz - ( z - half ) ) / metre
        d.line( [ ( 0, p ), ( 14 if gz % 50 else 30, p ) ], fill=( 255, 255, 255 ), width=2 )
        if gz % 50 == 0: d.text( ( 34, p + 2 ), f'z {gz}', fill=( 255, 255, 255 ), font=font )
    os.makedirs( os.path.dirname( os.path.abspath( out ) ), exist_ok=True )
    im.save( out, quality=92 )
    print( f'{side} px square, {metre} m a pixel, middle {x},{z} -> {out}' )


if __name__ == '__main__':
    main()
