"""File the shots of one build step into docs/slavonia/progress/ (see shoot.sh)."""
import os, sys, re, glob, subprocess
from PIL import Image

ROOT = os.path.abspath( os.path.join( os.path.dirname( __file__ ), '..', '..' ) )
OUT = os.path.join( ROOT, 'docs', 'slavonia', 'progress' )

tmp, stamp, label = sys.argv[ 1:4 ]
slug = re.sub( r'[^a-z0-9]+', '-', label.lower() ).strip( '-' )[ :40 ].strip( '-' )
sha = subprocess.run( [ 'git', 'rev-parse', '--short', 'HEAD' ], cwd=ROOT, capture_output=True, text=True ).stdout.strip()
dirty = subprocess.run( [ 'git', 'status', '--porcelain', '--', 'src', 'public', 'test' ], cwd=ROOT, capture_output=True, text=True ).stdout.strip()
shots = sorted( glob.glob( os.path.join( tmp, 'slavonia-terrain-*.png' ) ) )
if not shots: sys.exit( 'no shots were rendered' )
names = []
for p in shots:
    view = os.path.basename( p )[ len( 'slavonia-terrain-' ): - 4 ]
    os.makedirs( os.path.join( OUT, view ), exist_ok=True )
    name = f'{stamp}_{slug}.jpg'
    Image.open( p ).convert( 'RGB' ).save( os.path.join( OUT, view, name ), quality=86 )
    names.append( ( view, name ) )
readme = os.path.join( OUT, 'README.md' )
if not os.path.exists( readme ):
    open( readme, 'w' ).write( '''# Progress timelapse

Every build step is captured from the same fixed views (`src/regions/slavonia/views.js`) with
`tools/progress/shoot.sh "label"`, one folder per view. `python3 tools/progress/timelapse.py` plays a
view's series back as an animated GIF.

| Step (UTC) | Build | What changed | Views |
|---|---|---|---|
''' )
links = ' · '.join( f'[{v}]({v}/{n})' for v, n in names )
open( readme, 'a' ).write( f'| {stamp.replace( "_", " " )} | `{sha}{"+" if dirty else ""}` | {label} | {links} |\n' )
print( f'filed {len( names )} views as {stamp}_{slug}' )
