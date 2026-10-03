"""The village kit: the pieces every house is fitted with, modelled once.

Run inside Blender:

    blender --background --python tools/blender/kit.py
    # or, in a running Blender (it builds in a scene of its own):
    #   REPO = r'<repo>'; exec( compile( open( REPO + r'/tools/blender/kit.py', encoding='utf-8' ).read(), 'kit.py', 'exec' ), { 'REPO': REPO } )

Writes public/models/slavonia/kit.glb: one node per piece. The game cuts an opening in a wall and sets
the piece in it (src/regions/slavonia/build/).

A piece's frame: metres, z up, the origin at the bottom centre of its opening on the outer face of
the wall, x along the wall, and the outside toward -y (so what stands proud of the wall has y < 0 and
what sits in the reveal y > 0). Each piece says how big an opening it needs in its custom properties:
w, h (the hole in the wall) and depth (how far in the glazing or the leaf sits).

Materials are roles, not colours: the game paints `joinery`, `leaf` and `surround` in each house's
own colours, and keeps the rest as they are here.

What the forms rest on (docs/slavonia/photos/village-street-church-blue-house.jpg, the blue house on
the right, and village-main-street-church-parking.jpg): the old street fronts have tall two-leaf
windows with a transom, set almost flush with the wall, in a moulded plaster surround with a hood
above and an apron below the sill. Newer houses have plain windows set deeper in a bare opening.
Sizes are the usual ones for such joinery, not measured.
"""
import bpy, os, math

ROOT = globals().get( 'REPO' ) or os.path.dirname( os.path.dirname( os.path.dirname( os.path.abspath( __file__ ) ) ) )
OUT = os.path.join( ROOT, 'public', 'models', 'slavonia', 'kit.glb' )
exec( compile( open( os.path.join( ROOT, 'tools', 'blender', 'shells.py' ), encoding='utf-8' ).read(), 'shells.py', 'exec' ) )

# name: ( sRGB 0-255, roughness, metallic )
MATERIALS = {
	'joinery': ( ( 236, 232, 222 ), 0.55, 0.0 ),    # painted window frames and casements
	'leaf': ( ( 96, 70, 48 ), 0.65, 0.0 ),          # a door's leaf
	'surround': ( ( 240, 236, 226 ), 0.90, 0.0 ),   # moulded plaster round an opening
	'glass': ( ( 38, 44, 52 ), 0.08, 0.0 ),
	'sill': ( ( 168, 164, 156 ), 0.90, 0.0 ),       # concrete sills and steps
	'shutter': ( ( 214, 214, 208 ), 0.60, 0.0 ),    # a roller shutter's white-grey PVC and its box
	'plank': ( ( 112, 92, 70 ), 0.85, 0.0 ),        # bare weathered boards
	'iron': ( ( 40, 40, 42 ), 0.60, 0.8 ),
	'railing': ( ( 52, 96, 150 ), 0.50, 0.3 ),      # a railing (the game paints it: galvanised on the bridge, white on the landing)
	'zinc': ( ( 150, 154, 156 ), 0.45, 0.9 ),       # galvanised steel: lamp posts
	'lens': ( ( 230, 226, 210 ), 0.20, 0.0 ),       # a lamp's diffuser
	'timber': ( ( 128, 108, 84 ), 0.90, 0.0 ),      # sawn boards and posts left to weather
	'hull': ( ( 232, 232, 226 ), 0.45, 0.0 ),       # a boat's white glass fibre
	'tarp': ( ( 60, 110, 170 ), 0.80, 0.0 ),        # the cover over a moored boat (the game paints each its own)
	'motor': ( ( 40, 42, 46 ), 0.50, 0.3 ),         # an outboard
	'float': ( ( 40, 84, 150 ), 0.60, 0.0 ),        # the excursion boat's blue floats and skirt
	'sign_white': ( ( 236, 236, 232 ), 0.50, 0.0 ), # a road sign's white
	'sign_red': ( ( 190, 36, 40 ), 0.50, 0.0 ),     # and its red
}

BAR = 0.055          # a frame member's face width
PANE = 0.012         # how far the glass sits behind the face of its frame


