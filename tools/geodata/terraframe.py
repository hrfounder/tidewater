"""Photos from the TerraFrame archive (friends' phones), ready for building the twin: each photo with
where it was taken, which way it faced and how wide it saw, on a contact sheet and on the orthophoto.

    python3 tools/geodata/terraframe.py fetch kolodvorsk 2026-10-03T14:57 [OUT]
        -> OUT (default F:/tidewater-data/terraframe/<survey>): NN.jpg (as taken), NN.json (its metadata),
           shots.json (one line a photo), contact.jpg (numbered, upright), map.jpg (the photos on the
           orthophoto: a dot where each was taken, its view's middle and edges)

The archive token is read from TERRAFRAME_ENV (default: the app project's server/.env) and never
printed. Positions are the game's metres (x east, z south of the block's centre), headings true north;
outdoors GPS is good to well under a metre, the compass to about ten degrees, indoors GPS to ~10 m.
A photo's view on the map is its horizontal field of view: for a portrait photo that is the sensor's
vertical one.
"""
import io, json, math, os, sys, urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = os.path.dirname( os.path.abspath( __file__ ) )
ARCHIVE = 'https://submitar.vendorasuite.com'
ENV = os.environ.get( 'TERRAFRAME_ENV', r'C:\Users\Ivan\Documents\Codex\2026-10-03\we-need-a-kotlin-app-that\server\.env' )
OUT = 'F:/tidewater-data/terraframe'
THUMB = ( 450, 600 )           # a photo on the contact sheet
COLS = 5                       # photos to a row of it
METRE = 0.06                   # the map's metres to a pixel
VIEW = 12.0                    # how far a photo's view is drawn on the map (m)


def token():
	return next( l.split( '=', 1 )[ 1 ].strip() for l in open( ENV, encoding='utf-8' ) if l.startswith( 'TERRAFRAME_TOKEN=' ) )


def get( path, raw=False ):
	req = urllib.request.Request( ARCHIVE + path, headers={ 'Authorization': 'Bearer ' + token(), 'User-Agent': 'tidewater' } )
	with urllib.request.urlopen( req, timeout=180 ) as r: data = r.read()
	return data if raw else json.loads( data )


def fetch( survey_name, since, out ):
	survey = next( s for s in get( '/api/surveys' ) if s[ 'title' ].lower().startswith( survey_name.lower() ) )
	out = out or os.path.join( OUT, survey[ 'title' ].split()[ 0 ] )
	os.makedirs( out, exist_ok=True )
	frames = sorted( ( f for f in get( f"/api/surveys/{survey[ 'id' ]}/frames?offset=0&limit=200" ) if f[ 'record' ][ 'utc' ] >= since ), key=lambda f: f[ 'record' ][ 'utc' ] )
	shots = []
	for n, f in enumerate( frames, 1 ):
		r = f[ 'record' ]; o = r.get( 'orientation' ); k = r.get( 'photoIntrinsics' )
		path = os.path.join( out, f'{n:02d}.jpg' )
		if not os.path.exists( path ): open( path, 'wb' ).write( get( f"/api/frames/{f[ 'id' ]}/file/image", raw=True ) )
		json.dump( r, open( os.path.join( out, f'{n:02d}.json' ), 'w' ) )
		t = get( f"/api/frames/{f[ 'id' ]}/tidewater" )
		portrait = o is not None and abs( abs( o[ 'rollDeg' ] ) - 90 ) < 45
		fov = None
		if k: fov = math.degrees( 2 * math.atan( ( k[ 'height' ] if portrait else k[ 'width' ] ) / 2 / ( k[ 'fy' ] if portrait else k[ 'fx' ] ) ) )
		shots.append( dict( n=n, id=f[ 'id' ], utc=r[ 'utc' ], x=t[ 'grid' ] and round( t[ 'grid' ][ 'x' ], 2 ), z=t[ 'grid' ] and round( t[ 'grid' ][ 'z' ], 2 ),
			gridYaw=t[ 'grid' ] and t[ 'grid' ][ 'gridYawRad' ], gps=r[ 'gps' ] and r[ 'gps' ].get( 'horizontalAccuracyM' ),
			heading=o and round( o[ 'headingDeg' ], 1 ), pitch=o and round( o[ 'pitchDeg' ], 1 ), compass=o and o[ 'compassAccuracy' ], fov=fov and round( fov, 1 ) ) )
	json.dump( shots, open( os.path.join( out, 'shots.json' ), 'w' ), indent=1 )
	contact( out, shots ); plot( out, shots )
	for s in shots: print( f"{s[ 'n' ]:2d} {s[ 'utc' ][ 11:19 ]}  x {s[ 'x' ]}  z {s[ 'z' ]}  ±{s[ 'gps' ]}  facing {s[ 'heading' ]}  pitch {s[ 'pitch' ]}  fov {s[ 'fov' ]}" )
	print( '->', out )


