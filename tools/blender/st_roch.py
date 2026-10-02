"""Crkva svetog Roka, Rokovci: the parish church and its yard, modelled from photographs, drone footage,
the state orthophoto and its mapped footprint.

Run inside Blender:

    blender --background --python tools/blender/st_roch.py
    # or, in a running Blender (it builds in a scene of its own):
    #   REPO = r'<repo>'; exec( compile( open( REPO + r'/tools/blender/st_roch.py', encoding='utf-8' ).read(), 'st_roch.py', 'exec' ), { 'REPO': REPO } )

Writes public/models/slavonia/st-roch.glb: one mesh, one primitive per material, colours as
material base colours. The game stands it on the church's footprint (src/regions/slavonia/Landmarks.js)
and takes the church's plan and its grounds from the model's custom properties (PLAN below).

Frame: metres, z up, origin on the ground at the centre of the footprint's bounding rectangle, the
front (tower, door) facing -y: toward Ulica Stjepana Radica, north-east. Seen from that street, +x is
to the right: the side of Vinkovacka ulica, north-west.

What each number rests on:

  FOOTPRINT (OpenStreetMap, public/world/bosut/places.json, 'Crkva Svetog Roka'):
    the nave is 11.2 m wide and 20.2 m long; a 5.0 x 9.3 m annex (the sacristy) stands against the
    rear of one flank; the narrow end faces Ulica Stjepana Radica.

  PHOTOGRAPHS (docs/slavonia/rokovci/):
    9e68...jpeg, the front view: the facade is 162 px across, so 14.5 px to the metre, and heights
      are read off it from the ground line.
    ROKOVCI-01.jpg, the three-quarter view: the same levels read up the tower's corner agree with
      the front view to a few per cent as ratios to the main cornice (stage cornice 1.34 / 1.33,
      belfry sill 1.54 / 1.58, tower cornice 1.98 / 2.09, top of the cross 3.08 / 3.0). The dome is
      measured here: heights at 50 px to the metre and widths at 47, both fixed by the belfry
      opening and the tower's faces beside it. Both photographs look up, which squeezes the top of
      the tower, the front view more: the dome's height is the least certain figure here, good to
      about a metre.
    Colours are sampled from the three-quarter view's sunlit surfaces (the facade itself is in
      shade there) and scaled so that the sunlit white trim is a 0.85 limewash.

  ORTHOPHOTO (DGU geoportal WMS, layer DOF_LIDAR_2022_2023, read at 5 cm a pixel):
    the mapped footprint lies on the roof as it is (the survey's fit moved it two metres onto its
    shadow; a landmark keeps the place its own script was measured on). The tower's metal top lies at
    the north-east end, the roof is hipped round the south-west end, where the parish house's
    roofs stand against it. The yard: its fence on the street side 6.7 m before the facade; a
    neighbour's wall 4.2 m left of the nave; on the right the yard widens to the corner of the two
    streets, where a tree's crown 13 m across stands 17 m right of the middle and 2 m before the
    facade's line, and a white stone 10.6 m right and 3.3 m before it.

  DRONE FOOTAGE (drone1 at 15-27 s: the street tour passes along the north-west flank):
    the east end is three-sided, a window in each slanting wall, under a roof hipped round it
    with a cross on its point; the flank has three arched windows between plain pilaster strips,
    and before them, by the tower, a narrow bay with a small square window low and one high; a
    black iron fence on a low concrete foot runs along the pavement; the white stone is a cross on
    a stepped foot, taller than the fence twice over; the tree is a pollarded lime as tall as the
    eaves and half again.

  ASSUMED (to be corrected from more pictures):
    how deep the three-sided end is (3.2 m) and the south-east flank (built as the north-west one,
    less what the sacristy covers); the sacristy's height and roof; the fence's line where the
    tree and the church's own shadow hide it on the orthophoto (the yard's north corner and its
    side on Vinkovacka ulica); the spacing of the fence's posts; the paved way from the gate.
    Left out: the lettering '2000' on the bulb, the snow guards on the roof, the white ornaments in
    the fence's panels.
"""
import bpy, math, os

ROOT = globals().get( 'REPO' ) or os.path.dirname( os.path.dirname( os.path.dirname( os.path.abspath( __file__ ) ) ) )
OUT = os.path.join( ROOT, 'public', 'models', 'slavonia', 'st-roch.glb' )
exec( compile( open( os.path.join( ROOT, 'tools', 'blender', 'shells.py' ), encoding='utf-8' ).read(), 'shells.py', 'exec' ) )
exec( compile( open( os.path.join( ROOT, 'tools', 'blender', 'grounds.py' ), encoding='utf-8' ).read(), 'grounds.py', 'exec' ) )

