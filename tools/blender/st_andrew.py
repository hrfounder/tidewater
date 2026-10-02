"""Crkva svetog Andrije, Andrijasevci: the church and its yard, modelled from drone footage, the state
orthophoto and its mapped footprint.

Run inside Blender:

    blender --background --python tools/blender/st_andrew.py
    # or, in a running Blender (it builds in a scene of its own):
    #   REPO = r'<repo>'; exec( compile( open( REPO + r'/tools/blender/st_andrew.py', encoding='utf-8' ).read(), 'st_andrew.py', 'exec' ), { 'REPO': REPO } )

Writes public/models/slavonia/st-andrew.glb: one mesh, one primitive per material, colours as
material base colours. The game stands it on the church's footprint (src/regions/slavonia/Landmarks.js)
and takes the church's true plan from the model's custom properties (see PLAN below): the map's
outline is where the church is, the model is what it is.

Frame: metres, z up, origin on the ground at the centre of the mapped footprint's bounding rectangle,
the front (tower, door) facing -y: toward Ulica Matije Gupca, north-west. Seen from the street, +x
is to the right: the side of Ulica Vladimira Nazora.

What each number rests on:

  FOOTPRINT (OpenStreetMap, public/world/bosut/places.json, 'crkva svetog Andrije'):
    a rectangle 17.6 m long and 10.9 m wide, with an annex against the rear of each flank: 7.3 m
    long and 4.3 m deep on the left, 6.8 m long and 3.6 m deep on the right.

  ORTHOPHOTO (DGU geoportal WMS, layer DOF_LIDAR_2022_2023, read at 5 cm a pixel; roofs lean about
  0.095 m south for every metre of their height, measured on the tower, and are put back):
    the annexes are where the map has them (their outer rear corners within 0.9 m). The mapped
    rectangle is not the nave: the apse's round stands on to 19.3 m from the front, 1.7 m past the
    annexes' rear walls, which the map draws as the end of the building.
    The yard: the front fence 8.0 m before the facade; the fence along Ulica Vladimira Nazora
    11.4 to 12.5 m right of the footprint rectangle's middle at the front, drawing in to 9.4 m at the
    rear; the lawn's rear edge 25.5 m behind the middle, its left edge 18.6 m left of it.

  DRONE FOOTAGE (frames kept outside the repository; drone5 = the orbit of the church, drone1 = the
  street tour):
    drone5 f012, straight on to the front from the height of the spire. The facade's 10.9 m is
    188 px on the ground line; the tower is 74 px wide at the belfry and its bay 64 px at the door,
    which fixes the camera (focal length 630 px, pitched 18.2 degrees down, 23.8 m up, 30.6 m before
    the facade) and gives the levels: eaves 8.2, the tower's first cornice 14.0, the belfry's
    cornice 19.05, the apex of the clock gables 20.75, the spire's point 26.15, the cross's top
    28.6; the tower 3.7 m wide (drone1 f_020 makes it 4.0: it is built 3.9). The same camera puts the gate on the church's axis, the front
    fence 7.9 m before the facade (the orthophoto says 8.0) and the crucifix 4.2 m before it.
    drone5 f004 to f007, the rear: each annex's rear wall runs in one plane from its outer corner
    to the apse's round, so the annexes wrap the nave's rear corners and nothing of the nave's own
    rear wall shows. Seen from behind (f005) the apse is 130 px across where the two rear walls are
    140 and 115: a round of 3.3 m radius, struck 16.0 m from the front. Its cornice is the nave's,
    at the same level, and its cone rises nearly to the ridge, under a short hip. Both annexes
    have a gable facing outward whose ridge reaches the nave's eaves, the right one with three
    square windows in it, and each a door in its front wall.
    drone5 f012 enlarged: the crucifix stands two metres inside the fence, right of the gate; a
    stone cross on a pedestal stands on the right lawn by the fence; a notice board left of the gate.
    The spire has eight sides, an edge over the middle of each of the tower's faces and one over
    each corner (an edge shows in the middle of it both face on, f012, and corner on, f004); the
    clocks are dark faces with light marks.
    drone1 f_020, the facade from the street: the pilasters, the string course under the cornice,
    the round arch that breaks the cornice over the middle bay, the louvred openings of the tower.
    Colours: the three references are lit by a low sun, each differently. The wall is the mean of
    their three colour ratios ( 1 : 0.91 : 0.79 ) at a light render's brightness, the pilasters and
    cornices the wall times ( 0.94, 0.90, 0.88 ) as the two daylight frames have them.

  ASSUMED (to be corrected from more pictures):
    the pitch of the roofs (48 degrees: the shoulders of the facade follow it), how far the hip
    runs (1.5 m), one window to each flank, the left annex's windows; the walls on the yard's left
    and rear boundaries (the footage shows brick there but not its line); the pillars' spacing
    between the gate and the corners; the trees' heights (their
    places are the crowns of the orthophoto and of drone5 f007).
"""
import bpy, math, os

ROOT = globals().get( 'REPO' ) or os.path.dirname( os.path.dirname( os.path.dirname( os.path.abspath( __file__ ) ) ) )
OUT = os.path.join( ROOT, 'public', 'models', 'slavonia', 'st-andrew.glb' )
exec( compile( open( os.path.join( ROOT, 'tools', 'blender', 'shells.py' ), encoding='utf-8' ).read(), 'shells.py', 'exec' ) )