def contact( out, shots ):
	font = ImageFont.truetype( 'arial.ttf', 40 )
	rows = math.ceil( len( shots ) / COLS )
	sheet = Image.new( 'RGB', ( COLS * THUMB[ 0 ], rows * THUMB[ 1 ] ), ( 20, 20, 20 ) )
	for k, s in enumerate( shots ):
		im = ImageOps.exif_transpose( Image.open( os.path.join( out, f"{s[ 'n' ]:02d}.jpg" ) ) ).convert( 'RGB' ); im.thumbnail( THUMB )
		d = ImageDraw.Draw( im ); d.rectangle( [ 0, 0, 70, 48 ], fill=( 0, 0, 0 ) ); d.text( ( 8, 2 ), str( s[ 'n' ] ), fill=( 255, 255, 0 ), font=font )
		sheet.paste( im, ( ( k % COLS ) * THUMB[ 0 ] + ( THUMB[ 0 ] - im.width ) // 2, ( k // COLS ) * THUMB[ 1 ] + ( THUMB[ 1 ] - im.height ) // 2 ) )
	sheet.save( os.path.join( out, 'contact.jpg' ), quality=85 )


def plot( out, shots ):
	located = [ s for s in shots if s[ 'x' ] is not None ]
	if not located: return
	xs, zs = [ s[ 'x' ] for s in located ], [ s[ 'z' ] for s in located ]
	cx, cz = ( min( xs ) + max( xs ) ) / 2, ( min( zs ) + max( zs ) ) / 2
	half = max( max( xs ) - min( xs ), max( zs ) - min( zs ) ) / 2 + VIEW + 5
	path = os.path.join( out, 'map.jpg' )
	os.system( f'python "{os.path.join( HERE, "sheet.py" )}" bosut {cx:.2f},{cz:.2f} {half:.1f} "{path}" {METRE} > NUL 2>&1' if os.name == 'nt' else f'python3 "{os.path.join( HERE, "sheet.py" )}" bosut {cx:.2f},{cz:.2f} {half:.1f} "{path}" {METRE} > /dev/null 2>&1' )
	im = Image.open( path ).convert( 'RGB' ); d = ImageDraw.Draw( im ); W = im.size[ 0 ]
	font = ImageFont.truetype( 'arial.ttf', 22 )
	px = lambda x, z: ( W / 2 + ( x - cx ) / METRE, W / 2 + ( z - cz ) / METRE )
	for s in located:
		c = px( s[ 'x' ], s[ 'z' ] )
		if s[ 'heading' ] is not None:
			# ( the sheet is drawn grid-north up: the heading less the grid's convergence )
			a = math.radians( s[ 'heading' ] - math.degrees( s[ 'gridYaw' ] ) ); L = VIEW / METRE
			for h in ( - ( s[ 'fov' ] or 0 ) / 2, ( s[ 'fov' ] or 0 ) / 2 ):
				d.line( [ c, ( c[ 0 ] + L * math.sin( a + math.radians( h ) ), c[ 1 ] - L * math.cos( a + math.radians( h ) ) ) ], fill=( 255, 150, 0 ), width=1 )
			d.line( [ c, ( c[ 0 ] + L * math.sin( a ), c[ 1 ] - L * math.cos( a ) ) ], fill=( 255, 230, 0 ), width=3 )
		d.ellipse( [ c[ 0 ] - 6, c[ 1 ] - 6, c[ 0 ] + 6, c[ 1 ] + 6 ], fill=( 255, 230, 0 ) )
		d.text( ( c[ 0 ] + 8, c[ 1 ] + 4 ), str( s[ 'n' ] ), fill=( 255, 255, 255 ), font=font, stroke_width=3, stroke_fill=( 0, 0, 0 ) )
	im.save( path, quality=88 )


if __name__ == '__main__':
	if sys.argv[ 1:2 ] == [ 'fetch' ]: fetch( sys.argv[ 2 ], sys.argv[ 3 ], sys.argv[ 4 ] if len( sys.argv ) > 4 else None )
	else: print( __doc__ )