# ---- plan, from the footprint
W = 11.2                      # facade / nave width
LEN = 20.2                    # nave length, the three-sided end included
RECT_W = 16.2                 # the footprint's bounding rectangle across the nave (nave + sacristy)
SAC_W, SAC_L = 5.0, 9.3       # the sacristy's plan
NAVE_X0, NAVE_X1 = - RECT_W / 2 + SAC_W, RECT_W / 2      # the sacristy takes its width at -x
AXIS = ( NAVE_X0 + NAVE_X1 ) / 2                          # the nave's centreline
FRONT, BACK = - LEN / 2, LEN / 2
SAC_Y0 = BACK - SAC_L
APSE = 3.2                    # the three-sided end: this deep, its corners cut back by as much
APSE_Y = BACK - APSE

# ---- levels, from the photographs (metres above the ground)
CORNICE = 8.7                 # top of the main cornice, the eaves
STAGE = 11.9                  # top of the cornice where the pediment meets the tower
BELFRY_SILL, BELFRY_H, BELFRY_W = 13.8, 2.6, 1.0
TOWER_TOP = 17.9              # top of the tower's cornice, where the metal begins
TOWER_W = 4.1
HT = TOWER_W / 2
SLOPE = 0.716                 # the roof's rise per metre, which the pediment's rake follows
RIDGE = CORNICE + SLOPE * W / 2
OVER = 0.45                   # the roof past the wall
BAYS = 4                      # along each flank, between the facade and the three-sided end

# ---- the yard, clockwise from its front left corner as seen from the street ( x, y )
FENCE_Y = FRONT - 6.7
# ( past the fence the yard goes round the corner of the house behind the church on Vinkovacka ulica,
# half a metre off its walls as traced on the orthophoto: Survey.js ADDED )
YARD = [ ( NAVE_X0 - 4.2, FENCE_Y ), ( 10.0, FENCE_Y ), ( 21.0, - 13.0 ), ( 22.0, 3.0 ), ( 9.0, 12.3 ), ( 1.0, 15.9 ), ( - 4.5, 12.7 ), ( - 8.4, 13.5 ), ( - 8.4, 0.4 ), ( NAVE_X0 - 4.2, 0.4 ) ]
STREET_SIDES = 5              # the first sides of YARD are fenced: the rest are the neighbours' walls
GATE_W, GATE_AT = 3.0, 14.2   # the gate: in the front fence, this far along it (ROKOVCI-01.jpg: right of the facade, the stone cross behind it to its right)
POST, POST_H, POST_GAP = 0.07, 1.62, 2.6
FENCE = dict( base=( 0.3, 0.2, 'plinth', None ), top=1.5, picket=( 0.016, 0.14 ), tall=None, ends=POST / 2 )
PATH = 3.0                    # how far the paved apron reaches before the door
STONE = ( 10.6, FRONT - 3.3 ) # the stone cross
TREES = [ ( 17.0, FRONT - 2.0, 13.0 ) ]

# name: ( sRGB 0-255, roughness, metallic )
MATERIALS = {
	'wall': ( ( 232, 216, 180 ), 0.92, 0.0 ),      # the render's warm yellow
	'trim': ( ( 238, 234, 220 ), 0.90, 0.0 ),      # the cream white of pilasters, cornices and surrounds
	'plinth': ( ( 190, 180, 160 ), 0.94, 0.0 ),
	'tile': ( ( 176, 128, 108 ), 0.86, 0.0 ),      # pale clay tile
	'dome': ( ( 74, 77, 79 ), 0.50, 0.70 ),        # weathered dark sheet metal
	'door': ( ( 55, 40, 30 ), 0.70, 0.0 ),
	'glass': ( ( 45, 50, 58 ), 0.25, 0.0 ),
	'louvre': ( ( 40, 40, 42 ), 0.80, 0.0 ),
	'iron': ( ( 30, 30, 32 ), 0.60, 0.8 ),
	'stone': ( ( 226, 222, 210 ), 0.90, 0.0 ),     # the white stone of the cross
	'paving': ( ( 150, 148, 144 ), 0.92, 0.0 ),
}