# ---- plan. The mapped rectangle is RECT_L x RECT_W; x is measured from its middle
RECT_L, RECT_W = 17.6, 18.85
W = 10.9                                   # the nave's width
L_DEEP, L_LONG = 4.35, 7.25                # the left annex: out from the nave, and along it
R_DEEP, R_LONG = 3.6, 6.8                  # the right annex
NAVE_X0 = - RECT_W / 2 + L_DEEP
NAVE_X1 = NAVE_X0 + W
AXIS = ( NAVE_X0 + NAVE_X1 ) / 2
FRONT = - RECT_L / 2
NAVE_LEN = 16.0                            # the facade to where the apse's round is struck from
NAVE_BACK = FRONT + NAVE_LEN
APSE_R = 3.3
ANNEX_BACK = RECT_L / 2
# where an annex's rear wall meets the apse's round: this far to the side of the axis
APSE_MEET = math.sqrt( APSE_R ** 2 - ( ANNEX_BACK - NAVE_BACK ) ** 2 )
L_X0, L_Y0 = - RECT_W / 2, ANNEX_BACK - L_LONG
R_X1, R_Y0 = RECT_W / 2, ANNEX_BACK - R_LONG

# ---- levels (metres above the ground)
PLINTH = 0.6
EAVES = 8.2                                # the top of the main cornice
PITCH = math.tan( math.radians( 48 ) )
OVER = 0.4                                 # the roof past the wall
RIDGE_CAP = 0.09                           # half the width of the caps along ridges and hips
RIDGE = EAVES + PITCH * W / 2
HIP = 1.5                                  # how far before the rear wall the ridge ends
APSE_TOP = RIDGE - 1.0                     # the cone's point, under the hip
ANNEX_EAVES, ANNEX_PITCH = 3.6, PITCH    # their ridges reach the nave's eaves (drone5 f002)
TOWER_W = 3.9                              # 3.7 by drone5 f012, 4.0 by drone1 f_020 (the bay is 0.368 of the facade)
HT = TOWER_W / 2
TY0 = FRONT - 0.3                          # the tower's bay stands this far proud of the facade
TCY = TY0 + HT                             # the tower's own middle
STAGE = 14.0                               # the tower's first cornice
BELFRY = 19.05                             # the belfry's cornice
GABLE = 20.75                              # the apex of the clock gables
POINT = 26.15                              # the spire's point
CROSS = 28.6

# ---- the yard, clockwise from its front left corner as seen from the street ( x, y )
FENCE_Y = FRONT - 8.0
YARD = [ ( - 18.6, FENCE_Y ), ( 12.5, FENCE_Y ), ( 11.6, - 1.0 ), ( 11.6, 5.2 ), ( 10.7, 15.2 ), ( 9.5, 24.8 ), ( - 6.6, 24.8 ), ( - 6.6, 9.7 ), ( - 18.6, 9.7 ) ]
STREET_SIDES = 5                           # the first sides of YARD are on a street: brick pillars and iron
GATE_W = 3.3                               # between the gate's pillars, on the church's axis
PILLAR, PILLAR_H = 0.6, 2.4
PILLAR_GAP = 6.6                           # the most between two pillars
BASE_H, BASE_T = 0.5, 0.3                  # the brick wall the iron stands on
IRON_TOP = 1.75
PICKET, PICKET_GAP = 0.016, 0.16
WALL_H, WALL_T = 1.8, 0.25                 # the brick wall on the other sides
# the paving: the forecourt from the gate, as wide as the church's front, and a walk along each flank
APRON = 7.6                                # half the forecourt's width at the facade
WALK = 1.8
CRUCIFIX = ( AXIS + GATE_W / 2 + PILLAR + 1.5, FENCE_Y + 2.2 )
STONE_CROSS = ( 10.2, FRONT + 1.3 )        # on the right lawn, by the fence
NOTICE = ( AXIS - GATE_W / 2 - PILLAR - 1.7, FENCE_Y + 0.9 )
# the trees of the yard: ( x, y, height )
TREES = [ ( - 15.2, - 3.6, 14.0 ), ( 7.4, 16.0, 11.0 ), ( 2.5, 19.5, 9.0 ), ( - 12.5, - 13.0, 5.0 ) ]

# name: ( sRGB 0-255, roughness, metallic )
MATERIALS = {
	'wall': ( ( 236, 214, 187 ), 0.92, 0.0 ),      # pale cream render
	'trim': ( ( 222, 193, 165 ), 0.90, 0.0 ),      # the peach of pilasters, cornices and surrounds
	'plinth': ( ( 176, 150, 138 ), 0.94, 0.0 ),
	'tile': ( ( 172, 82, 62 ), 0.86, 0.0 ),        # new red clay tile
	'spire': ( ( 176, 178, 186 ), 0.45, 0.6 ),     # light grey sheet
	'door': ( ( 86, 56, 38 ), 0.70, 0.0 ),
	'glass': ( ( 40, 44, 52 ), 0.20, 0.0 ),
	'louvre': ( ( 112, 102, 98 ), 0.80, 0.0 ),
	'clock': ( ( 62, 46, 40 ), 0.60, 0.0 ),         # the clocks' dark faces
	'ridge': ( ( 192, 138, 116 ), 0.90, 0.0 ),     # the mortared caps along ridges and hips, paler than the tile
	'pipe': ( ( 150, 152, 156 ), 0.50, 0.7 ),      # downpipes
	'gold': ( ( 196, 156, 64 ), 0.35, 1.0 ),
	'iron': ( ( 30, 30, 32 ), 0.60, 0.8 ),
	'brick': ( ( 168, 96, 70 ), 0.90, 0.0 ),
	'stone': ( ( 214, 206, 190 ), 0.90, 0.0 ),     # pillar caps, the wall's coping, the crucifix's foot
	'paving': ( ( 150, 148, 144 ), 0.92, 0.0 ),
}


def arch( w, h, c, z0, n=12 ):
	"""Outline of a round-arched opening: w wide, h tall to the crown, sill at z0, centred on c."""
	r = w / 2
	pts = [ ( c - r, z0 ), ( c + r, z0 ) ]
	for k in range( n + 1 ):
		a = math.pi * k / n
		pts.append( ( c + r * math.cos( a ), z0 + h - r + r * math.sin( a ) ) )
	return pts