def glazed( S, w, h, depth, mullion=True, transom=None ):
	"""A window's frame and glass in its opening: the frame's face at `depth` behind the wall face."""
	face, back = depth - 0.04, depth + PANE
	S.panel( - w / 2, w / 2, back, 0, h, 'glass' )
	S.frame( - w / 2, w / 2, 0, h, BAR, face, back, 'joinery' )
	if mullion: S.bar( - BAR / 2, BAR / 2, BAR, h - BAR, face, back, 'joinery' )
	if transom: S.bar( - w / 2 + BAR, w / 2 - BAR, transom - BAR / 2, transom + BAR / 2, face - 0.01, back, 'joinery' )


def window_street():
	"""The old street window: two leaves and a transom light, a moulded surround with a hood and an apron."""
	w, h, depth = 0.95, 1.50, 0.07
	S = Shells()
	glazed( S, w, h, depth, transom=h * 0.70 )
	band, proud = 0.13, 0.04
	for x0, x1 in ( ( - w / 2 - band, - w / 2 ), ( w / 2, w / 2 + band ) ): S.box( x0, x1, - proud, 0, 0, h, 'surround', back=False )
	S.box( - w / 2 - band, w / 2 + band, - proud, 0, h, h + band, 'surround', back=False )
	# the hood: a cornice over the head of the surround
	S.box( - w / 2 - band - 0.07, w / 2 + band + 0.07, - 0.11, 0, h + band, h + band + 0.09, 'surround', back=False )
	# the sill, running back into the opening as its floor, and the apron under it
	S.ledge( - w / 2 - band - 0.05, w / 2 + band + 0.05, - 0.09, depth, - 0.07, 0, 'sill' )
	S.box( - w / 2 - band, w / 2 + band, - 0.03, 0, - 0.38, - 0.07, 'surround', back=False )
	return S, dict( w=w, h=h, depth=depth )


def window_plain():
	"""A newer house's window: two leaves in a bare opening, a concrete sill."""
	w, h, depth = 1.20, 1.30, 0.12
	S = Shells()
	glazed( S, w, h, depth )
	S.ledge( - w / 2 - 0.04, w / 2 + 0.04, - 0.05, depth, - 0.05, 0, 'sill' )
	return S, dict( w=w, h=h, depth=depth )


def window_shutter():
	"""The window of the post-war village house (Ivan: the common type round Kolodvorska ulica): white
	PVC in two lights, a roller shutter half down in front of them with its box at the head, the opening
	framed by a band of render in the house's trim colour standing proud of the wall (grey on many),
	a concrete sill. TerraFrame kolodvorsk-boso, vicinity 23."""
	w, h, depth = 1.30, 1.30, 0.14
	S = Shells()
	glazed( S, w, h, depth )
	face = depth - 0.04
	S.box( - w / 2, w / 2, face - 0.08, face - 0.02, h - 0.2, h, 'shutter', back=False )          # the box
	S.panel( - w / 2 + 0.02, w / 2 - 0.02, face - 0.05, h * 0.45, h - 0.2, 'shutter' )              # the shutter, half down
	band = 0.15
	for x0, x1, z0, z1 in ( ( - w / 2 - band, - w / 2, 0, h ), ( w / 2, w / 2 + band, 0, h ), ( - w / 2 - band, w / 2 + band, h, h + band ) ):
		S.box( x0, x1, - 0.025, 0, z0, z1, 'surround', back=False )
	S.ledge( - w / 2 - band, w / 2 + band, - 0.06, depth, - 0.06, 0, 'sill' )
	return S, dict( w=w, h=h, depth=depth )


def window_small():
	"""A shed's or an attic's window: one small light."""
	w, h, depth = 0.60, 0.60, 0.10
	S = Shells()
	glazed( S, w, h, depth, mullion=False )
	S.ledge( - w / 2 - 0.03, w / 2 + 0.03, - 0.04, depth, - 0.04, 0, 'sill' )
	return S, dict( w=w, h=h, depth=depth )


