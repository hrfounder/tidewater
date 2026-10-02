"""Crkva svetog Roka, Rokovci: the parish church, modelled from photographs and its mapped footprint.

Run inside Blender:

    blender --background --python tools/blender/st_roch.py
    # or, in a running Blender (it builds in a scene of its own):
    #   REPO = r'<repo>'; exec( open( REPO + r'/tools/blender/st_roch.py' ).read() )

Writes public/models/slavonia/st-roch.glb: one mesh, one primitive per material, colours as
material base colours (no textures yet). The game places it on the church's footprint
(src/regions/slavonia/Landmarks.js).

Frame: metres, z up, origin on the ground at the centre of the footprint's bounding rectangle, the
west front (tower, door) facing -y. glTF export turns that into y up with the front facing +z.

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

  ASSUMED (not visible in either photograph, to be corrected from more pictures):
    the east end (built as a plain gable), the north flank, how many of the flank's bays have a
    window (the second does; the first is blank), and the sacristy's height and roof.
    Left out: the wrought-iron fence round the yard (its line is not in the map data), the lettering
    '2000' on the bulb, the snow guards on the roof.
"""
import bpy, bmesh, math, os

# ---- plan, from the footprint
W = 11.2                      # facade / nave width
LEN = 20.2                    # nave length
RECT_W = 16.2                 # the footprint's bounding rectangle across the nave (nave + sacristy)
SAC_W, SAC_L = 5.0, 9.3       # the sacristy's plan
NAVE_X0, NAVE_X1 = - RECT_W / 2 + SAC_W, RECT_W / 2      # the sacristy takes its width at -x
AXIS = ( NAVE_X0 + NAVE_X1 ) / 2                          # the nave's centreline
FRONT, BACK = - LEN / 2, LEN / 2
SAC_Y0 = BACK - SAC_L

# ---- levels, from the photographs (metres above the ground)
CORNICE = 8.7                 # top of the main cornice, the eaves
STAGE = 11.9                  # top of the cornice where the pediment meets the tower
BELFRY_SILL, BELFRY_H, BELFRY_W = 13.8, 2.6, 1.0
TOWER_TOP = 17.9              # top of the tower's cornice, where the metal begins
TOWER_W = 4.1
HT = TOWER_W / 2
SLOPE = 0.716                 # the roof's rise per metre, which the pediment's rake follows
RIDGE = CORNICE + SLOPE * W / 2

# the repository root: two levels above this file, or REPO when the script is exec'd from a string
ROOT = globals().get( 'REPO' ) or os.path.dirname( os.path.dirname( os.path.dirname( os.path.abspath( __file__ ) ) ) )
OUT = os.path.join( ROOT, 'public', 'models', 'slavonia', 'st-roch.glb' )

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
}


class Build:

	"""Collects closed shells, each with a material, into one mesh."""

	def __init__( self ):
		self.verts, self.faces, self.mats, self.smooth = [], [], [], []

	def shell( self, verts, faces, mat, smooth=False ):
		o = len( self.verts )
		self.verts += verts
		for f in faces:
			self.faces.append( [ o + i for i in f ] )
			self.mats.append( mat )
			self.smooth.append( smooth )

	def box( self, x0, x1, y0, y1, z0, z1, mat ):
		x0, x1, y0, y1 = min( x0, x1 ), max( x0, x1 ), min( y0, y1 ), max( y0, y1 )
		v = [ ( x, y, z ) for z in ( z0, z1 ) for y in ( y0, y1 ) for x in ( x0, x1 ) ]
		f = [ ( 0, 2, 3, 1 ), ( 4, 5, 7, 6 ), ( 0, 1, 5, 4 ), ( 2, 6, 7, 3 ), ( 0, 4, 6, 2 ), ( 1, 3, 7, 5 ) ]
		self.shell( v, f, mat )

	def prism( self, poly, a0, a1, mat, plane='xz' ):
		"""Extrude a 2d outline. plane 'xz': poly is ( x, z ), extruded in y from a0 to a1.
		plane 'yz': poly is ( y, z ), extruded in x from a0 to a1."""
		n = len( poly )
		if plane == 'xz': P = lambda p, a: ( p[ 0 ], a, p[ 1 ] )
		else: P = lambda p, a: ( a, p[ 0 ], p[ 1 ] )
		v = [ P( p, a0 ) for p in poly ] + [ P( p, a1 ) for p in poly ]
		f = [ tuple( range( n ) ), tuple( range( 2 * n - 1, n - 1, - 1 ) ) ]
		f += [ ( i, ( i + 1 ) % n, n + ( i + 1 ) % n, n + i ) for i in range( n ) ]
		self.shell( v, f, mat )

	def lathe( self, profile, cx, cy, mat, seg=32 ):
		"""Revolve ( radius, z ) pairs about the vertical through ( cx, cy ); the ends are capped."""
		v, f = [], []
		for r, z in profile:
			for k in range( seg ):
				a = 2 * math.pi * k / seg
				v.append( ( cx + r * math.cos( a ), cy + r * math.sin( a ), z ) )
		for i in range( len( profile ) - 1 ):
			for k in range( seg ):
				a, b = i * seg + k, i * seg + ( k + 1 ) % seg
				f.append( ( a, b, b + seg, a + seg ) )
		f.append( tuple( range( seg - 1, - 1, - 1 ) ) )
		f.append( tuple( range( ( len( profile ) - 1 ) * seg, len( profile ) * seg ) ) )
		self.shell( v, f, mat, smooth=True )

	def cushion( self, levels, cx, cy, mat, power=10, seg=40 ):
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
		self.shell( v, f, mat, smooth=True )

	def square_loft( self, levels, cx, cy, mat ):
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
		self.shell( v, f, mat )