def opening( S, plane, c, z0, w, h, face, out, fill, surround=0.16 ):
	"""An arched opening in a wall: a surround standing `out` proud of the wall plane at `face`, and
	the fill a little prouder still so it is not buried. `out` is signed: the way the wall faces."""
	S.prism( arch( w + 2 * surround, h + surround, c, z0 - surround * 0.5 ), face, face + out, 'trim', plane )
	S.prism( arch( w, h, c, z0 ), face + out, face + out * 1.4, fill, plane )


def wall_box( S, plane, c0, c1, z0, z1, face, out, mat ):
	"""A box standing `out` proud of a wall: between c0 and c1 along it, z0 to z1."""
	if plane == 'xz': S.box( c0, c1, face, face + out, z0, z1, mat )
	else: S.box( face, face + out, c0, c1, z0, z1, mat )


def cornice( S, x0, x1, y0, y1, z, mat='trim' ):
	"""A cornice round a box in plan, its top at z: a bed mould and the projecting shelf over it."""
	S.box( x0 - 0.12, x1 + 0.12, y0 - 0.12, y1 + 0.12, z - 0.45, z - 0.25, mat )
	S.box( x0 - 0.32, x1 + 0.32, y0 - 0.32, y1 + 0.32, z - 0.25, z, mat )