def door_house():
	"""A house door: a panelled leaf in a frame, a plaster surround, a concrete step."""
	w, h, depth = 1.00, 2.10, 0.10
	S = Shells()
	S.panel( - w / 2, w / 2, depth + 0.04, 0, h, 'leaf' )
	for x0, x1 in ( ( - w / 2, - w / 2 + 0.07 ), ( w / 2 - 0.07, w / 2 ) ): S.box( x0, x1, depth - 0.03, depth + 0.04, 0, h, 'joinery', back=False )
	S.box( - w / 2 + 0.07, w / 2 - 0.07, depth - 0.03, depth + 0.04, h - 0.07, h, 'joinery', back=False )
	# raised panels: two tall ones over two short ones
	for x in ( - 0.21, 0.21 ):
		S.box( x - 0.15, x + 0.15, depth + 0.02, depth + 0.04, 0.95, 1.90, 'leaf', back=False )
		S.box( x - 0.15, x + 0.15, depth + 0.02, depth + 0.04, 0.18, 0.80, 'leaf', back=False )
	S.box( 0.30, 0.34, depth - 0.01, depth + 0.04, 1.00, 1.14, 'iron', back=False )
	band = 0.11
	for x0, x1 in ( ( - w / 2 - band, - w / 2 ), ( w / 2, w / 2 + band ) ): S.box( x0, x1, - 0.03, 0, 0, h, 'surround', back=False )
	S.box( - w / 2 - band, w / 2 + band, - 0.03, 0, h, h + band, 'surround', back=False )
	S.ledge( - w / 2 - 0.25, w / 2 + 0.25, - 0.40, depth + 0.04, - 0.16, 0, 'sill' )
	return S, dict( w=w, h=h, depth=depth )


def door_plank():
	"""A shed door: boards on two ledges."""
	w, h, depth = 0.90, 1.95, 0.08
	S = Shells()
	S.panel( - w / 2, w / 2, depth + 0.03, 0, h, 'plank' )
	for z in ( 0.35, h - 0.35 ): S.box( - w / 2 + 0.04, w / 2 - 0.04, depth, depth + 0.03, z - 0.06, z + 0.06, 'plank', back=False )
	S.box( 0.30, 0.34, depth, depth + 0.03, 0.95, 1.10, 'iron', back=False )
	return S, dict( w=w, h=h, depth=depth )


def door_barn():
	"""A barn's or a garage's doors: two boarded leaves, each on three ledges."""
	w, h, depth = 2.40, 2.50, 0.08
	S = Shells()
	S.panel( - w / 2, w / 2, depth + 0.03, 0, h, 'plank' )
	S.box( - 0.015, 0.015, depth + 0.005, depth + 0.03, 0, h, 'iron', back=False )
	for sx in ( - 1, 1 ):
		for z in ( 0.30, h / 2, h - 0.30 ): S.box( sx * 0.06, sx * ( w / 2 - 0.05 ), depth, depth + 0.03, z - 0.07, z + 0.07, 'plank', back=False )
	return S, dict( w=w, h=h, depth=depth )


def vent():
	"""The round louvred opening in a gable, in a plaster ring."""
	r = 0.22
	S = Shells()
	# on the face of the wall: a gable is not cut open for it
	S.disc( 0, r, r, - 0.004, 'iron' )
	S.ring( 0, r, r, r + 0.09, - 0.035, 0, 'surround' )
	return S, dict( w=2 * r, h=2 * r, depth=0 )


def railing():
	"""A panel of the bridge's railing: balusters between two rails, half a post at each end (panels
	set end to end make whole posts). It stands on its origin and runs along +x; -y is the side of
	the water."""
	w, h = 2.0, 1.10
	S = Shells()
	for x0, x1 in ( ( 0, 0.035 ), ( w - 0.035, w ) ): S.box( x0, x1, - 0.035, 0.035, 0, h, 'railing' )
	for z0, z1 in ( ( 0.12, 0.17 ), ( h - 0.06, h ) ): S.box( 0.035, w - 0.035, - 0.03, 0.03, z0, z1, 'railing' )
	n = 13
	for k in range( n ):
		x = 0.035 + ( w - 0.07 ) * ( k + 0.5 ) / n
		S.box( x - 0.012, x + 0.012, - 0.012, 0.012, 0.17, h - 0.06, 'railing' )
	return S, dict( w=w, h=h, depth=0 )


def lamp():
	"""A street lamp: a tapering galvanised post with an arm out over the road ( toward +y ) and its head."""
	h, reach = 8.0, 1.6
	S = Shells()
	S.pole( 0, 0, 0, h, 0.09, 0.045, 'zinc' )
	S.box( - 0.03, 0.03, 0, reach, h - 0.08, h - 0.02, 'zinc' )
	S.box( - 0.12, 0.12, reach - 0.55, reach + 0.1, h - 0.16, h - 0.04, 'zinc' )
	S.box( - 0.09, 0.09, reach - 0.45, reach + 0.02, h - 0.19, h - 0.16, 'lens' )
	return S, dict( w=0.24, h=h, depth=0, reach=reach )