def cushion( S, levels, cx, cy, mat, power=10, seg=40 ):
	"""Stack rounded-square sections ( half size, z ): |x|^p + |y|^p = a^p, the faces nearly flat
	in plan and the corners tight. This is how the dome's bulbs are made: four bulging faces
	meeting at ridges over the tower's corners, not a ball."""
	v, f = [], []
	e = 2.0 / power
	for a, z in levels:
		for k in range( seg ):
			t = 2 * math.pi * ( k + 0.5 ) / seg
			c, s_ = math.cos( t ), math.sin( t )
			v.append( ( cx + a * math.copysign( abs( c ) ** e, c ), cy + a * math.copysign( abs( s_ ) ** e, s_ ), z ) )
	for i in range( len( levels ) - 1 ):
		for k in range( seg ):
			a, b = i * seg + k, i * seg + ( k + 1 ) % seg
			f.append( ( a, b, b + seg, a + seg ) )
	f.append( tuple( range( seg - 1, - 1, - 1 ) ) )
	f.append( tuple( range( ( len( levels ) - 1 ) * seg, len( levels ) * seg ) ) )
	S.shell( v, f, mat, smooth=True )


def square_loft( S, levels, cx, cy, mat ):
	"""Stack square sections ( half size, z ), aligned with the tower."""
	v, f = [], []
	for h, z in levels:
		v += [ ( cx - h, cy - h, z ), ( cx + h, cy - h, z ), ( cx + h, cy + h, z ), ( cx - h, cy + h, z ) ]
	for i in range( len( levels ) - 1 ):
		for k in range( 4 ):
			a, b = i * 4 + k, i * 4 + ( k + 1 ) % 4
			f.append( ( a, b, b + 4, a + 4 ) )
	f.append( ( 3, 2, 1, 0 ) )
	n = ( len( levels ) - 1 ) * 4
	f.append( ( n, n + 1, n + 2, n + 3 ) )
	S.shell( v, f, mat )


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


def panel( S, plane, c0, c1, z0, z1, face, out ):
	"""A blank panel: a thin white frame on the wall, the field inside it left as wall."""
	t = 0.09
	for a, b, za, zb in ( ( c0, c1, z0, z0 + t ), ( c0, c1, z1 - t, z1 ), ( c0, c0 + t, z0, z1 ), ( c1 - t, c1, z0, z1 ) ):
		wall_box( S, plane, a, b, za, zb, face, out, 'trim' )


def nave( d=0.0 ):
	"""The nave's outline on the ground, anticlockwise from its front left corner, standing d
	metres outside its walls: a rectangle whose rear corners are cut back for the three-sided end."""
	k = d * math.tan( math.pi / 8 )       # how far a 135 degree corner's point moves along its walls
	return [ ( NAVE_X0 - d, FRONT - d ), ( NAVE_X1 + d, FRONT - d ), ( NAVE_X1 + d, APSE_Y + k ), ( NAVE_X1 - APSE + k, BACK + d ), ( NAVE_X0 + APSE - k, BACK + d ), ( NAVE_X0 - d, APSE_Y + k ) ]


def on_slant( S, side, c, z0, w, h ):
	"""An arched window in a slanting wall of the three-sided end ( side -1 or +1 ): at c along the
	wall from its corner with the flank, sill at z0."""
	a = ( NAVE_X1, APSE_Y ) if side > 0 else ( NAVE_X0, APSE_Y )
	t = ( - side * math.sqrt( 0.5 ), math.sqrt( 0.5 ) )          # along the wall, toward the end wall
	n = ( side * math.sqrt( 0.5 ), math.sqrt( 0.5 ) )            # out of it
	def put( outline, o0, o1, mat ):
		v = [ ( a[ 0 ] + t[ 0 ] * q + n[ 0 ] * o, a[ 1 ] + t[ 1 ] * q + n[ 1 ] * o, z ) for o in ( o0, o1 ) for q, z in outline ]
		m = len( outline )
		S.shell( v, [ tuple( range( m ) ), tuple( range( 2 * m - 1, m - 1, - 1 ) ) ] + [ ( i, ( i + 1 ) % m, m + ( i + 1 ) % m, m + i ) for i in range( m ) ], mat )
	put( arch( w + 0.32, h + 0.16, c, z0 - 0.08 ), 0, 0.06, 'trim' )
	put( arch( w, h, c, z0 ), 0.06, 0.084, 'glass' )