def church( S ):

	# ---- the nave: plinth, walls, the string course and the cornice under the eaves
	S.box( NAVE_X0 - 0.06, NAVE_X1 + 0.06, FRONT - 0.06, NAVE_BACK + 0.06, 0, PLINTH, 'plinth' )
	S.box( NAVE_X0, NAVE_X1, FRONT, NAVE_BACK, PLINTH, EAVES - 0.25, 'wall' )
	S.box( NAVE_X0 - 0.07, NAVE_X1 + 0.07, FRONT - 0.07, NAVE_BACK + 0.07, EAVES - 1.5, EAVES - 1.32, 'trim' )
	cornice( S, NAVE_X0, NAVE_X1, FRONT, NAVE_BACK, EAVES )
	# the facade's corner pilasters
	for x0, x1 in ( ( NAVE_X0, NAVE_X0 + 0.9 ), ( NAVE_X1 - 0.9, NAVE_X1 ) ):
		S.box( x0, x1, FRONT - 0.1, FRONT, PLINTH, EAVES - 1.5, 'trim' )
	# one arched window to each flank, in the middle of the wall the annex leaves free
	for side, x, y1 in ( ( - 1, NAVE_X0, L_Y0 ), ( 1, NAVE_X1, R_Y0 ) ):
		opening( S, 'yz', ( FRONT + y1 ) / 2, 3.3, 1.1, 2.6, x, side * 0.06, 'glass' )

	# ---- the roof: two slopes from the facade back, hipped over the rear wall
	xl, xr, ze = AXIS - W / 2 - OVER, AXIS + W / 2 + OVER, EAVES - PITCH * OVER + 0.02
	yf, yr, yb = FRONT + 0.3, NAVE_BACK + OVER - HIP, NAVE_BACK + OVER
	v = [ ( xl, yf, ze ), ( xr, yf, ze ), ( AXIS, yf, RIDGE ), ( xl, yb, ze ), ( xr, yb, ze ), ( AXIS, yr, RIDGE ) ]
	S.shell( v, [ ( 0, 3, 5, 2 ), ( 1, 2, 5, 4 ), ( 3, 4, 5 ), ( 0, 2, 1 ), ( 0, 1, 4, 3 ) ], 'tile' )
	# the caps along the ridge and down the two hips
	S.box( AXIS - RIDGE_CAP, AXIS + RIDGE_CAP, FRONT + 2.0, yr, RIDGE - 0.02, RIDGE + 0.07, 'ridge' )
	for x in ( xl, xr ):
		d = ( x - AXIS, yb - yr, ze - RIDGE )
		# a strip lying on the hip: across it level, and its own thickness up
		ax, ay = - d[ 1 ] / math.hypot( d[ 0 ], d[ 1 ] ) * RIDGE_CAP, d[ 0 ] / math.hypot( d[ 0 ], d[ 1 ] ) * RIDGE_CAP
		q = [ ( AXIS - ax, yr - ay, RIDGE ), ( AXIS + ax, yr + ay, RIDGE ), ( x + ax, yb + ay, ze ), ( x - ax, yb - ay, ze ) ]
		S.shell( q + [ ( a, b, c + 0.07 ) for a, b, c in q ], [ ( 4, 5, 6, 7 ), ( 0, 1, 5, 4 ), ( 1, 2, 6, 5 ), ( 2, 3, 7, 6 ), ( 3, 0, 4, 7 ) ], 'ridge' )

	# ---- the facade's two shoulders, rising with the roof from the eaves to the tower, under a coping
	for side in ( - 1, 1 ):
		x_out, x_in = AXIS + side * W / 2, AXIS + side * HT
		z_in = EAVES + PITCH * ( W / 2 - HT )
		poly = [ ( x_out, EAVES ), ( x_in, EAVES ), ( x_in, z_in ) ]
		S.prism( poly if side < 0 else poly[ ::- 1 ], FRONT, FRONT + 0.45, 'wall' )
		xo, zo = x_out + side * 0.3, EAVES - PITCH * 0.3
		rake = [ ( xo, zo + 0.12 ), ( x_in, z_in + 0.12 ), ( x_in, z_in + 0.4 ), ( xo, zo + 0.4 ) ]
		S.prism( rake if side < 0 else rake[ ::- 1 ], FRONT - 0.12, FRONT + 0.5, 'trim' )
		# the block the coping starts from, on the corner
		S.box( x_out - side * 0.9, x_out + side * 0.12, FRONT - 0.12, FRONT + 0.5, EAVES, EAVES + 0.55, 'trim' )

	# ---- the apse: a round wall under its own cornice and a cone against the hip
	turned = lambda profile, mat, seg=28: S.lathe( profile, AXIS, NAVE_BACK, mat, seg=seg )
	turned( [ ( APSE_R + 0.06, 0 ), ( APSE_R + 0.06, PLINTH ) ], 'plinth' )
	turned( [ ( APSE_R, PLINTH ), ( APSE_R, EAVES - 0.2 ) ], 'wall' )
	turned( [ ( APSE_R + 0.07, EAVES - 1.5 ), ( APSE_R + 0.07, EAVES - 1.32 ) ], 'trim' )
	turned( [ ( APSE_R + 0.12, EAVES - 0.45 ), ( APSE_R + 0.12, EAVES - 0.25 ), ( APSE_R + 0.32, EAVES - 0.25 ), ( APSE_R + 0.32, EAVES ) ], 'trim' )
	turned( [ ( APSE_R + 0.32 + OVER, EAVES - 0.05 ), ( 0.12, APSE_TOP ) ], 'tile' )
	turned( [ ( 0.12, APSE_TOP - 0.05 ), ( 0.16, APSE_TOP + 0.25 ), ( 0.03, APSE_TOP + 0.7 ) ], 'spire', seg=10 )

	# ---- the annexes: a room against the rear of each flank, its gable facing outward
	for side, x_out, x_in, y0, front_window in ( ( - 1, L_X0, NAVE_X0, L_Y0, True ), ( 1, R_X1, NAVE_X1, R_Y0, False ) ):
		xa, xb = min( x_out, x_in ), max( x_out, x_in )
		ym, rise = ( y0 + ANNEX_BACK ) / 2, ANNEX_PITCH * ( ANNEX_BACK - y0 ) / 2
		S.box( xa - 0.05, xb + 0.05, y0 - 0.05, ANNEX_BACK + 0.05, 0, PLINTH * 0.6, 'plinth' )
		S.box( xa, xb, y0, ANNEX_BACK, PLINTH * 0.6, ANNEX_EAVES, 'wall' )
		# its rear wall runs on past the nave's corner to the apse's round
		meet = AXIS + side * ( APSE_MEET - 0.3 )
		S.box( min( x_in, meet ), max( x_in, meet ), NAVE_BACK - 0.2, ANNEX_BACK, 0, ANNEX_EAVES, 'wall' )
		S.box( min( x_in, meet ), max( x_in, meet ), NAVE_BACK - 0.2, ANNEX_BACK + 0.05, 0, PLINTH * 0.6, 'plinth' )
		# the gable, and the roof from it back to the nave's wall
		S.prism( [ ( y0, ANNEX_EAVES ), ( ANNEX_BACK, ANNEX_EAVES ), ( ym, ANNEX_EAVES + rise ) ], x_out, x_out + side * - 0.3, 'wall', 'yz' )
		over = 0.3
		ridge = [ ( y0 - over, ANNEX_EAVES - ANNEX_PITCH * over ), ( ANNEX_BACK + over, ANNEX_EAVES - ANNEX_PITCH * over ), ( ANNEX_BACK + over, ANNEX_EAVES - ANNEX_PITCH * over + 0.14 ),
			( ym, ANNEX_EAVES + rise + 0.14 ), ( y0 - over, ANNEX_EAVES - ANNEX_PITCH * over + 0.14 ) ]
		S.prism( ridge, x_out + side * 0.25, meet, 'tile', 'yz' )
		S.box( min( x_out + side * 0.25, x_in ), max( x_out + side * 0.25, x_in ), ym - RIDGE_CAP, ym + RIDGE_CAP, ANNEX_EAVES + rise + 0.1, ANNEX_EAVES + rise + 0.18, 'ridge' )
		# three square windows in the gable wall
		n = 3
		for k in range( n ):
			c = y0 + ( ANNEX_BACK - y0 ) * ( k + 0.5 ) / n
			wall_box( S, 'yz', c - 0.6, c + 0.6, 1.25, 2.65, x_out, side * 0.05, 'door' )
			wall_box( S, 'yz', c - 0.5, c + 0.5, 1.35, 2.55, x_out + side * 0.05, side * 0.02, 'glass' )
		# the door in the front wall, under a small canopy; a window beside it where there is room
		dc = ( xa + xb ) / 2 + side * 0.5
		S.box( dc - 0.55, dc + 0.55, y0 - 0.06, y0, PLINTH * 0.6, 2.5, 'door' )
		S.box( dc - 0.85, dc + 0.85, y0 - 0.8, y0, 2.62, 2.74, 'door' )
		S.ledge( dc - 0.8, dc + 0.8, y0 - 0.7, y0, 0, PLINTH * 0.6, 'paving' )
		if front_window:
			wc = dc - side * 1.9
			S.box( wc - 0.5, wc + 0.5, y0 - 0.05, y0, 1.25, 2.55, 'door' )
			S.box( wc - 0.42, wc + 0.42, y0 - 0.07, y0 - 0.05, 1.33, 2.47, 'glass' )

	# ---- the tower: the facade's middle bay carried up
	TY1 = TY0 + TOWER_W
	x0, x1 = AXIS - HT, AXIS + HT
	faces = ( ( 'xz', AXIS, TY0, - 1 ), ( 'xz', AXIS, TY1, 1 ), ( 'yz', TCY, x0, - 1 ), ( 'yz', TCY, x1, 1 ) )
	S.box( x0 - 0.06, x1 + 0.06, TY0 - 0.06, TY0 + 1.0, 0, PLINTH, 'plinth' )
	S.box( x0, x1, TY0, TY1, PLINTH, BELFRY - 0.25, 'wall' )
	# the string course and the cornice carried round the bay; pilaster strips up its edges
	S.box( x0 - 0.07, x1 + 0.07, TY0 - 0.07, TY0 + 1.0, EAVES - 1.5, EAVES - 1.32, 'trim' )
	for a, b in ( ( x0, x0 + 0.45 ), ( x1 - 0.45, x1 ) ): S.box( a, b, TY0 - 0.08, TY0, PLINTH, EAVES - 1.5, 'trim' )
	cornice( S, x0, x1, TY0, TY0 + 1.0, EAVES )
	# the round arch that stands on the cornice over the bay
	ro, ri = HT - 0.05, HT - 0.5
	ring = [ ( AXIS + ro * math.cos( math.pi * k / 16 ), EAVES + ro * math.sin( math.pi * k / 16 ) ) for k in range( 17 ) ]
	ring += [ ( AXIS + ri * math.cos( math.pi * k / 16 ), EAVES + ri * math.sin( math.pi * k / 16 ) ) for k in range( 16, - 1, - 1 ) ]
	S.prism( ring, TY0 - 0.2, TY0, 'trim' )
	# the door up two steps under its canopy, and the window over it in a heavy surround
	S.ledge( AXIS - 1.5, AXIS + 1.5, TY0 - 0.9, TY0, 0, 0.17, 'paving' )
	S.ledge( AXIS - 1.2, AXIS + 1.2, TY0 - 0.55, TY0, 0.17, 0.34, 'paving' )
	S.box( AXIS - 0.95, AXIS + 0.95, TY0 - 0.08, TY0, 0.34, 3.05, 'trim' )
	S.box( AXIS - 0.75, AXIS + 0.75, TY0 - 0.12, TY0 - 0.08, 0.34, 2.85, 'door' )
	canopy = [ ( TY0 - 1.0, 3.2 ), ( TY0, 3.55 ), ( TY0, 3.67 ), ( TY0 - 1.0, 3.32 ) ]
	S.prism( canopy, AXIS - 1.25, AXIS + 1.25, 'door', 'yz' )
	for sx in ( - 1, 1 ): S.box( AXIS + sx * 1.15 - 0.04, AXIS + sx * 1.15 + 0.04, TY0 - 0.9, TY0, 3.05, 3.2, 'door' )
	opening( S, 'xz', AXIS, 4.5, 1.0, 2.1, TY0, - 0.07, 'glass', surround=0.3 )
	# its frame: a post and a bar across, in dark wood
	S.box( AXIS - 0.04, AXIS + 0.04, TY0 - 0.11, TY0 - 0.098, 4.5, 6.55, 'door' )
	S.box( AXIS - 0.5, AXIS + 0.5, TY0 - 0.11, TY0 - 0.098, 5.55, 5.63, 'door' )
	# the downpipes in the corners between the bay and the facade
	for sx in ( - 1, 1 ): S.pole( AXIS + sx * ( HT + 0.09 ), FRONT - 0.09, 0, EAVES - 0.3, 0.06, 0.06, 'pipe' )
	# the stage between the eaves and the first cornice: a louvred opening to the front
	opening( S, 'xz', AXIS, 10.6, 0.9, 2.2, TY0, - 0.06, 'louvre' )
	cornice( S, x0, x1, TY0, TY1, STAGE )
	S.lathe( [ ( ( HT + 0.32 ) * math.sqrt( 2 ), STAGE ), ( HT * math.sqrt( 2 ), STAGE + 0.3 ) ], AXIS, TCY, 'trim', seg=4, turn=math.pi / 4 )
	# the belfry: strips up its corners and a louvred opening in each face
	for plane, c, face, s in faces:
		for e in ( - 1, 1 ):
			wall_box( S, plane, c + e * HT, c + e * ( HT - 0.42 ), STAGE + 0.3, BELFRY - 0.45, face, s * 0.06, 'trim' )
		opening( S, plane, c, 15.4, 0.9, 2.4, face, s * 0.06, 'louvre' )
	cornice( S, x0, x1, TY0, TY1, BELFRY )
	# a gable with a clock on each face, and the roofs that run back from them
	g = HT + 0.32
	for plane, c, face, s in faces:
		tri = [ ( c - g, BELFRY ), ( c + g, BELFRY ), ( c, GABLE ) ]
		S.prism( tri, face + s * 0.3, face - s * 0.25, 'wall', plane )
		# its raking coping
		S.prism( [ ( c - g - 0.12, BELFRY ), ( c - g + 0.1, BELFRY ), ( c, GABLE - 0.12 ), ( c + g - 0.1, BELFRY ), ( c + g + 0.12, BELFRY ), ( c, GABLE + 0.14 ) ], face + s * 0.36, face + s * 0.22, 'trim', plane )
		# the clock: a white face in a dark rim
		cz = BELFRY + ( GABLE - BELFRY ) * 0.42
		disc = lambda r, n=20: [ ( c + r * math.cos( 2 * math.pi * k / n ), cz + r * math.sin( 2 * math.pi * k / n ) ) for k in range( n ) ]
		S.prism( disc( 0.52 ), face + s * 0.3, face + s * 0.34, 'clock', plane )
		for k in range( 12 ):
			ang = 2 * math.pi * k / 12
			ca, sa = math.cos( ang ), math.sin( ang )
			mark = [ ( c + r * ca - w * sa, cz + r * sa + w * ca ) for r, w in ( ( 0.3, - 0.025 ), ( 0.47, - 0.035 ), ( 0.47, 0.035 ), ( 0.3, 0.025 ) ) ]
			S.prism( mark, face + s * 0.34, face + s * 0.35, 'stone', plane )
		for ang, ln in ( ( math.radians( 60 ), 0.22 ), ( math.radians( - 150 ), 0.36 ) ):
			hand = [ ( c + 0.025 * math.sin( ang ), cz - 0.025 * math.cos( ang ) ), ( c + ln * math.cos( ang ), cz + ln * math.sin( ang ) ), ( c - 0.025 * math.sin( ang ), cz + 0.025 * math.cos( ang ) ) ]
			S.prism( hand, face + s * 0.35, face + s * 0.36, 'gold', plane )
	roof = [ ( - g - 0.05, BELFRY ), ( g + 0.05, BELFRY ), ( 0, GABLE ) ]
	S.prism( [ ( AXIS + a, z ) for a, z in roof ], TY0 - 0.2, TY1 + 0.2, 'spire', 'xz' )
	S.prism( [ ( TCY + a, z ) for a, z in roof ], x0 - 0.2, x1 + 0.2, 'spire', 'yz' )
	# the spire: eight sides, an edge over the middle of each face and over each corner. Face on it
	# is 2.8 m across at the gables' apex (158 px against the cornice's 220 in drone5 f012 enlarged),
	# and runs straight to the point.
	edge = lambda z: 1.4 * ( POINT - z ) / ( POINT - GABLE )
	S.lathe( [ ( edge( BELFRY + 0.15 ), BELFRY + 0.15 ), ( 0.02, POINT ) ], AXIS, TCY, 'spire', seg=8 )
	# the gilt ball and the cross
	S.lathe( [ ( 0.03, POINT - 0.05 ), ( 0.2, POINT + 0.08 ), ( 0.26, POINT + 0.28 ), ( 0.2, POINT + 0.48 ), ( 0.03, POINT + 0.56 ) ], AXIS, TCY, 'gold', seg=12, soft=True )
	z = POINT + 0.56
	S.box( AXIS - 0.035, AXIS + 0.035, TCY - 0.035, TCY + 0.035, z, CROSS, 'iron' )
	S.box( AXIS - 0.5, AXIS + 0.5, TCY - 0.03, TCY + 0.03, z + 1.15, z + 1.22, 'iron' )
	for a in ( 45, 135 ):       # the rays between the arms
		c, s = math.cos( math.radians( a ) ) * 0.3, math.sin( math.radians( a ) ) * 0.3
		S.shell( [ ( AXIS - c, TCY - 0.02, z + 1.185 - s - 0.02 ), ( AXIS + c, TCY - 0.02, z + 1.185 + s - 0.02 ), ( AXIS + c, TCY - 0.02, z + 1.185 + s + 0.02 ), ( AXIS - c, TCY - 0.02, z + 1.185 - s + 0.02 ),
			( AXIS - c, TCY + 0.02, z + 1.185 - s - 0.02 ), ( AXIS + c, TCY + 0.02, z + 1.185 + s - 0.02 ), ( AXIS + c, TCY + 0.02, z + 1.185 + s + 0.02 ), ( AXIS - c, TCY + 0.02, z + 1.185 - s + 0.02 ) ],
			[ ( 0, 1, 2, 3 ), ( 7, 6, 5, 4 ), ( 0, 4, 5, 1 ), ( 3, 2, 6, 7 ) ], 'iron' )