def platform():
	"""An angler's platform (docs/slavonia/photos/bosut-winter-platforms-bridge.jpg): a deck of boards
	on four posts driven into the bed, a knee above the water, its back on the bank. The origin is
	on the waterline at the middle of the deck's width, at the water's level; +y is the bank."""
	w, out, back, top, board = 2.4, 1.8, 0.9, 0.45, 0.2
	S = Shells()
	n = round( ( out + back ) / board )
	for k in range( n ):
		y0 = - out + ( out + back ) * k / n
		S.box( - w / 2, w / 2, y0 + 0.01, y0 + ( out + back ) / n - 0.01, top - 0.035, top, 'timber' )
	# two bearers under the boards, and the posts: the two at the front stand up as rod rests
	for x in ( - w / 2 + 0.25, w / 2 - 0.25 ):
		S.box( x - 0.04, x + 0.04, - out, back, top - 0.16, top - 0.035, 'timber' )
		S.pole( x, - out + 0.12, - 3.0, top + 0.55, 0.06, 0.05, 'timber', seg=6 )
		S.pole( x, - 0.2, - 3.0, top - 0.035, 0.06, 0.06, 'timber', seg=6 )
	return S, dict( w=w, h=top, depth=0, out=out, back=back )


def skiff():
	"""A small motor boat lying at a marina's finger under its cover (drone2 at 0-9 s: open boats of
	four to five metres, each under a tarpaulin, an outboard tilted up at the stern). The origin is on
	the waterline amidships; the bow points toward -y."""
	length, beam, free, draught = 4.6, 1.7, 0.5, 0.18
	S = Shells()
	# stations from the stern to the bow: where along the boat, the half beam at the gunwale, the
	# height of the gunwale, and how deep the bottom is there
	n = 9
	stations = []
	for k in range( n + 1 ):
		t = k / n
		full = 1.0 if t < 0.5 else max( 0.06, math.sqrt( max( 0.0, 1 - ( ( t - 0.5 ) / 0.5 ) ** 2 ) ) )
		stations.append( ( length / 2 - length * t, beam / 2 * full, free + 0.14 * t * t, - draught * ( 1 - t ** 3 ) ) )
	v = []
	for y, hb, top, keel in stations:
		# port gunwale, port chine, keel, starboard chine, starboard gunwale, and the cover's ridge over the middle
		v += [ ( - hb, y, top ), ( - hb * 0.72, y, keel * 0.6 ), ( 0, y, keel ), ( hb * 0.72, y, keel * 0.6 ), ( hb, y, top ), ( 0, y, top + 0.22 * ( hb / ( beam / 2 ) ) ) ]
	hull, cover = [], []
	for k in range( n ):
		a, b = k * 6, ( k + 1 ) * 6
		hull += [ ( a, b, b + 1, a + 1 ), ( a + 1, b + 1, b + 2, a + 2 ), ( a + 2, b + 2, b + 3, a + 3 ), ( a + 3, b + 3, b + 4, a + 4 ) ]
		cover += [ ( a + 4, b + 4, b + 5, a + 5 ), ( a + 5, b + 5, b, a ) ]
	S.shell( v, hull + [ ( 0, 1, 2, 3, 4 ) ], 'hull' )
	S.shell( v, cover + [ ( 4, 5, 0 ) ], 'tarp' )
	# the outboard on the transom, tilted up
	y = length / 2
	S.box( - 0.16, 0.16, y - 0.05, y + 0.36, free - 0.05, free + 0.42, 'motor' )
	S.box( - 0.05, 0.05, y + 0.3, y + 0.75, free - 0.1, free + 0.05, 'motor' )
	return S, dict( w=beam, h=free + 0.42, depth=0, length=length )


