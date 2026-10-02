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
import bpy, os

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
	'plank': ( ( 112, 92, 70 ), 0.85, 0.0 ),        # bare weathered boards
	'iron': ( ( 40, 40, 42 ), 0.60, 0.8 ),
}

BAR = 0.055          # a frame member's face width
PANE = 0.012         # how far the glass sits behind the face of its frame


def glazed( S, w, h, depth, mullion=True, transom=None ):
	"""A window's frame and glass in its opening: the frame's face at `depth` behind the wall face."""
	face = depth - 0.04
	S.panel( - w / 2, w / 2, depth + PANE, 0, h, 'glass' )
	for x0, x1 in ( ( - w / 2, - w / 2 + BAR ), ( w / 2 - BAR, w / 2 ) ): S.box( x0, x1, face, depth + PANE, 0, h, 'joinery', back=False )
	for z0, z1 in ( ( 0, BAR ), ( h - BAR, h ) ): S.box( - w / 2 + BAR, w / 2 - BAR, face, depth + PANE, z0, z1, 'joinery', back=False )
	if mullion: S.box( - BAR / 2, BAR / 2, face, depth + PANE, BAR, h - BAR, 'joinery', back=False )
	if transom: S.box( - w / 2 + BAR, w / 2 - BAR, face - 0.01, depth + PANE, transom - BAR / 2, transom + BAR / 2, 'joinery', back=False )


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
	S.box( - w / 2 - band - 0.05, w / 2 + band + 0.05, - 0.09, depth, - 0.07, 0, 'sill' )
	S.box( - w / 2 - band, w / 2 + band, - 0.03, 0, - 0.38, - 0.07, 'surround', back=False )
	return S, dict( w=w, h=h, depth=depth )


def window_plain():
	"""A newer house's window: two leaves in a bare opening, a concrete sill."""
	w, h, depth = 1.20, 1.30, 0.12
	S = Shells()
	glazed( S, w, h, depth )
	S.box( - w / 2 - 0.04, w / 2 + 0.04, - 0.05, depth, - 0.05, 0, 'sill' )
	return S, dict( w=w, h=h, depth=depth )


def window_small():
	"""A shed's or an attic's window: one small light."""
	w, h, depth = 0.60, 0.60, 0.10
	S = Shells()
	glazed( S, w, h, depth, mullion=False )
	S.box( - w / 2 - 0.03, w / 2 + 0.03, - 0.04, depth, - 0.04, 0, 'sill' )
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
	S.box( - w / 2 - 0.25, w / 2 + 0.25, - 0.40, depth + 0.04, - 0.16, 0, 'sill' )
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


PIECES = dict( window_street=window_street, window_plain=window_plain, window_small=window_small,
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