def run( S, a, b, make ):
	"""Lay something along the ground from a to b ( x, y ): make( at, length ) is given a function that
	turns ( along, across, z ) into a point, and the length of the run."""
	l = math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] )
	tx, ty = ( b[ 0 ] - a[ 0 ] ) / l, ( b[ 1 ] - a[ 1 ] ) / l
	make( lambda t, o, z: ( a[ 0 ] + tx * t - ty * o, a[ 1 ] + ty * t + tx * o, z ), l )


def slab( S, at, t0, t1, o0, o1, z0, z1, mat ):
	"""A box along a run: from t0 to t1 along it, o0 to o1 across, z0 to z1; no face under it."""
	v = [ at( t, o, z ) for z in ( z0, z1 ) for o in ( o0, o1 ) for t in ( t0, t1 ) ]
	S.shell( v, [ ( 4, 5, 7, 6 ), ( 0, 1, 5, 4 ), ( 2, 6, 7, 3 ), ( 0, 4, 6, 2 ), ( 1, 3, 7, 5 ) ], mat )


def pillar( S, x, y ):
	h, c = PILLAR / 2, PILLAR / 2 + 0.07
	S.post( x - h, x + h, y - h, y + h, - 0.3, PILLAR_H, 'brick' )
	S.post( x - c, x + c, y - c, y + c, PILLAR_H, PILLAR_H + 0.12, 'stone' )
	S.lathe( [ ( c * math.sqrt( 2 ) * 0.86, PILLAR_H + 0.12 ), ( 0.16, PILLAR_H + 0.34 ), ( 0.1, PILLAR_H + 0.4 ), ( 0.17, PILLAR_H + 0.52 ), ( 0.03, PILLAR_H + 0.66 ) ], x, y, 'stone', seg=4, turn=math.pi / 4 )