def excursion():
	"""The excursion boat at the landing (drone1 at 48-51 s; the orthophoto shows it nine metres by
	four): a deck on two blue floats under a white canopy on posts, a rail round it. The origin is on
	the waterline amidships; the bow points toward -y."""
	length, beam, deck, roof = 9.0, 3.4, 0.6, 2.75
	S = Shells()
	for sx in ( - 1, 1 ):
		x = sx * ( beam / 2 - 0.5 )
		S.box( x - 0.45, x + 0.45, - length / 2 + 0.5, length / 2, - 0.3, deck - 0.1, 'float' )
		# the float's bow, drawn in to a point
		S.shell( [ ( x - 0.45, - length / 2 + 0.5, - 0.3 ), ( x + 0.45, - length / 2 + 0.5, - 0.3 ), ( x + 0.45, - length / 2 + 0.5, deck - 0.1 ), ( x - 0.45, - length / 2 + 0.5, deck - 0.1 ), ( x, - length / 2, deck - 0.1 ), ( x, - length / 2, 0.05 ) ],
			[ ( 0, 5, 4, 3 ), ( 1, 2, 4, 5 ), ( 3, 4, 2 ), ( 0, 1, 5 ) ], 'float' )
	S.box( - beam / 2, beam / 2, - length / 2 + 0.6, length / 2, deck - 0.1, deck, 'timber' )
	S.box( - beam / 2, beam / 2, - length / 2 + 0.6, length / 2, deck, deck + 0.28, 'float' )
	S.box( - beam / 2 + 0.06, beam / 2 - 0.06, - length / 2 + 0.66, length / 2 - 0.06, deck + 0.02, deck + 0.3, 'timber' )
	# the posts and the rail between them, and the canopy they carry
	ys = [ - length / 2 + 0.9 + ( length - 1.3 ) * k / 3 for k in range( 4 ) ]
	for sx in ( - 1, 1 ):
		x = sx * ( beam / 2 - 0.08 )
		for y in ys: S.box( x - 0.03, x + 0.03, y - 0.03, y + 0.03, deck + 0.28, roof, 'joinery' )
		S.box( x - 0.02, x + 0.02, ys[ 0 ], ys[ - 1 ], deck + 1.0, deck + 1.05, 'joinery' )
	S.box( - beam / 2 - 0.15, beam / 2 + 0.15, ys[ 0 ] - 0.5, ys[ - 1 ] + 0.3, roof, roof + 0.1, 'joinery' )
	# the helm: a console forward on the right
	S.box( beam / 2 - 1.1, beam / 2 - 0.4, ys[ 0 ] + 0.1, ys[ 0 ] + 0.7, deck + 0.28, deck + 1.25, 'joinery' )
	return S, dict( w=beam, h=roof + 0.1, depth=0, length=length )


def bench():
	"""A park bench: slats on two concrete ends, a back of slats. It stands on its origin and runs
	along x; one sits on it facing -y."""
	w = 1.8
	S = Shells()
	for sx in ( - 1, 1 ):
		x = sx * ( w / 2 - 0.12 )
		S.box( x - 0.05, x + 0.05, - 0.22, 0.24, 0, 0.42, 'sill' )
		S.box( x - 0.05, x + 0.05, 0.16, 0.24, 0.42, 0.85, 'sill' )
	for k in range( 4 ): S.box( - w / 2, w / 2, - 0.22 + k * 0.11, - 0.22 + k * 0.11 + 0.09, 0.42, 0.46, 'timber' )
	for k in range( 3 ): S.box( - w / 2, w / 2, 0.15, 0.19, 0.52 + k * 0.12, 0.52 + k * 0.12 + 0.09, 'timber' )
	return S, dict( w=w, h=0.85, depth=0.5 )


def park_lamp():
	"""A park's lamp: a slender post with a lantern on its top (drone2 at 39 s)."""
	h = 4.2
	S = Shells()
	S.pole( 0, 0, 0, h, 0.06, 0.04, 'zinc' )
	S.pole( 0, 0, h, h + 0.12, 0.16, 0.2, 'zinc', seg=8 )
	S.pole( 0, 0, h + 0.12, h + 0.3, 0.2, 0.05, 'lens', seg=8 )
	return S, dict( w=0.4, h=h + 0.3, depth=0.4 )


def gym_bars():
	"""Pull-up bars of an outdoor gym: three posts in a row, a bar between each two at its own
	height. It runs along x."""
	S = Shells()
	for k, x in enumerate( ( - 1.3, 0, 1.3 ) ): S.pole( x, 0, 0, 2.5, 0.05, 0.05, 'zinc' )
	for x0, x1, z in ( ( - 1.3, 0, 2.3 ), ( 0, 1.3, 1.95 ) ): S.box( x0, x1, - 0.018, 0.018, z - 0.018, z + 0.018, 'zinc' )
	return S, dict( w=2.7, h=2.5, depth=0.2 )