def church( S ):

	# ---- the nave: plinth, walls and the entablature under the eaves (architrave, frieze, cornice)
	top = CORNICE - 1.55
	S.prism( nave( 0.08 ), 0, 0.7, 'plinth', 'xy' )
	S.prism( nave(), 0.7, CORNICE - 0.5, 'wall', 'xy' )
	S.prism( nave( 0.1 ), top, CORNICE - 1.3, 'trim', 'xy' )
	S.prism( nave( 0.25 ), CORNICE - 0.65, CORNICE - 0.5, 'trim', 'xy' )
	S.prism( nave( 0.45 ), CORNICE - 0.5, CORNICE, 'trim', 'xy' )

	# ---- the front below the cornice: wide pilasters at the corners, a pair framing the central
	# bay, and a blank panel in each side bay
	inner = HT + 0.45
	for c, w in ( ( NAVE_X0 + 0.5, 1.0 ), ( NAVE_X1 - 0.5, 1.0 ), ( AXIS - inner, 0.7 ), ( AXIS + inner, 0.7 ) ):
		S.box( c - w / 2, c + w / 2, FRONT - 0.15, FRONT, 0.7, top, 'trim' )
	for side in ( - 1, 1 ):
		a, b = AXIS + side * ( inner + 0.75 ), AXIS + side * ( W / 2 - 1.4 )
		panel( S, 'xz', min( a, b ), max( a, b ), 1.7, top - 0.5, FRONT, - 0.04 )

	# ---- the flanks: pilaster strips at the bay divisions; the first bay, by the tower, has a small
	# square window low and one high; each of the others an arched one. The sacristy stands against
	# the rear of the -x flank.
	for side, x in ( ( - 1, NAVE_X0 ), ( 1, NAVE_X1 ) ):
		for i in range( BAYS + 1 ):
			y = FRONT + 0.5 + ( APSE_Y - FRONT - 1.0 ) * i / BAYS
			if side < 0 and y > SAC_Y0 + 0.6: continue
			wall_box( S, 'yz', y - 0.5, y + 0.5, 0.7, top, x, side * 0.1, 'trim' )
		for i in range( BAYS ):
			y = FRONT + 0.5 + ( APSE_Y - FRONT - 1.0 ) * ( i + 0.5 ) / BAYS
			if side < 0 and y > SAC_Y0 - 0.8: continue
			if i: opening( S, 'yz', y, 4.0, 1.1, 2.3, x, side * 0.06, 'glass' )
			else:
				for z in ( 2.0, 5.3 ):
					wall_box( S, 'yz', y - 0.36, y + 0.36, z - 0.08, z + 0.64, x, side * 0.05, 'trim' )
					wall_box( S, 'yz', y - 0.28, y + 0.28, z, z + 0.56, x + side * 0.05, side * 0.02, 'glass' )
	# the three-sided end: a window in each slanting wall
	for side in ( - 1, 1 ): on_slant( S, side, APSE * math.sqrt( 0.5 ), 4.0, 1.0, 2.3 )

	# ---- the roof, at the pediment's slope, hipped round the three-sided end, a cross on its point
	E, ze, yf = nave( OVER ), CORNICE - SLOPE * OVER + 0.05, FRONT + 0.5
	v = [ ( E[ 0 ][ 0 ], yf, ze ), ( E[ 1 ][ 0 ], yf, ze ) ] + [ ( x, y, ze ) for x, y in E[ 2: ] ] + [ ( AXIS, yf, RIDGE + 0.05 ), ( AXIS, APSE_Y, RIDGE + 0.05 ) ]
	# 0 front left, 1 front right, 2 right corner, 3 and 4 the end wall's, 5 left corner, 6 and 7 the ridge
	S.shell( v, [ ( 1, 2, 7, 6 ), ( 2, 3, 7 ), ( 3, 4, 7 ), ( 4, 5, 7 ), ( 5, 0, 6, 7 ), ( 0, 1, 6 ), ( 0, 5, 4, 3, 2, 1 ) ], 'tile' )
	S.box( AXIS - 0.03, AXIS + 0.03, APSE_Y - 0.03, APSE_Y + 0.03, RIDGE, RIDGE + 1.2, 'dome' )
	S.box( AXIS - 0.27, AXIS + 0.27, APSE_Y - 0.03, APSE_Y + 0.03, RIDGE + 0.75, RIDGE + 0.81, 'dome' )

	# ---- the pediment's two shoulders, rising from the eaves to the tower, under a white coping
	for side in ( - 1, 1 ):
		x_out, x_in = AXIS + side * W / 2, AXIS + side * HT
		z_in = CORNICE + SLOPE * ( W / 2 - HT )
		poly = [ ( x_out, CORNICE ), ( x_in, CORNICE ), ( x_in, z_in ) ]
		S.prism( poly if side < 0 else poly[ ::- 1 ], FRONT, FRONT + 0.5, 'wall' )
		xo, zo = x_out + side * 0.45, CORNICE - SLOPE * 0.45
		rake = [ ( xo, zo ), ( x_in, z_in ), ( x_in, z_in + 0.3 ), ( xo, zo + 0.3 ) ]
		S.prism( rake if side < 0 else rake[ ::- 1 ], FRONT - 0.3, FRONT + 0.55, 'trim' )

	# ---- the tower: the facade's central bay carried up, a hand proud of the wall
	TY0 = FRONT - 0.2
	TY1 = TY0 + TOWER_W
	CY = ( TY0 + TY1 ) / 2
	faces = ( ( 'xz', AXIS, TY0, - 1 ), ( 'xz', AXIS, TY1, 1 ), ( 'yz', CY, AXIS - HT, - 1 ), ( 'yz', CY, AXIS + HT, 1 ) )
	S.box( AXIS - HT, AXIS + HT, TY0, TY1, 0.7, TOWER_TOP - 0.5, 'wall' )
	S.box( AXIS - HT - 0.08, AXIS + HT + 0.08, TY0 - 0.08, TY0, 0, 0.7, 'plinth' )
	# the main entablature carried round the tower's foot, and the cornice between the stages
	S.box( AXIS - HT - 0.45, AXIS + HT + 0.45, TY0 - 0.45, TY0 + 1.0, CORNICE - 0.5, CORNICE, 'trim' )
	S.box( AXIS - HT - 0.25, AXIS + HT + 0.25, TY0 - 0.25, TY0 + 1.0, CORNICE - 0.65, CORNICE - 0.5, 'trim' )
	S.box( AXIS - HT - 0.1, AXIS + HT + 0.1, TY0 - 0.1, TY0 + 1.0, CORNICE - 1.55, CORNICE - 1.3, 'trim' )
	S.box( AXIS - HT - 0.28, AXIS + HT + 0.28, TY0 - 0.28, TY1 + 0.28, STAGE - 0.35, STAGE, 'trim' )
	# the tower's own cornice, in two steps
	S.box( AXIS - HT - 0.2, AXIS + HT + 0.2, TY0 - 0.2, TY1 + 0.2, TOWER_TOP - 0.5, TOWER_TOP - 0.3, 'trim' )
	S.box( AXIS - HT - 0.42, AXIS + HT + 0.42, TY0 - 0.42, TY1 + 0.42, TOWER_TOP - 0.3, TOWER_TOP, 'trim' )

	# the door under its segmental hood, and the tall window over it
	wall_box( S, 'xz', AXIS - 0.95, AXIS + 0.95, 0.7, 3.45, TY0, - 0.08, 'trim' )
	wall_box( S, 'xz', AXIS - 0.75, AXIS + 0.75, 0.7, 3.25, TY0 - 0.08, - 0.04, 'door' )
	hw, hz, rise = 1.5, 3.6, 0.38
	rad = ( hw * hw + rise * rise ) / ( 2 * rise )
	a0 = math.asin( hw / rad )
	arc = lambda r, k, n=10: ( AXIS + r * math.sin( - a0 + 2 * a0 * k / n ), hz - ( rad - rise ) + r * math.cos( - a0 + 2 * a0 * k / n ) - ( r - rad ) )
	hood = [ arc( rad, k ) for k in range( 11 ) ] + [ ( x, z - 0.09 ) for x, z in ( arc( rad, k ) for k in range( 10, - 1, - 1 ) ) ]
	S.prism( hood, TY0 - 0.85, TY0, 'dome' )
	for sx in ( - 1, 1 ):       # the two brackets it rests on
		S.box( AXIS + sx * 1.25 - 0.05, AXIS + sx * 1.25 + 0.05, TY0 - 0.7, TY0, 3.2, 3.55, 'dome' )
	opening( S, 'xz', AXIS, 4.15, 1.0, 2.4, TY0, - 0.06, 'glass' )

	# the blank panel on the stage between the two cornices
	panel( S, 'xz', AXIS - HT + 0.55, AXIS + HT - 0.55, CORNICE + 0.35, STAGE - 0.7, TY0, - 0.04 )

	# the belfry: corner pilasters, and on each face a louvred arched opening under a white label
	for plane, c, face, s in faces:
		for e in ( - 1, 1 ):
			wall_box( S, plane, c + e * HT, c + e * ( HT - 0.5 ), STAGE, TOWER_TOP - 0.5, face, s * 0.07, 'trim' )
		opening( S, plane, c, BELFRY_SILL, BELFRY_W, BELFRY_H, face, s * 0.06, 'louvre', surround=0.14 )
		for k in range( 9 ):
			z = BELFRY_SILL + 0.12 + k * ( BELFRY_H - BELFRY_W / 2 - 0.1 ) / 9
			wall_box( S, plane, c - BELFRY_W / 2 + 0.03, c + BELFRY_W / 2 - 0.03, z, z + 0.05, face + s * 0.084, s * 0.035, 'dome' )
		# the label: a white field between the opening's head and the cornice, cut to the arch
		z0, z1 = BELFRY_SILL + BELFRY_H - BELFRY_W / 2 + 0.1, TOWER_TOP - 0.55
		r = BELFRY_W / 2 + 0.14
		lab = [ ( c - 0.95, z1 ), ( c - 0.95, z0 + 0.25 ), ( c - r, z0 ) ]
		lab += [ ( c - r * math.cos( math.pi * k / 10 ), z0 + r * math.sin( math.pi * k / 10 ) ) for k in range( 1, 10 ) ]
		lab += [ ( c + r, z0 ), ( c + 0.95, z0 + 0.25 ), ( c + 0.95, z1 ) ]
		S.prism( lab, face, face + s * 0.05, 'trim', plane )

	# ---- the dome. Everything in it is four-sided, like the tower under it: in the three-quarter
	# view the bulb has a hard edge of light and shade over the tower's corner, and the year sits on
	# the face toward the front. Heights are read up that view at 50 px to the metre (the belfry
	# opening, 130 px, is 2.6 m), widths across it at 47 px to the metre, seen 40 degrees off the face:
	# skirt 1.7, bulb 2.1, lantern 1.6 with a 0.4 cap, second bulb 1.0, spire 1.5, orb 0.5, cross 1.4
	z = TOWER_TOP
	# the skirt sweeps in from the cornice's edge, concave, to the bulb's foot
	skirt = 1.7
	square_loft( S, [ ( 0.85 + ( HT + 0.42 - 0.85 ) * ( 1 - t ) ** 1.6, z + skirt * t ) for t in ( 0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1 ) ], AXIS, CY, 'dome' )
	z += skirt
	# the bulb: half widths read every few pixels up the photograph, as fractions of its height
	prof = [ ( 0.84, 0.0 ), ( 1.11, 0.10 ), ( 1.33, 0.24 ), ( 1.41, 0.38 ), ( 1.43, 0.50 ), ( 1.36, 0.67 ), ( 1.21, 0.81 ), ( 0.98, 0.90 ), ( 0.79, 0.97 ), ( 0.68, 1.0 ) ]
	cushion( S, [ ( r, z + 2.1 * h ) for r, h in prof ], AXIS, CY, 'dome' )
	z += 2.1
	# the lantern: a flared foot, a square box with two louvred slots to a face, and a flared cap
	square_loft( S, [ ( 0.68, z ), ( 0.56, z + 0.16 ), ( 0.5, z + 0.3 ) ], AXIS, CY, 'dome' )
	lw = 0.475
	S.box( AXIS - lw, AXIS + lw, CY - lw, CY + lw, z + 0.3, z + 1.6, 'dome' )
	for plane, c, face, s_ in ( ( 'xz', AXIS, CY - lw, - 1 ), ( 'xz', AXIS, CY + lw, 1 ), ( 'yz', CY, AXIS - lw, - 1 ), ( 'yz', CY, AXIS + lw, 1 ) ):
		for e in ( - 0.21, 0.21 ):
			wall_box( S, plane, c + e - 0.11, c + e + 0.11, z + 0.5, z + 1.4, face, s_ * 0.02, 'louvre' )
	z += 1.6
	square_loft( S, [ ( lw, z - 0.06 ), ( 0.64, z + 0.06 ), ( 0.66, z + 0.15 ), ( 0.44, z + 0.4 ) ], AXIS, CY, 'dome' )
	z += 0.4
	prof = [ ( 0.36, 0.0 ), ( 0.47, 0.12 ), ( 0.53, 0.31 ), ( 0.53, 0.48 ), ( 0.47, 0.67 ), ( 0.35, 0.84 ), ( 0.24, 1.0 ) ]
	cushion( S, [ ( r, z + 1.0 * h ) for r, h in prof ], AXIS, CY, 'dome', seg=32 )
	z += 1.0
	# the spire: a four-sided needle, drawn in
	square_loft( S, [ ( 0.24, z ), ( 0.15, z + 0.35 ), ( 0.09, z + 0.85 ), ( 0.035, z + 1.5 ) ], AXIS, CY, 'dome' )
	z += 1.5
	S.lathe( [ ( 0.03, z ), ( 0.2, z + 0.1 ), ( 0.25, z + 0.25 ), ( 0.2, z + 0.4 ), ( 0.03, z + 0.5 ) ], AXIS, CY, 'dome', seg=16, soft=True )
	z += 0.5
	cross = 1.4
	S.box( AXIS - 0.03, AXIS + 0.03, CY - 0.03, CY + 0.03, z, z + cross, 'dome' )
	S.box( AXIS - 0.42, AXIS + 0.42, CY - 0.03, CY + 0.03, z + 0.78, z + 0.84, 'dome' )
	for ex, ez in ( ( - 0.42, 0.81 ), ( 0.42, 0.81 ), ( 0, cross ) ):      # the cross's budded ends
		S.box( AXIS + ex - 0.08, AXIS + ex + 0.08, CY - 0.03, CY + 0.03, z + ez - 0.08, z + ez + 0.08, 'dome' )

	# ---- the sacristy against the rear of the -x flank (height and roof assumed)
	sx0, sx1, sz = - RECT_W / 2, NAVE_X0, 3.6
	S.box( sx0 - 0.06, sx1, SAC_Y0 - 0.06, BACK + 0.06, 0, 0.7, 'plinth' )
	S.box( sx0, sx1, SAC_Y0, BACK, 0.7, sz, 'wall' )
	S.box( sx0 - 0.3, sx1, SAC_Y0 - 0.3, BACK + 0.3, sz, sz + 0.18, 'trim' )
	roof = [ ( sx0 - 0.35, sz + 0.12 ), ( sx1, sz + 2.0 ), ( sx1, sz + 2.2 ), ( sx0 - 0.35, sz + 0.32 ) ]
	S.prism( roof[ ::- 1 ], SAC_Y0 - 0.35, BACK + 0.35, 'tile' )
	for y0 in ( SAC_Y0, BACK - 0.3 ):
		S.prism( [ ( sx0, sz + 0.18 ), ( sx1, sz + 0.18 ), ( sx1, sz + 2.0 ) ], y0, y0 + 0.3, 'wall' )