def arch( w, h, c, z0, n=12 ):
	"""Outline of a round-arched opening: w wide, h tall to the crown, sill at z0, centred on c."""
	r = w / 2
	pts = [ ( c - r, z0 ), ( c + r, z0 ) ]
	for k in range( n + 1 ):
		a = math.pi * k / n
		pts.append( ( c + r * math.cos( a ), z0 + h - r + r * math.sin( a ) ) )
	return pts


def opening( B, plane, c, z0, w, h, face, out, fill, surround=0.16 ):
	"""An arched opening in a wall: a surround standing `out` proud of the wall plane at `face`, and
	the fill a little prouder still so it is not buried. `out` is signed: the way the wall faces."""
	B.prism( arch( w + 2 * surround, h + surround, c, z0 - surround * 0.5 ), face, face + out, 'trim', plane )
	B.prism( arch( w, h, c, z0 ), face + out, face + out * 1.4, fill, plane )


def wall_box( B, plane, c0, c1, z0, z1, face, out, mat ):
	"""A box standing `out` proud of a wall: between c0 and c1 along it, z0 to z1."""
	if plane == 'xz': B.box( c0, c1, face, face + out, z0, z1, mat )
	else: B.box( face, face + out, c0, c1, z0, z1, mat )


def panel( B, plane, c0, c1, z0, z1, face, out ):
	"""A blank panel: a thin white frame on the wall, the field inside it left as wall."""
	t = 0.09
	for a, b, za, zb in ( ( c0, c1, z0, z0 + t ), ( c0, c1, z1 - t, z1 ), ( c0, c0 + t, z0, z1 ), ( c1 - t, c1, z0, z1 ) ):
		wall_box( B, plane, a, b, za, zb, face, out, 'trim' )