def iron_fence( S, a, b ):
	"""Between two pillars: the brick base under a stone coping, and the iron on it."""
	def make( at, l ):
		t0, t1 = PILLAR / 2, l - PILLAR / 2
		slab( S, at, t0, t1, - BASE_T / 2, BASE_T / 2, - 0.3, BASE_H, 'brick' )
		slab( S, at, t0, t1, - BASE_T / 2 - 0.03, BASE_T / 2 + 0.03, BASE_H, BASE_H + 0.06, 'stone' )
		for z in ( BASE_H + 0.2, IRON_TOP - 0.18 ): slab( S, at, t0, t1, - 0.012, 0.012, z, z + 0.035, 'iron' )
		n = max( 1, round( ( t1 - t0 ) / PICKET_GAP ) )
		for k in range( n ):
			t = t0 + ( t1 - t0 ) * ( k + 0.5 ) / n
			# every fourth picket stands taller, as the iron's rhythm does in drone1 f_020
			top = IRON_TOP + ( 0.12 if k % 4 == 0 else 0 )
			v = [ at( t + dt, do, z ) for z in ( BASE_H + 0.06, top ) for dt, do in ( ( - PICKET / 2, - PICKET / 2 ), ( PICKET / 2, - PICKET / 2 ), ( PICKET / 2, PICKET / 2 ), ( - PICKET / 2, PICKET / 2 ) ) ]
			S.shell( v, [ ( 0, 1, 5, 4 ), ( 1, 2, 6, 5 ), ( 2, 3, 7, 6 ), ( 3, 0, 4, 7 ) ], 'iron' )
	run( S, a, b, make )