GATE_SIDE = 0                 # the side of YARD the gate is in


def gateway():
	"""The gate's two posts ( x, y ), and the way into the yard there ( a unit vector )."""
	a, b = YARD[ GATE_SIDE ], YARD[ GATE_SIDE + 1 ]
	l = math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] )
	t = ( ( b[ 0 ] - a[ 0 ] ) / l, ( b[ 1 ] - a[ 1 ] ) / l )
	at = lambda d: ( a[ 0 ] + t[ 0 ] * d, a[ 1 ] + t[ 1 ] * d )
	# ( the yard lies to the left of its outline's direction )
	return at( GATE_AT ), at( GATE_AT + GATE_W ), ( - t[ 1 ], t[ 0 ] )


def fence_runs():
	"""The fence as runs between posts: ( a, b ). The gate's side is broken by the gateway."""
	out = []
	for i in range( STREET_SIDES ):
		a, b = YARD[ i ], YARD[ i + 1 ]
		for p, q in ( [ ( a, gateway()[ 0 ] ), ( gateway()[ 1 ], b ) ] if i == GATE_SIDE else [ ( a, b ) ] ):
			n = max( 1, math.ceil( math.hypot( q[ 0 ] - p[ 0 ], q[ 1 ] - p[ 1 ] ) / POST_GAP ) )
			lerp = lambda t: ( p[ 0 ] + ( q[ 0 ] - p[ 0 ] ) * t, p[ 1 ] + ( q[ 1 ] - p[ 1 ] ) * t )
			out += [ ( lerp( k / n ), lerp( ( k + 1 ) / n ) ) for k in range( n ) ]
	return out


