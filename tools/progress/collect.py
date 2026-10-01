"""File the shots of one build step into docs/slavonia/progress/ (see README.md).

Takes the directory the collector wrote the bench's raw BGRA shots into.
"""
import os, sys, re, glob, struct, subprocess
from PIL import Image

ROOT = os.path.abspath( os.path.join( os.path.dirname( __file__ ), '..', '..' ) )
OUT = os.path.join( ROOT, 'docs', 'slavonia', 'progress' )

tmp, stamp, label = sys.argv[ 1:4 ]
slug = re.sub( r'[^a-z0-9]+', '-', label.lower() ).strip( '-' )[ :40 ].strip( '-' )
sha = subprocess.run( [ 'git', 'rev-parse', '--short', 'HEAD' ], cwd=ROOT, capture_output=True, text=True ).stdout.strip()
dirty = subprocess.run( [ 'git', 'status', '--porcelain', '--', 'src', 'public', 'test' ], cwd=ROOT, capture_output=True, text=True ).stdout.strip()
shots = sorted( glob.glob( os.path.join( tmp, '*.bgra' ) ) )
if not shots: sys.exit( 'no shots were collected' )
names = []
for p in shots:
    # <tag>-<view>.bgra, written by the collector: an 8-byte width / height header, then BGRA8 rows
    view = os.path.basename( p )[ :- len( '.bgra' ) ].split( '-' )[ - 1 ]
    raw = open( p, 'rb' ).read()
    w, h = struct.unpack( '<II', raw[ :8 ] )
    im = Image.frombytes( 'RGBA', ( w, h ), raw[ 8: ], 'raw', 'BGRA' ).convert( 'RGB' )
    os.makedirs( os.path.join( OUT, view ), exist_ok=True )
    name = f'{stamp}_{slug}.jpg'
    im.save( os.path.join( OUT, view, name ), quality=86 )
    names.append( ( view, name ) )
readme = os.path.join( OUT, 'README.md' )
if not os.path.exists( readme ):
    open( readme, 'w' ).write( '''# Progress timelapse

Every build step is captured from the same fixed views (`src/regions/slavonia/views.js`), in the real
game on a GPU, one folder per view (see README.md for the three steps). `python3 tools/progress/timelapse.py` plays a
view's series back as an animated GIF.

| Step (UTC) | Build | What changed | Views |
|---|---|---|---|
''' )
links = ' · '.join( f'[{v}]({v}/{n})' for v, n in names )
open( readme, 'a' ).write( f'| {stamp.replace( "_", " " )} | `{sha}{"+" if dirty else ""}` | {label} | {links} |\n' )
print( f'filed {len( names )} views as {stamp}_{slug}' )