def brick_wall( S, a, b ):
	def make( at, l ):
		slab( S, at, 0, l, - WALL_T / 2, WALL_T / 2, - 0.3, WALL_H, 'brick' )
		slab( S, at, 0, l, - WALL_T / 2 - 0.04, WALL_T / 2 + 0.04, WALL_H, WALL_H + 0.07, 'stone' )
	run( S, a, b, make )


def gate_leaf( S, hinge, swing ):
	"""An iron leaf standing open into the yard from its hinge: swing = +1 or -1, the side of the
	gateway it is on."""
	x, y, w = hinge[ 0 ], hinge[ 1 ], GATE_W / 2 - 0.05
	def make( at, l ):
		for z in ( 0.12, 1.0, IRON_TOP ): slab( S, at, 0, l, - 0.015, 0.015, z, z + 0.04, 'iron' )
		for t in ( 0.02, l - 0.02 ): slab( S, at, t - 0.02, t + 0.02, - 0.02, 0.02, 0.08, IRON_TOP + 0.25, 'iron' )
		n = round( l / PICKET_GAP )
		for k in range( 1, n ):
			t = l * k / n
			v = [ at( t + dt, do, z ) for z in ( 0.12, IRON_TOP + 0.25 * math.sin( math.pi * k / n ) ) for dt, do in ( ( - PICKET / 2, - PICKET / 2 ), ( PICKET / 2, - PICKET / 2 ), ( PICKET / 2, PICKET / 2 ), ( - PICKET / 2, PICKET / 2 ) ) ]
			S.shell( v, [ ( 0, 1, 5, 4 ), ( 1, 2, 6, 5 ), ( 2, 3, 7, 6 ), ( 3, 0, 4, 7 ) ], 'iron' )
	run( S, ( x, y + 0.1 ), ( x + swing * 0.25, y + 0.1 + w ), make )


def gateway():
	"""The two pillars of the gate, on the front fence: their middles ( x, y )."""
	return ( AXIS - GATE_W / 2 - PILLAR / 2, FENCE_Y ), ( AXIS + GATE_W / 2 + PILLAR / 2, FENCE_Y )


def fence_runs():
	"""The yard's boundary as runs between pillars or corners: ( a, b, kind ), kind 'iron' or 'brick'.
	The front is broken by the gateway."""
	out = []
	for i in range( len( YARD ) ):
		a, b = YARD[ i ], YARD[ ( i + 1 ) % len( YARD ) ]
		kind = 'iron' if i < STREET_SIDES else 'brick'
		if kind == 'brick': out.append( ( a, b, kind ) ); continue
		legs = [ ( a, gateway()[ 0 ] ), ( gateway()[ 1 ], b ) ] if i == 0 else [ ( a, b ) ]
		for p, q in legs:
			n = max( 1, math.ceil( math.hypot( q[ 0 ] - p[ 0 ], q[ 1 ] - p[ 1 ] ) / PILLAR_GAP ) )
			for k in range( n ):
				lerp = lambda t: ( p[ 0 ] + ( q[ 0 ] - p[ 0 ] ) * t, p[ 1 ] + ( q[ 1 ] - p[ 1 ] ) * t )
				out.append( ( lerp( k / n ), lerp( ( k + 1 ) / n ), kind ) )
	return out


def paved():
	"""The paving as outlines ( x, y ): the forecourt, and a walk along each flank to its annex's door."""
	g0, g1 = AXIS - GATE_W / 2, AXIS + GATE_W / 2
	return [
		[ ( g0, FENCE_Y ), ( g1, FENCE_Y ), ( AXIS + APRON, FRONT - 2.0 ), ( AXIS + APRON, FRONT ), ( AXIS + HT, FRONT ), ( AXIS + HT, TY0 ), ( AXIS - HT, TY0 ), ( AXIS - HT, FRONT ), ( AXIS - APRON, FRONT ), ( AXIS - APRON, FRONT - 2.0 ) ],
		[ ( NAVE_X1, FRONT ), ( NAVE_X1 + WALK, FRONT ), ( NAVE_X1 + WALK, R_Y0 - 0.9 ), ( R_X1, R_Y0 - 0.9 ), ( R_X1, R_Y0 ), ( NAVE_X1, R_Y0 ) ],
		[ ( NAVE_X0 - WALK, FRONT ), ( NAVE_X0, FRONT ), ( NAVE_X0, L_Y0 ), ( L_X0, L_Y0 ), ( L_X0, L_Y0 - 0.9 ), ( NAVE_X0 - WALK, L_Y0 - 0.9 ) ],
	]


def yard( S ):

	runs = fence_runs()
	posts = set()
	for a, b, kind in runs:
		if kind == 'iron':
			iron_fence( S, a, b )
			posts.update( ( ( round( a[ 0 ], 3 ), round( a[ 1 ], 3 ) ), ( round( b[ 0 ], 3 ), round( b[ 1 ], 3 ) ) ) )
		else: brick_wall( S, a, b )
	for x, y in posts: pillar( S, x, y )
	( lx, ly ), ( rx, ry ) = gateway()
	gate_leaf( S, ( lx + PILLAR / 2, ly ), - 1 )
	gate_leaf( S, ( rx - PILLAR / 2, ry ), 1 )
	# the paving, a slab's thickness above the lawn
	for outline in paved(): S.prism( outline[ ::- 1 ], 0.0, 0.04, 'paving', 'xy' )
	# the crucifix by the path: a stone foot and an iron cross
	cx, cy = CRUCIFIX
	S.post( cx - 0.45, cx + 0.45, cy - 0.45, cy + 0.45, 0, 0.25, 'stone' )
	S.post( cx - 0.3, cx + 0.3, cy - 0.3, cy + 0.3, 0.25, 1.2, 'stone' )
	S.post( cx - 0.38, cx + 0.38, cy - 0.38, cy + 0.38, 1.2, 1.32, 'stone' )
	S.box( cx - 0.05, cx + 0.05, cy - 0.05, cy + 0.05, 1.32, 3.3, 'iron' )
	S.box( cx - 0.55, cx + 0.55, cy - 0.04, cy + 0.04, 2.6, 2.7, 'iron' )
	# the stone cross on the right lawn
	cx, cy = STONE_CROSS
	S.post( cx - 0.4, cx + 0.4, cy - 0.3, cy + 0.3, 0, 0.2, 'stone' )
	S.post( cx - 0.28, cx + 0.28, cy - 0.2, cy + 0.2, 0.2, 1.15, 'stone' )
	S.box( cx - 0.09, cx + 0.09, cy - 0.07, cy + 0.07, 1.15, 2.1, 'stone' )
	S.box( cx - 0.33, cx + 0.33, cy - 0.07, cy + 0.07, 1.62, 1.8, 'stone' )
	# the notice board by the gate: two posts and a board under a little roof
	cx, cy = NOTICE
	for sx in ( - 0.55, 0.55 ): S.post( cx + sx - 0.04, cx + sx + 0.04, cy - 0.04, cy + 0.04, 0, 1.75, 'door' )
	S.box( cx - 0.55, cx + 0.55, cy - 0.03, cy + 0.03, 0.85, 1.6, 'stone' )
	S.box( cx - 0.7, cx + 0.7, cy - 0.12, cy + 0.12, 1.75, 1.8, 'door' )