def paved():
	"""The paving as outlines ( x, y ): the apron before the door, and the way to it from the gate."""
	g0, g1, _ = gateway()
	x0, x1 = AXIS - HT - 1.0, AXIS + HT + 1.0
	return [ [ ( x0, FRONT - PATH ), ( x1, FRONT - PATH ), ( x1, FRONT - 0.2 ), ( x0, FRONT - 0.2 ) ], [ g0, g1, ( x1, FRONT - 0.4 ), ( x1, FRONT - PATH ) ] ]


def yard( S ):

	posts = set()
	for a, b in fence_runs():
		iron_fence( S, a, b, FENCE )
		posts.update( ( ( round( a[ 0 ], 3 ), round( a[ 1 ], 3 ) ), ( round( b[ 0 ], 3 ), round( b[ 1 ], 3 ) ) ) )
	for x, y in posts: iron_post( S, x, y, POST, POST_H )
	# the gate's two leaves, standing open into the yard
	g0, g1, into = gateway()
	leaf = GATE_W / 2 - 0.05
	for g in ( g0, g1 ): gate_leaf( S, ( g[ 0 ] + into[ 0 ] * 0.1, g[ 1 ] + into[ 1 ] * 0.1 ), ( g[ 0 ] + into[ 0 ] * ( 0.1 + leaf ), g[ 1 ] + into[ 1 ] * ( 0.1 + leaf ) ), FENCE )
	for outline in paved(): S.prism( outline[ ::- 1 ], 0.0, 0.04, 'paving', 'xy' )
	# the stone cross: three steps, a block, and the cross on it
	cx, cy = STONE
	for k, ( half, z0, z1 ) in enumerate( ( ( 0.9, 0, 0.18 ), ( 0.7, 0.18, 0.36 ), ( 0.5, 0.36, 0.54 ), ( 0.36, 0.54, 1.7 ), ( 0.42, 1.7, 1.82 ) ) ):
		S.post( cx - half, cx + half, cy - half, cy + half, z0, z1, 'stone' )
	S.box( cx - 0.14, cx + 0.14, cy - 0.11, cy + 0.11, 1.82, 3.7, 'stone' )
	S.box( cx - 0.62, cx + 0.62, cy - 0.11, cy + 0.11, 2.75, 3.03, 'stone' )