def gym_station():
	"""One apparatus of an outdoor gym: a painted post with a seat on an arm and a pair of handles
	(the white and grey machines of drone2 at 45 s, no two alike: this is the plainest of them)."""
	S = Shells()
	S.pole( 0, 0, 0, 1.5, 0.07, 0.06, 'joinery' )
	S.box( - 0.04, 0.04, - 0.75, 0, 0.5, 0.58, 'zinc' )
	S.box( - 0.2, 0.2, - 0.95, - 0.6, 0.58, 0.63, 'iron' )
	S.box( - 0.45, 0.45, - 0.03, 0.03, 1.2, 1.26, 'zinc' )
	for sx in ( - 1, 1 ): S.box( sx * 0.45 - 0.02, sx * 0.45 + 0.02, - 0.4, 0, 1.2, 1.26, 'zinc' )
	return S, dict( w=0.9, h=1.5, depth=1.0 )


def crossbuck():
	"""The St Andrew's cross that stands before a level crossing without barriers: two boards crossed
	on a post, white with red ends. It stands on its origin and faces -y. Its sizes are the usual
	ones for the sign, not measured."""
	h, arm, wide, thick, post = 2.3, 1.2, 0.12, 0.02, 0.04
	S = Shells()
	S.pole( 0, 0, 0, h + 0.3, post, post, 'zinc' )
	r = math.sqrt( 0.5 )
	for k, sx in enumerate( ( - 1, 1 ) ):
		# along the board and across it, in the sign's plane; the second board lies before the first
		a, n, y1 = ( sx * r, r ), ( - r, sx * r ), - post - k * thick
		for t0, t1, mat in ( ( - arm / 2, - arm / 4, 'sign_red' ), ( - arm / 4, arm / 4, 'sign_white' ), ( arm / 4, arm / 2, 'sign_red' ) ):
			corners = [ ( t0, - wide / 2 ), ( t1, - wide / 2 ), ( t1, wide / 2 ), ( t0, wide / 2 ) ]
			S.prism( [ ( t * a[ 0 ] + c * n[ 0 ], h + t * a[ 1 ] + c * n[ 1 ] ) for t, c in corners ][ ::sx ], y1 - thick, y1, mat, plane='xz' )
	return S, dict( w=arm * r + wide, h=h + arm * r / 2 + wide, depth=2 * post + 2 * thick )


def gate_yard():
	"""The gate of a yard on the street: two boarded leaves between two rendered pillars. It stands
	on its origin, runs along x about it, and faces the street toward -y."""
	w, h, pillar = 3.4, 2.0, 0.38
	S = Shells()
	for sx in ( - 1, 1 ):
		x = sx * ( w - pillar ) / 2
		S.post( x - pillar / 2, x + pillar / 2, - pillar / 2, pillar / 2, - 0.3, h + 0.15, 'surround' )
		# a leaf of boards hung on its pillar (the game's boards are drawn on it)
		S.leaf( min( sx * 0.01, sx * ( w / 2 - pillar ) ), max( sx * 0.01, sx * ( w / 2 - pillar ) ), - 0.02, 0.02, 0.08, h - 0.1, 'plank' )
	return S, dict( w=w, h=h, depth=0 )


PIECES = dict( railing=railing, lamp=lamp, platform=platform, skiff=skiff, excursion=excursion, bench=bench, park_lamp=park_lamp, gym_bars=gym_bars, gym_station=gym_station, crossbuck=crossbuck, gate_yard=gate_yard, window_street=window_street, window_plain=window_plain, window_shutter=window_shutter, window_small=window_small,
	door_house=door_house, door_plank=door_plank, door_barn=door_barn, vent=vent )


def build():
	scene = fresh_scene( 'Kit' )
	mats = make_materials( MATERIALS )
	report = {}
	for i, ( name, make ) in enumerate( PIECES.items() ):
		S, props = make()
		ob = S.object( name, mats, scene.collection, props )
		report[ name ] = dict( triangles=sum( len( p.vertices ) - 2 for p in ob.data.polygons ), **props )
	os.makedirs( os.path.dirname( OUT ), exist_ok=True )
	export_glb( scene, OUT )
	# laid out side by side for looking at ( after the export: every piece is exported at its own origin )
	x = 0
	for ob in scene.collection.objects:
		ob.location.x = x + ob[ 'w' ] / 2
		x += ob[ 'w' ] + 0.8
	return report


result = build()
print( 'kit:', result, '->', OUT )