# ---- PLAN: what the game needs to know of the model besides its shape, as custom properties of the
# object. Each is a flat list of numbers in the game's frame for a model: x as here, z = -y (the front
# toward +z).
#   outline   the walls' ring on the ground: x, z, x, z, ... (the apse as a half octagon and a half)
#   boxes     what cannot be walked through, five numbers each: x0, x1, z0, z1, top
#   walls     the yard's fence and walls, five numbers each: from x, z to x, z, and the height
#   yard      the yard's ring: x, z, ...
#   paved     the paved outlines, each as its count of points and then x, z, ...
#   trees     the trees of the grounds, three numbers each: x, z, height
def plan():
	g = lambda pts: [ c for x, y in pts for c in ( round( x, 3 ), round( - y, 3 ) ) ]
	# the apse's round between the two annexes' rear walls
	a0, n = math.asin( ( ANNEX_BACK - NAVE_BACK ) / APSE_R ), 6
	apse = [ ( AXIS + APSE_R * math.cos( a0 + ( math.pi - 2 * a0 ) * k / n ), NAVE_BACK + APSE_R * math.sin( a0 + ( math.pi - 2 * a0 ) * k / n ) ) for k in range( n + 1 ) ]
	outline = [ ( NAVE_X0, FRONT ), ( AXIS - HT, FRONT ), ( AXIS - HT, TY0 ), ( AXIS + HT, TY0 ), ( AXIS + HT, FRONT ), ( NAVE_X1, FRONT ), ( NAVE_X1, R_Y0 ), ( R_X1, R_Y0 ), ( R_X1, ANNEX_BACK ) ]
	outline += apse + [ ( L_X0, ANNEX_BACK ), ( L_X0, L_Y0 ), ( NAVE_X0, L_Y0 ) ]
	box = lambda x0, x1, y0, y1, top: [ round( x0, 3 ), round( x1, 3 ), round( - y1, 3 ), round( - y0, 3 ), round( top, 3 ) ]
	# the nave with the annexes' rear walls across its end; the tower; the annexes
	boxes = box( NAVE_X0, NAVE_X1, FRONT, ANNEX_BACK, RIDGE ) + box( AXIS - HT, AXIS + HT, TY0, TY0 + TOWER_W, CROSS )
	boxes += box( L_X0, NAVE_X0, L_Y0, ANNEX_BACK, ANNEX_EAVES ) + box( NAVE_X1, R_X1, R_Y0, ANNEX_BACK, ANNEX_EAVES )
	# what of the apse stands past the rear walls, as the rectangle inside its round; the monuments
	deep = NAVE_BACK + APSE_R * math.sin( ( a0 + math.pi / 2 ) / 2 )
	boxes += box( AXIS - APSE_R * math.cos( ( a0 + math.pi / 2 ) / 2 ), AXIS + APSE_R * math.cos( ( a0 + math.pi / 2 ) / 2 ), ANNEX_BACK, deep, EAVES )
	boxes += box( CRUCIFIX[ 0 ] - 0.45, CRUCIFIX[ 0 ] + 0.45, CRUCIFIX[ 1 ] - 0.45, CRUCIFIX[ 1 ] + 0.45, 3.3 )
	boxes += box( STONE_CROSS[ 0 ] - 0.4, STONE_CROSS[ 0 ] + 0.4, STONE_CROSS[ 1 ] - 0.3, STONE_CROSS[ 1 ] + 0.3, 2.1 )
	walls = []
	for a, b, kind in fence_runs(): walls += g( [ a, b ] ) + [ IRON_TOP if kind == 'iron' else WALL_H ]
	pav = []
	for outline_ in paved(): pav += [ len( outline_ ) ] + g( outline_ )
	trees = [ c for x, y, h in TREES for c in ( x, - y, h ) ]
	return dict( outline=g( outline ), boxes=boxes, walls=walls, yard=g( YARD ), paved=pav, trees=trees )


def build():
	scene = fresh_scene( 'StAndrew' )
	mats = make_materials( MATERIALS )
	S = Shells()
	church( S )
	yard( S )
	ob = S.object( 'StAndrew', mats, scene.collection, plan() )
	os.makedirs( os.path.dirname( OUT ), exist_ok=True )
	export_glb( scene, OUT )
	me = ob.data
	return dict( vertices=len( me.vertices ), triangles=sum( len( p.vertices ) - 2 for p in me.polygons ),
		height=round( max( v.co.z for v in me.vertices ), 2 ), ridge=round( RIDGE, 2 ), fence_runs=len( fence_runs() ) )


result = build()
print( 'st-andrew:', result, '->', OUT )