# ---- PLAN: what the game needs to know of the model besides its shape, as custom properties of the
# object (grounds.py): outline, boxes, walls, yard, paved, trees.
def plan():
	N = nave()
	# the nave's ring with the tower's bay before it and the sacristy beside it
	outline = [ N[ 0 ], ( AXIS - HT, FRONT ), ( AXIS - HT, FRONT - 0.2 ), ( AXIS + HT, FRONT - 0.2 ), ( AXIS + HT, FRONT ) ] + N[ 1:5 ] + [ ( NAVE_X0, BACK ), ( - RECT_W / 2, BACK ), ( - RECT_W / 2, SAC_Y0 ), ( NAVE_X0, SAC_Y0 ) ]
	boxes = plan_box( NAVE_X0, NAVE_X1, FRONT, APSE_Y, RIDGE ) + plan_box( NAVE_X0 + APSE / 2, NAVE_X1 - APSE / 2, APSE_Y, BACK, CORNICE )
	boxes += plan_box( AXIS - HT, AXIS + HT, FRONT - 0.2, FRONT - 0.2 + TOWER_W, TOWER_TOP ) + plan_box( - RECT_W / 2, NAVE_X0, SAC_Y0, BACK, 3.6 )
	boxes += plan_box( STONE[ 0 ] - 0.9, STONE[ 0 ] + 0.9, STONE[ 1 ] - 0.9, STONE[ 1 ] + 0.9, 3.7 )
	return dict( outline=flat( outline ), boxes=boxes, walls=plan_walls( [ ( a, b, FENCE[ 'top' ] ) for a, b in fence_runs() ] ), yard=flat( YARD ), paved=plan_paved( paved() ), trees=plan_trees( TREES ) )


def build():
	scene = fresh_scene( 'StRoch' )
	mats = make_materials( MATERIALS )
	S = Shells()
	church( S )
	yard( S )
	ob = S.object( 'StRoch', mats, scene.collection, plan() )
	os.makedirs( os.path.dirname( OUT ), exist_ok=True )
	export_glb( scene, OUT )
	me = ob.data
	return dict( vertices=len( me.vertices ), triangles=sum( len( p.vertices ) - 2 for p in me.polygons ), height=round( max( v.co.z for v in me.vertices ), 2 ), fence_runs=len( fence_runs() ) )


result = build()
print( 'st-roch:', result, '->', OUT )
