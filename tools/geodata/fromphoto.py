"""The critic's street view: each photo beside the game rendered from where it was taken.

    python3 tools/geodata/fromphoto.py NAME DIR N [N ...]    -> F:/tidewater-data/shots/critic-NAME.jpg
        DIR: a folder terraframe.py fetched (its shots.json); N: the photos' numbers there

The game camera stands at the photo's GPS position, EYE over the ground, looking along its heading
and pitch, with a view of FOV degrees across. Compass headings are good to about ten degrees, so the
two pictures are framed alike, not the same: compare what stands where and how it looks.
"""
import json, math, os, subprocess, sys
from PIL import Image, ImageOps

HERE = os.path.dirname( os.path.abspath( __file__ ) )
ROOT = os.path.dirname( os.path.dirname( HERE ) )
SHOTS = 'F:/tidewater-data/shots'
EYE = 1.7                      # the camera over the ground (m)
FOV = 70                       # the game camera's view across (degrees)
AHEAD = 10                     # the point it looks at, this far ahead (m)
ROW = ( 1600, 700 )            # a photo and its render side by side


def ground( points ):
	"""The game's ground height at each ( x, z ), through its own loader."""
	code = ( "import { load } from './tools/checks/load.mjs'; const { terrain } = await load();"
		f"console.log( JSON.stringify( {json.dumps( points )}.map( ( [ x, z ] ) => terrain.heightAt( x, z ) ) ) );" )
	out = subprocess.run( [ 'node', '--input-type=module', '-e', code ], capture_output=True, text=True, cwd=ROOT, check=True ).stdout
	return json.loads( out.strip().splitlines()[ - 1 ] )


def main():
	name, folder, numbers = sys.argv[ 1 ], sys.argv[ 2 ], [ int( n ) for n in sys.argv[ 3: ] ]
	shots = { s[ 'n' ]: s for s in json.load( open( os.path.join( folder, 'shots.json' ) ) ) }
	chosen = [ shots[ n ] for n in numbers if shots[ n ][ 'x' ] is not None and shots[ n ][ 'heading' ] is not None ]
	heights = ground( [ [ s[ 'x' ], s[ 'z' ] ] for s in chosen ] )
	looks = []
	for s, h in zip( chosen, heights ):
		a = math.radians( s[ 'heading' ] - math.degrees( s[ 'gridYaw' ] ) ); y = h + EYE
		t = ( s[ 'x' ] + AHEAD * math.sin( a ), y + AHEAD * math.tan( math.radians( s[ 'pitch' ] ) ), s[ 'z' ] - AHEAD * math.cos( a ) )
		looks.append( f"--look=critic{name}{s[ 'n' ]}:{s[ 'x' ]},{y:.2f},{s[ 'z' ]}:{t[ 0 ]:.2f},{t[ 1 ]:.2f},{t[ 2 ]:.2f}:{FOV}" )
	subprocess.run( [ 'node', os.path.join( ROOT, 'test', 'world-slavonia.mjs' ), os.path.join( SHOTS, 'head' ), *looks ], check=True, capture_output=True, cwd=ROOT )
	out = Image.new( 'RGB', ( ROW[ 0 ], ROW[ 1 ] * len( chosen ) ), ( 20, 20, 20 ) )
	for k, s in enumerate( chosen ):
		p = ImageOps.exif_transpose( Image.open( os.path.join( folder, f"{s[ 'n' ]:02d}.jpg" ) ) ).convert( 'RGB' ); p.thumbnail( ( ROW[ 0 ] - ROW[ 1 ] * 9 // 7, ROW[ 1 ] ) )
		g = Image.open( os.path.join( SHOTS, 'head', f"look-critic{name}{s[ 'n' ]}.png" ) ).convert( 'RGB' ); g.thumbnail( ( ROW[ 0 ] - p.width, ROW[ 1 ] ) )
		out.paste( p, ( 0, k * ROW[ 1 ] ) ); out.paste( g, ( p.width, k * ROW[ 1 ] ) )
	path = os.path.join( SHOTS, f'critic-{name}.jpg' ); out.save( path, quality=82 ); print( '->', path )


if __name__ == '__main__':
	main()
