"""Play a progress view's series back as an animated GIF (not committed: regenerate any time).

    python3 tools/progress/timelapse.py [view ...] [--out DIR] [--ms 900]

Every frame is captioned with the step's date and label (from the file name).
"""
import os, sys, glob
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath( os.path.join( os.path.dirname( __file__ ), '..', '..' ) )
SRC = os.path.join( ROOT, 'docs', 'slavonia', 'progress' )
args = sys.argv[ 1: ]
out = args[ args.index( '--out' ) + 1 ] if '--out' in args else os.path.join( ROOT, 'tools', 'progress', 'out' )
ms = int( args[ args.index( '--ms' ) + 1 ] ) if '--ms' in args else 900
views = [ a for i, a in enumerate( args ) if not a.startswith( '--' ) and ( i == 0 or args[ i - 1 ] not in ( '--out', '--ms' ) ) ]
views = views or sorted( d for d in os.listdir( SRC ) if os.path.isdir( os.path.join( SRC, d ) ) )
os.makedirs( out, exist_ok=True )
try: font = ImageFont.truetype( '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18 )
except OSError: font = ImageFont.load_default()
for view in views:
    frames = []
    for p in sorted( glob.glob( os.path.join( SRC, view, '*.jpg' ) ) ):
        im = Image.open( p ).convert( 'RGB' )
        stem = os.path.basename( p )[ :- 4 ]
        date, _, label = stem[ :15 ].replace( '_', ' ' ), None, stem[ 16: ].replace( '-', ' ' )
        ImageDraw.Draw( im ).text( ( 12, im.height - 12 ), f'{date}  {label}', fill=( 255, 255, 255 ), font=font, anchor='ls', stroke_width=2, stroke_fill=( 0, 0, 0 ) )
        frames.append( im )
    if not frames: continue
    path = os.path.join( out, f'{view}.gif' )
    frames[ 0 ].save( path, save_all=True, append_images=frames[ 1: ] + [ frames[ - 1 ] ] * 2, duration=ms, loop=0 )
    print( f'{view}: {len( frames )} steps -> {path}' )
