"""The orthophoto and the game from straight above, side by side, over the same square: the critic's
first look at an area (roads, pavements, where each house stands and how big it is).

    python3 tools/geodata/topdown.py NAME X,Z [HALF]   -> F:/tidewater-data/shots/top-NAME.jpg
        X, Z: the square's middle in the patch's metres; HALF: half its side (m, default 30)

Left the orthophoto with the map's footprints (sheet.py), right the game rendered from above
(test/world-slavonia.mjs --look) with the same field: the camera stands HEIGHT over the middle,
with a vertical view of FOV degrees.
"""
import math, os, subprocess, sys
from PIL import Image

HERE = os.path.dirname( os.path.abspath( __file__ ) )
ROOT = os.path.dirname( os.path.dirname( HERE ) )
SHOTS = 'F:/tidewater-data/shots'
FOV = 33.4                     # the game camera's vertical view (degrees)
SIDE = 900                     # each half of the picture (pixels)


def main():
	name = sys.argv[ 1 ]; x, z = ( float( v ) for v in sys.argv[ 2 ].split( ',' ) )
	half = float( sys.argv[ 3 ] ) if len( sys.argv ) > 3 else 30.0
	ortho = os.path.join( SHOTS, f'top-{name}-o.jpg' )
	subprocess.run( [ sys.executable, os.path.join( HERE, 'sheet.py' ), 'bosut', f'{x},{z}', str( half ), ortho, str( 2 * half / 1000 ) ], check=True, capture_output=True )
	height = half / math.tan( math.radians( FOV / 2 ) )
	subprocess.run( [ 'node', os.path.join( ROOT, 'test', 'world-slavonia.mjs' ), os.path.join( SHOTS, 'head' ),
		f'--look=top{name}:{x},{height:.1f},{z + 0.05}:{x},0,{z}:{FOV}' ], check=True, capture_output=True, cwd=ROOT )
	a = Image.open( ortho ).convert( 'RGB' ).resize( ( SIDE, SIDE ) )
	b = Image.open( os.path.join( SHOTS, 'head', f'look-top{name}.png' ) ).convert( 'RGB' )
	w, h = b.size; b = b.crop( ( ( w - h ) // 2, 0, ( w + h ) // 2, h ) ).resize( ( SIDE, SIDE ) )
	out = Image.new( 'RGB', ( 2 * SIDE, SIDE ) ); out.paste( a, ( 0, 0 ) ); out.paste( b, ( SIDE, 0 ) )
	path = os.path.join( SHOTS, f'top-{name}.jpg' ); out.save( path, quality=88 ); print( '->', path )


if __name__ == '__main__':
	main()