def build():

	B = Build()

	# ---- the nave: plinth, walls and the entablature under the eaves (architrave, frieze, cornice)
	B.box( NAVE_X0 - 0.08, NAVE_X1 + 0.08, FRONT - 0.08, BACK + 0.08, 0, 0.7, 'plinth' )
	B.box( NAVE_X0, NAVE_X1, FRONT, BACK, 0.7, CORNICE - 0.5, 'wall' )
	B.box( NAVE_X0 - 0.1, NAVE_X1 + 0.1, FRONT - 0.1, BACK + 0.1, CORNICE - 1.55, CORNICE - 1.3, 'trim' )
	B.box( NAVE_X0 - 0.25, NAVE_X1 + 0.25, FRONT - 0.25, BACK + 0.25, CORNICE - 0.65, CORNICE - 0.5, 'trim' )
	B.box( NAVE_X0 - 0.45, NAVE_X1 + 0.45, FRONT - 0.45, BACK + 0.45, CORNICE - 0.5, CORNICE, 'trim' )

	# ---- the west front below the cornice: wide pilasters at the corners, a pair framing the central
	# bay, and a blank panel in each side bay
	top = CORNICE - 1.55
	inner = HT + 0.45
	for c, w in ( ( NAVE_X0 + 0.5, 1.0 ), ( NAVE_X1 - 0.5, 1.0 ), ( AXIS - inner, 0.7 ), ( AXIS + inner, 0.7 ) ):
		B.box( c - w / 2, c + w / 2, FRONT - 0.15, FRONT, 0.7, top, 'trim' )
	for side in ( - 1, 1 ):
		a, b = AXIS + side * ( inner + 0.75 ), AXIS + side * ( W / 2 - 1.4 )
		panel( B, 'xz', min( a, b ), max( a, b ), 1.7, top - 0.5, FRONT, - 0.04 )

	# ---- the flanks: broad pilaster strips at the bay divisions; the first bay blank, the rest windowed
	bays = 4
	for side, x in ( ( - 1, NAVE_X0 ), ( 1, NAVE_X1 ) ):
		for i in range( bays + 1 ):
			y = FRONT + 0.5 + ( LEN - 1.0 ) * i / bays
			if side < 0 and y > SAC_Y0 + 0.6: continue      # the sacristy stands against this wall
			wall_box( B, 'yz', y - 0.5, y + 0.5, 0.7, top, x, side * 0.1, 'trim' )
		for i in range( 1, bays ):
			y = FRONT + 0.5 + ( LEN - 1.0 ) * ( i + 0.5 ) / bays
			if side < 0 and y > SAC_Y0 - 0.8: continue
			opening( B, 'yz', y, 4.0, 1.1, 2.3, x, side * 0.06, 'glass' )

	# ---- the roof, at the pediment's slope; the east gable (assumed plain) with the ridge cross
	over = 0.45
	for side in ( - 1, 1 ):
		xe, ze = AXIS + side * ( W / 2 + over ), CORNICE - SLOPE * over + 0.05
		poly = [ ( xe, ze ), ( xe, ze + 0.2 ), ( AXIS, RIDGE + 0.25 ), ( AXIS, RIDGE + 0.05 ) ]
		B.prism( poly if side > 0 else poly[ ::- 1 ], FRONT + 0.5, BACK + over, 'tile' )
	B.prism( [ ( NAVE_X0, CORNICE ), ( NAVE_X1, CORNICE ), ( AXIS, RIDGE + 0.05 ) ], BACK - 0.45, BACK, 'wall' )
	B.box( AXIS - 0.03, AXIS + 0.03, BACK - 0.3, BACK - 0.24, RIDGE + 0.25, RIDGE + 1.2, 'dome' )
	B.box( AXIS - 0.27, AXIS + 0.27, BACK - 0.3, BACK - 0.24, RIDGE + 0.8, RIDGE + 0.86, 'dome' )

	# ---- the pediment's two shoulders, rising from the eaves to the tower, under a white coping
	for side in ( - 1, 1 ):
		x_out, x_in = AXIS + side * W / 2, AXIS + side * HT
		z_in = CORNICE + SLOPE * ( W / 2 - HT )
		poly = [ ( x_out, CORNICE ), ( x_in, CORNICE ), ( x_in, z_in ) ]
		B.prism( poly if side < 0 else poly[ ::- 1 ], FRONT, FRONT + 0.5, 'wall' )
		xo, zo = x_out + side * 0.45, CORNICE - SLOPE * 0.45
		rake = [ ( xo, zo ), ( x_in, z_in ), ( x_in, z_in + 0.3 ), ( xo, zo + 0.3 ) ]
		B.prism( rake if side < 0 else rake[ ::- 1 ], FRONT - 0.3, FRONT + 0.55, 'trim' )

	# ---- the tower: the facade's central bay carried up, a hand proud of the wall
	TY0 = FRONT - 0.2
	TY1 = TY0 + TOWER_W
	CY = ( TY0 + TY1 ) / 2
	faces = ( ( 'xz', AXIS, TY0, - 1 ), ( 'xz', AXIS, TY1, 1 ), ( 'yz', CY, AXIS - HT, - 1 ), ( 'yz', CY, AXIS + HT, 1 ) )
	B.box( AXIS - HT, AXIS + HT, TY0, TY1, 0.7, TOWER_TOP - 0.5, 'wall' )
	B.box( AXIS - HT - 0.08, AXIS + HT + 0.08, TY0 - 0.08, TY0, 0, 0.7, 'plinth' )
	# the main entablature carried round the tower's foot, and the cornice between the stages
	B.box( AXIS - HT - 0.45, AXIS + HT + 0.45, TY0 - 0.45, TY0 + 1.0, CORNICE - 0.5, CORNICE, 'trim' )
	B.box( AXIS - HT - 0.25, AXIS + HT + 0.25, TY0 - 0.25, TY0 + 1.0, CORNICE - 0.65, CORNICE - 0.5, 'trim' )
	B.box( AXIS - HT - 0.1, AXIS + HT + 0.1, TY0 - 0.1, TY0 + 1.0, CORNICE - 1.55, CORNICE - 1.3, 'trim' )
	B.box( AXIS - HT - 0.28, AXIS + HT + 0.28, TY0 - 0.28, TY1 + 0.28, STAGE - 0.35, STAGE, 'trim' )
	# the tower's own cornice, in two steps
	B.box( AXIS - HT - 0.2, AXIS + HT + 0.2, TY0 - 0.2, TY1 + 0.2, TOWER_TOP - 0.5, TOWER_TOP - 0.3, 'trim' )
	B.box( AXIS - HT - 0.42, AXIS + HT + 0.42, TY0 - 0.42, TY1 + 0.42, TOWER_TOP - 0.3, TOWER_TOP, 'trim' )

	# the door under its segmental hood, and the tall window over it
	wall_box( B, 'xz', AXIS - 0.95, AXIS + 0.95, 0.7, 3.45, TY0, - 0.08, 'trim' )
	wall_box( B, 'xz', AXIS - 0.75, AXIS + 0.75, 0.7, 3.25, TY0 - 0.08, - 0.04, 'door' )
	hw, hz, rise = 1.5, 3.6, 0.38
	rad = ( hw * hw + rise * rise ) / ( 2 * rise )
	a0 = math.asin( hw / rad )
	arc = lambda r, k, n=10: ( AXIS + r * math.sin( - a0 + 2 * a0 * k / n ), hz - ( rad - rise ) + r * math.cos( - a0 + 2 * a0 * k / n ) - ( r - rad ) )
	hood = [ arc( rad, k ) for k in range( 11 ) ] + [ ( x, z - 0.09 ) for x, z in ( arc( rad, k ) for k in range( 10, - 1, - 1 ) ) ]
	B.prism( hood, TY0 - 0.85, TY0, 'dome' )
	for sx in ( - 1, 1 ):       # the two brackets it rests on
		B.box( AXIS + sx * 1.25 - 0.05, AXIS + sx * 1.25 + 0.05, TY0 - 0.7, TY0, 3.2, 3.55, 'dome' )
	opening( B, 'xz', AXIS, 4.15, 1.0, 2.4, TY0, - 0.06, 'glass' )

	# the blank panel on the stage between the two cornices
	panel( B, 'xz', AXIS - HT + 0.55, AXIS + HT - 0.55, CORNICE + 0.35, STAGE - 0.7, TY0, - 0.04 )

	# the belfry: corner pilasters, and on each face a louvred arched opening under a white label
	for plane, c, face, s in faces:
		for e in ( - 1, 1 ):
			wall_box( B, plane, c + e * HT, c + e * ( HT - 0.5 ), STAGE, TOWER_TOP - 0.5, face, s * 0.07, 'trim' )
		opening( B, plane, c, BELFRY_SILL, BELFRY_W, BELFRY_H, face, s * 0.06, 'louvre', surround=0.14 )
		for k in range( 9 ):
			z = BELFRY_SILL + 0.12 + k * ( BELFRY_H - BELFRY_W / 2 - 0.1 ) / 9
			wall_box( B, plane, c - BELFRY_W / 2 + 0.03, c + BELFRY_W / 2 - 0.03, z, z + 0.05, face + s * 0.084, s * 0.035, 'dome' )
		# the label: a white field between the opening's head and the cornice, cut to the arch
		z0, z1 = BELFRY_SILL + BELFRY_H - BELFRY_W / 2 + 0.1, TOWER_TOP - 0.55
		r = BELFRY_W / 2 + 0.14
		lab = [ ( c - 0.95, z1 ), ( c - 0.95, z0 + 0.25 ), ( c - r, z0 ) ]
		lab += [ ( c - r * math.cos( math.pi * k / 10 ), z0 + r * math.sin( math.pi * k / 10 ) ) for k in range( 1, 10 ) ]
		lab += [ ( c + r, z0 ), ( c + 0.95, z0 + 0.25 ), ( c + 0.95, z1 ) ]
		B.prism( lab, face, face + s * 0.05, 'trim', plane )

	# ---- the dome. Everything in it is four-sided, like the tower under it: in the three-quarter
	# view the bulb has a hard edge of light and shade over the tower's corner, and the year sits on
	# the face toward the front. Heights are read up that view at 50 px to the metre (the belfry
	# opening, 130 px, is 2.6 m), widths across it at 47 px to the metre, seen 40 degrees off the face:
	# skirt 1.7, bulb 2.1, lantern 1.6 with a 0.4 cap, second bulb 1.0, spire 1.5, orb 0.5, cross 1.4
	z = TOWER_TOP
	# the skirt sweeps in from the cornice's edge, concave, to the bulb's foot
	skirt = 1.7
	B.square_loft( [ ( 0.85 + ( HT + 0.42 - 0.85 ) * ( 1 - t ) ** 1.6, z + skirt * t ) for t in ( 0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1 ) ], AXIS, CY, 'dome' )
	z += skirt
	# the bulb: half widths read every few pixels up the photograph, as fractions of its height
	prof = [ ( 0.84, 0.0 ), ( 1.11, 0.10 ), ( 1.33, 0.24 ), ( 1.41, 0.38 ), ( 1.43, 0.50 ), ( 1.36, 0.67 ), ( 1.21, 0.81 ), ( 0.98, 0.90 ), ( 0.79, 0.97 ), ( 0.68, 1.0 ) ]
	B.cushion( [ ( r, z + 2.1 * h ) for r, h in prof ], AXIS, CY, 'dome' )
	z += 2.1
	# the lantern: a flared foot, a square box with two louvred slots to a face, and a flared cap
	B.square_loft( [ ( 0.68, z ), ( 0.56, z + 0.16 ), ( 0.5, z + 0.3 ) ], AXIS, CY, 'dome' )
	lw = 0.475
	B.box( AXIS - lw, AXIS + lw, CY - lw, CY + lw, z + 0.3, z + 1.6, 'dome' )
	for plane, c, face, s_ in ( ( 'xz', AXIS, CY - lw, - 1 ), ( 'xz', AXIS, CY + lw, 1 ), ( 'yz', CY, AXIS - lw, - 1 ), ( 'yz', CY, AXIS + lw, 1 ) ):
		for e in ( - 0.21, 0.21 ):
			wall_box( B, plane, c + e - 0.11, c + e + 0.11, z + 0.5, z + 1.4, face, s_ * 0.02, 'louvre' )
	z += 1.6
	B.square_loft( [ ( lw, z - 0.06 ), ( 0.64, z + 0.06 ), ( 0.66, z + 0.15 ), ( 0.44, z + 0.4 ) ], AXIS, CY, 'dome' )
	z += 0.4
	prof = [ ( 0.36, 0.0 ), ( 0.47, 0.12 ), ( 0.53, 0.31 ), ( 0.53, 0.48 ), ( 0.47, 0.67 ), ( 0.35, 0.84 ), ( 0.24, 1.0 ) ]
	B.cushion( [ ( r, z + 1.0 * h ) for r, h in prof ], AXIS, CY, 'dome', seg=32 )
	z += 1.0
	# the spire: a four-sided needle, drawn in
	B.square_loft( [ ( 0.24, z ), ( 0.15, z + 0.35 ), ( 0.09, z + 0.85 ), ( 0.035, z + 1.5 ) ], AXIS, CY, 'dome' )
	z += 1.5
	B.lathe( [ ( 0.03, z ), ( 0.2, z + 0.1 ), ( 0.25, z + 0.25 ), ( 0.2, z + 0.4 ), ( 0.03, z + 0.5 ) ], AXIS, CY, 'dome', seg=16 )
	z += 0.5
	cross = 1.4
	B.box( AXIS - 0.03, AXIS + 0.03, CY - 0.03, CY + 0.03, z, z + cross, 'dome' )
	B.box( AXIS - 0.42, AXIS + 0.42, CY - 0.03, CY + 0.03, z + 0.78, z + 0.84, 'dome' )
	for ex, ez in ( ( - 0.42, 0.81 ), ( 0.42, 0.81 ), ( 0, cross ) ):      # the cross's budded ends
		B.box( AXIS + ex - 0.08, AXIS + ex + 0.08, CY - 0.03, CY + 0.03, z + ez - 0.08, z + ez + 0.08, 'dome' )

	# ---- the sacristy against the rear of the -x flank (height and roof assumed)
	sx0, sx1, sz = - RECT_W / 2, NAVE_X0, 3.6
	B.box( sx0 - 0.06, sx1, SAC_Y0 - 0.06, BACK + 0.06, 0, 0.7, 'plinth' )
	B.box( sx0, sx1, SAC_Y0, BACK, 0.7, sz, 'wall' )
	B.box( sx0 - 0.3, sx1, SAC_Y0 - 0.3, BACK + 0.3, sz, sz + 0.18, 'trim' )
	roof = [ ( sx0 - 0.35, sz + 0.12 ), ( sx1, sz + 2.0 ), ( sx1, sz + 2.2 ), ( sx0 - 0.35, sz + 0.32 ) ]
	B.prism( roof[ ::- 1 ], SAC_Y0 - 0.35, BACK + 0.35, 'tile' )
	for y0 in ( SAC_Y0, BACK - 0.3 ):
		B.prism( [ ( sx0, sz + 0.18 ), ( sx1, sz + 0.18 ), ( sx1, sz + 2.0 ) ], y0, y0 + 0.3, 'wall' )

	return B


def main():

	# headless: start from nothing. In a running Blender, build in a scene of its own and leave
	# whatever the user has open alone (a factory reset there would also take the session down).
	if bpy.app.background:
		bpy.ops.wm.read_factory_settings( use_empty=True )
	else:
		old = bpy.data.objects.get( 'StRoch' )
		if old: bpy.data.objects.remove( old, do_unlink=True )
		stale = bpy.data.meshes.get( 'StRoch' )
		if stale: bpy.data.meshes.remove( stale )
		scene = bpy.data.scenes.get( 'StRoch' ) or bpy.data.scenes.new( 'StRoch' )
		bpy.context.window.scene = scene
	B = build()
	mesh = bpy.data.meshes.new( 'StRoch' )
	mesh.from_pydata( B.verts, [], B.faces )
	names = list( MATERIALS )
	srgb = lambda c: ( c / 255 / 12.92 ) if c / 255 <= 0.04045 else ( ( c / 255 + 0.055 ) / 1.055 ) ** 2.4
	for name in names:
		( r, g, b ), rough, metal = MATERIALS[ name ]
		m = bpy.data.materials.get( 'roch_' + name ) or bpy.data.materials.new( 'roch_' + name )
		m.use_nodes = True
		bsdf = m.node_tree.nodes[ 'Principled BSDF' ]
		bsdf.inputs[ 'Base Color' ].default_value = ( srgb( r ), srgb( g ), srgb( b ), 1 )
		bsdf.inputs[ 'Roughness' ].default_value = rough
		bsdf.inputs[ 'Metallic' ].default_value = metal
		mesh.materials.append( m )
	for poly, mat, smooth in zip( mesh.polygons, B.mats, B.smooth ):
		poly.material_index = names.index( mat )
		poly.use_smooth = smooth
	bm = bmesh.new()
	bm.from_mesh( mesh )
	bmesh.ops.recalc_face_normals( bm, faces=bm.faces )
	bm.to_mesh( mesh )
	bm.free()
	obj = bpy.data.objects.new( 'StRoch', mesh )
	bpy.context.scene.collection.objects.link( obj )
	for o in bpy.context.scene.objects: o.select_set( o is obj )
	bpy.context.view_layer.objects.active = obj
	os.makedirs( os.path.dirname( OUT ), exist_ok=True )
	bpy.ops.export_scene.gltf( filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_yup=True )
	print( 'st-roch: %d vertices, %d faces -> %s' % ( len( mesh.vertices ), len( mesh.polygons ), OUT ) )


main()
