"""Shared by the house scripts in tools/blender/houses/: a house built from what was measured of it,
the way the churches are, so that its face is its own. A script loads shells.py and this file, writes
its SPEC and calls build( SPEC ).

    exec( compile( open( os.path.join( ROOT, 'tools', 'blender', 'house.py' ), encoding='utf-8' ).read(), 'house.py', 'exec' ) )

Frame (as every model's, shells.py): metres, z up, the front toward the street at -y, x to the right
as one looks at the front. The origin is on the ground floor's level at the middle of the mapped
footprint's rectangle; the game stands that on the footprint (src/regions/slavonia/Landmarks.js).

A SPEC is plain data:

  name, out           the object's name; the file under public/
  materials           name -> ( sRGB 0-255, roughness, metallic ), as shells.py has them; the parts below
                      name their materials, and these are the ones they may name
  blocks              the masses of the house, each a rectangle in plan:
      x, y            [ from, to ] (m)
      eave            the walls' height to the eaves, over the floor (m)
      plinth          how far the plinth runs up the walls from the ground (m), and its material
      wall            the walls' material
      recesses        stretches of a wall set back into the house, the full height (a garage bay one
                      brick deep, a loggia): [ { side, from, to: metres along the wall as its
                      openings' `at` are, depth (m) } ]; the openings within one stand in it
      roof            { form: 'gable' | 'hip', ridge: 'x' | 'y' (gable: the way the ridge runs),
                      pitch: degrees, over: the eaves' overhang (m), verge: the overhang at a gable
                      end (m), cover: material, fascia: the board along the eaves and its depth
                      [ material, m ], soffit: material under the overhang }
  openings            in the walls, each { block, side: 'front' | 'right' | 'back' | 'left',
                      at: its middle, in metres from the wall's left end as one looks at the wall from
                      outside, sill: its foot over the floor, w, h, kind: 'window' | 'door',
                      panes: [ across, up ] (a window), transom: the height of a fixed top light (m),
                      lights: instead of panes, one entry a light, 'top' | 'bottom' | None: where
                      that light has its small pane of `transom` height,
                      box: a roller shutter's box over the opening (its height, m, inside the opening's
                      h), shutter: how much of the glass the shutter covers (0..1), leaf: 'glass' or a
                      material for a door's leaves, leaves: how many }
  canopies            flat roofs over an entrance, each { x, y: [ from, to ], z: its underside, thick,
                      posts: [ [ x, y ], ... ], post: their side (m), post_mat (or sizes and
                      mats, one for each post), mat, fascia: material }
  pipes               downpipes: { block, side, at }
  units               boxes on a wall (an air conditioner's outdoor unit): { block, side, at, z, size: [ w, h, d ], mat }
  strips              bands up a wall from the plinth to the eaves (a school's bays): { block, side, at, w, mat, out }
  chimneys            { x, y, top: over the floor, side, mat }
  parts               the materials of the house's joinery by what they are for: frame, glass, box
                      (a roller shutter's), shutter, slat, sill
  door_parts          the same for the doors, where their frames are not the windows' (default: parts)
  paved               paving on the ground round the house: outlines [ [ x, y ], ... ], laid a slab's
                      thickness over the ground as the churches' are; material 'paving'
  fences              fences round its yard: { points: [ [ x, y ], ... ], style } in grounds.py's
                      fence style (its iron is the material 'iron')
  walls               solid yard walls along the street: { points: [ [ x, y ], ... ], height, thick,
                      mat, cap: the coping's material, gates: [ { at: its middle in metres along the
                      wall from its first point, w, h, mat } ] }; a gate is a leaf in the wall's line,
                      with nothing over it
  outline             the plan the game takes for the house, [ [ x, y ], ... ] (default: the rectangle round the blocks)
  yard                the ground the house and its things stand on (default: the outline)
"""
import math, os

FOOT = 0.5           # the walls run this far under the floor's level, into the ground (m)
SET_BACK = 0.12      # a window's or a door's face stands this far in from the wall's (m)
BAR = 0.06           # a frame's member, seen from in front (m)
MULLION = 0.05       # a member between the panes (m)
SILL = ( 0.06, 0.05, 0.04 )   # a sill: how far it stands out of the wall, its thickness, how much wider than the opening each side (m)
SLAT = 0.04          # a roller shutter's slats (m): drawn as lines on its face
PIPE = 0.05          # a downpipe's radius (m)


def wall_frame( b, side ):
	"""The way a wall runs: a function ( t, z, d ) -> ( x, y, z ) from metres along the wall (from its
	left end seen from outside), up, and out of it; and the wall's length."""
	( x0, x1 ), ( y0, y1 ) = b[ 'x' ], b[ 'y' ]
	if side == 'front': return ( lambda t, z, d: ( x0 + t, y0 - d, z ) ), x1 - x0
	if side == 'right': return ( lambda t, z, d: ( x1 + d, y0 + t, z ) ), y1 - y0
	if side == 'back': return ( lambda t, z, d: ( x1 - t, y1 + d, z ) ), x1 - x0
	return ( lambda t, z, d: ( x0 - d, y1 - t, z ) ), y1 - y0


def on_wall( S, W, make ):
	"""Build with make( T ) in a wall's own frame, as a piece facing -y (x along the wall, y into it,
	z up), and set it into S on the wall W."""
	T = Shells()
	make( T )
	o = len( S.verts )
	S.verts += [ W( x, z, - y ) for x, y, z in T.verts ]
	for f, m, s in zip( T.faces, T.mats, T.smooth ):
		S.faces.append( [ o + i for i in f ] ); S.mats.append( m ); S.smooth.append( s )


def holed( T, t0, t1, z0, z1, holes, mat, reveals=True ):
	"""A wall's face from t0 to t1 and z0 to z1 with rectangular holes ( ta, tb, za, zb ), in bands
	between the holes' heads and feet, and (with reveals) each hole's reveal back to SET_BACK."""
	cuts = sorted( set( [ z0, z1 ] + [ z for h in holes for z in h[ 2: ] if z0 < z < z1 ] ) )
	for lo, hi in zip( cuts, cuts[ 1: ] ):
		mid = ( lo + hi ) / 2
		gaps = sorted( ( h[ 0 ], h[ 1 ] ) for h in holes if h[ 2 ] < mid < h[ 3 ] )
		t = t0
		for g0, g1 in gaps + [ ( t1, t1 ) ]:
			if g0 - t > 1e-4: T.panel( t, g0, 0, lo, hi, mat )
			t = g1
	if not reveals: return
	for ta, tb, za, zb in holes:
		for q in ( [ ( ta, 0, za ), ( ta, 0, zb ), ( ta, SET_BACK, zb ), ( ta, SET_BACK, za ) ], [ ( tb, 0, zb ), ( tb, 0, za ), ( tb, SET_BACK, za ), ( tb, SET_BACK, zb ) ],
				[ ( ta, 0, zb ), ( tb, 0, zb ), ( tb, SET_BACK, zb ), ( ta, SET_BACK, zb ) ], [ ( tb, 0, za ), ( ta, 0, za ), ( ta, SET_BACK, za ), ( tb, SET_BACK, za ) ] ):
			T.shell( q, [ ( 0, 1, 2, 3 ) ], mat )


def window( T, o, mats ):
	"""A window in its opening ( the opening's own frame: x along the wall, z up ): the frame, the
	panes with their members, the transom's light, the roller shutter's box and as much of the
	shutter as is down, and the sill outside."""
	a, c = o[ 'at' ] - o[ 'w' ] / 2, o[ 'at' ] + o[ 'w' ] / 2
	z0, z1 = o[ 'sill' ], o[ 'sill' ] + o[ 'h' ]
	box = o.get( 'box', 0 )
	top = z1 - box
	y = SET_BACK
	if box: T.panel( a, c, y - 0.01, top, z1, mats[ 'box' ] )
	T.frame( a, c, z0, top, BAR, y, y + 0.05, mats[ 'frame' ] )
	# the glass, and over it the shutter as far down as it is
	shut = o.get( 'shutter', 0 ) * ( top - z0 - 2 * BAR )
	T.panel( a + BAR, c - BAR, y + 0.05, z0 + BAR, top - BAR, mats[ 'glass' ] )
	if shut > 0:
		T.panel( a + BAR, c - BAR, y + 0.02, top - BAR - shut, top - BAR, mats[ 'shutter' ] )
		n = int( shut / SLAT )
		for k in range( 1, n, 3 ): T.panel( a + BAR, c - BAR, y + 0.015, top - BAR - k * SLAT - 0.006, top - BAR - k * SLAT, mats[ 'slat' ] )
	# the members: across between the panes, and the transom
	cols, rows = o.get( 'panes', [ 1, 1 ] )
	glass_top = top - BAR
	if o.get( 'lights' ):
		# each light its own: its small pane at the top, at the bottom or none, the transom's height
		# from that end; the mullions between the lights the full height
		w = ( c - a - 2 * BAR ) / len( o[ 'lights' ] )
		for k, end in enumerate( o[ 'lights' ] ):
			l0, l1 = a + BAR + w * k, a + BAR + w * ( k + 1 )
			if k: T.bar( l0 - MULLION / 2, l0 + MULLION / 2, z0 + BAR, top - BAR, y + 0.005, y + 0.05, mats[ 'frame' ] )
			if end:
				zt = top - BAR - o[ 'transom' ] if end == 'top' else z0 + BAR + o[ 'transom' ]
				T.bar( l0 + MULLION / 2, l1 - MULLION / 2, zt - MULLION / 2, zt + MULLION / 2, y + 0.005, y + 0.05, mats[ 'frame' ] )
		cols, rows = 1, 1
	elif o.get( 'transom' ):
		zt = top - BAR - o[ 'transom' ]
		T.bar( a + BAR, c - BAR, zt - MULLION / 2, zt + MULLION / 2, y + 0.005, y + 0.05, mats[ 'frame' ] )
		glass_top = zt
	for k in range( 1, cols ):
		x = a + BAR + ( c - a - 2 * BAR ) * k / cols
		T.bar( x - MULLION / 2, x + MULLION / 2, z0 + BAR, glass_top, y + 0.005, y + 0.05, mats[ 'frame' ] )
	for k in range( 1, rows ):
		z = z0 + BAR + ( glass_top - z0 - BAR ) * k / rows
		T.bar( a + BAR, c - BAR, z - MULLION / 2, z + MULLION / 2, y + 0.005, y + 0.05, mats[ 'frame' ] )
	T.ledge( a - SILL[ 2 ], c + SILL[ 2 ], - SILL[ 0 ], y, z0 - SILL[ 1 ], z0, mats[ 'sill' ] )


def door( T, o, mats ):
	"""A door in its opening: the frame, its leaves (glazed or solid), the transom's light."""
	a, c = o[ 'at' ] - o[ 'w' ] / 2, o[ 'at' ] + o[ 'w' ] / 2
	z0, z1 = o[ 'sill' ], o[ 'sill' ] + o[ 'h' ]
	y = SET_BACK
	T.frame( a, c, z0, z1, BAR, y, y + 0.05, mats[ 'frame' ] )
	top = z1 - BAR
	if o.get( 'transom' ):
		top = z1 - BAR - o[ 'transom' ]
		T.panel( a + BAR, c - BAR, y + 0.05, top, z1 - BAR, mats[ 'glass' ] )
		T.bar( a + BAR, c - BAR, top - MULLION / 2, top + MULLION / 2, y + 0.005, y + 0.05, mats[ 'frame' ] )
	n = o.get( 'leaves', 1 )
	for k in range( n ):
		l0, l1 = a + BAR + ( c - a - 2 * BAR ) * k / n, a + BAR + ( c - a - 2 * BAR ) * ( k + 1 ) / n
		if o.get( 'leaf', 'glass' ) == 'glass':
			T.frame( l0, l1, z0, top, 0.08, y + 0.02, y + 0.06, mats[ 'frame' ] )
			T.panel( l0 + 0.08, l1 - 0.08, y + 0.06, z0 + 0.08, top - 0.08, mats[ 'glass' ] )
		else:
			T.panel( l0, l1, y + 0.04, z0, top, mats[ o[ 'leaf' ] ] )


def roof_face( S, q, mat ):
	"""A roof's face, wound so that its covered side faces up (the game draws the other side as the
	underside): reversed if its normal (Newell's) points down."""
	nz = sum( ( q[ i ][ 0 ] - q[ ( i + 1 ) % len( q ) ][ 0 ] ) * ( q[ i ][ 1 ] + q[ ( i + 1 ) % len( q ) ][ 1 ] ) for i in range( len( q ) ) )
	S.shell( q if nz > 0 else q[ ::- 1 ], [ tuple( range( len( q ) ) ) ], mat )


def hip( S, b, r ):
	"""A hipped roof over a block: its eaves' rectangle out by the overhang, the ridge along the
	longer side, every slope at the pitch; the fascia round the eaves and the soffit under them."""
	( x0, x1 ), ( y0, y1 ) = b[ 'x' ], b[ 'y' ]
	o, tan = r[ 'over' ], math.tan( math.radians( r[ 'pitch' ] ) )
	ze = b[ 'eave' ] - o * tan
	X0, X1, Y0, Y1 = x0 - o, x1 + o, y0 - o, y1 + o
	h = min( X1 - X0, Y1 - Y0 ) / 2
	zr = ze + h * tan
	if X1 - X0 >= Y1 - Y0: a, c = ( X0 + h, ( Y0 + Y1 ) / 2 ), ( X1 - h, ( Y0 + Y1 ) / 2 )
	else: a, c = ( ( X0 + X1 ) / 2, Y0 + h ), ( ( X0 + X1 ) / 2, Y1 - h )
	A, C = ( *a, zr ), ( *c, zr )
	E = [ ( X0, Y0, ze ), ( X1, Y0, ze ), ( X1, Y1, ze ), ( X0, Y1, ze ) ]
	if X1 - X0 >= Y1 - Y0: slopes = [ [ E[ 0 ], E[ 1 ], C, A ], [ E[ 1 ], E[ 2 ], C ], [ E[ 2 ], E[ 3 ], A, C ], [ E[ 3 ], E[ 0 ], A ] ]
	else: slopes = [ [ E[ 0 ], E[ 1 ], A ], [ E[ 1 ], E[ 2 ], C, A ], [ E[ 2 ], E[ 3 ], C ], [ E[ 3 ], E[ 0 ], A, C ] ]
	for q in slopes: roof_face( S, q, r[ 'cover' ] )
	eaves( S, b, r, ( X0, X1, Y0, Y1 ), ze )
	return zr


def gable( S, b, r ):
	"""A gabled roof over a block, its ridge along x or y: the two slopes, the gable walls up to them,
	the verge's overhang at the gable ends, the fascia and the soffit along the eaves."""
	( x0, x1 ), ( y0, y1 ) = b[ 'x' ], b[ 'y' ]
	o, v, tan = r[ 'over' ], r.get( 'verge', 0.2 ), math.tan( math.radians( r[ 'pitch' ] ) )
	ze = b[ 'eave' ] - o * tan
	along_x = r.get( 'ridge', 'x' ) == 'x'
	if along_x:
		half = ( y1 - y0 ) / 2; zr = b[ 'eave' ] + half * tan; ym = ( y0 + y1 ) / 2
		roof_face( S, [ ( x0 - v, y0 - o, ze ), ( x1 + v, y0 - o, ze ), ( x1 + v, ym, zr ), ( x0 - v, ym, zr ) ], r[ 'cover' ] )
		roof_face( S, [ ( x1 + v, y1 + o, ze ), ( x0 - v, y1 + o, ze ), ( x0 - v, ym, zr ), ( x1 + v, ym, zr ) ], r[ 'cover' ] )
		for x, s in ( ( x0, - 1 ), ( x1, 1 ) ): S.shell( [ ( x, y0, b[ 'eave' ] ), ( x, y1, b[ 'eave' ] ), ( x, ym, zr ) ][ ::s ], [ ( 0, 1, 2 ) ], b[ 'wall' ] )
		eaves( S, b, r, ( x0 - v, x1 + v, y0 - o, y1 + o ), ze, sides=( 'front', 'back' ) )
	else:
		half = ( x1 - x0 ) / 2; zr = b[ 'eave' ] + half * tan; xm = ( x0 + x1 ) / 2
		w = r.get( 'well' )
		if not w:
			roof_face( S, [ ( x0 - o, y1 + v, ze ), ( x0 - o, y0 - v, ze ), ( xm, y0 - v, zr ), ( xm, y1 + v, zr ) ], r[ 'cover' ] )
		else:
			# the -x slope round its well: the parts before and after it, and beside it toward the eaves
			# and toward the ridge; then the well's four walls from its floor up to the roof
			( a, c ), ( d, e ), fl = w[ 'x' ], w[ 'y' ], w[ 'floor' ]
			zx = lambda x: ze + ( x - ( x0 - o ) ) * tan
			for ( p, q ), ( s0, s1 ) in ( ( ( x0 - o, xm ), ( y0 - v, d ) ), ( ( x0 - o, xm ), ( e, y1 + v ) ), ( ( x0 - o, a ), ( d, e ) ), ( ( c, xm ), ( d, e ) ) ):
				if q - p > 1e-3 and s1 - s0 > 1e-3: roof_face( S, [ ( p, s1, zx( p ) ), ( p, s0, zx( p ) ), ( q, s0, zx( q ) ), ( q, s1, zx( q ) ) ], r[ 'cover' ] )
			S.shell( [ ( a, d, fl ), ( a, e, fl ), ( a, e, zx( a ) ), ( a, d, zx( a ) ) ], [ ( 0, 1, 2, 3 ) ], w[ 'wall' ] )
			S.shell( [ ( c, e, fl ), ( c, d, fl ), ( c, d, zx( c ) ), ( c, e, zx( c ) ) ], [ ( 0, 1, 2, 3 ) ], w[ 'wall' ] )
			S.shell( [ ( c, d, fl ), ( a, d, fl ), ( a, d, zx( a ) ), ( c, d, zx( c ) ) ], [ ( 0, 1, 2, 3 ) ], w[ 'wall' ] )
			S.shell( [ ( a, e, fl ), ( c, e, fl ), ( c, e, zx( c ) ), ( a, e, zx( a ) ) ], [ ( 0, 1, 2, 3 ) ], w[ 'wall' ] )
			S.shell( [ ( a, d, fl ), ( c, d, fl ), ( c, e, fl ), ( a, e, fl ) ], [ ( 0, 1, 2, 3 ) ], w[ 'bottom' ] )
		roof_face( S, [ ( x1 + o, y0 - v, ze ), ( x1 + o, y1 + v, ze ), ( xm, y1 + v, zr ), ( xm, y0 - v, zr ) ], r[ 'cover' ] )
		for y, s in ( ( y0, 1 ), ( y1, - 1 ) ): S.shell( [ ( x0, y, b[ 'eave' ] ), ( x1, y, b[ 'eave' ] ), ( xm, y, zr ) ][ ::s ], [ ( 0, 1, 2 ) ], b[ 'wall' ] )
		eaves( S, b, r, ( x0 - o, x1 + o, y0 - v, y1 + v ), ze, sides=( 'left', 'right' ) )
	return zr


def eaves( S, b, r, E, ze, sides=( 'front', 'right', 'back', 'left' ) ):
	"""The fascia board along the eaves on the given sides, and the soffit from the wall out to it."""
	X0, X1, Y0, Y1 = E
	( x0, x1 ), ( y0, y1 ) = b[ 'x' ], b[ 'y' ]
	mat, depth = r.get( 'fascia', ( r[ 'cover' ], 0.18 ) )
	edge = { 'front': ( ( X0, Y0 ), ( X1, Y0 ), ( x0, y0 ), ( x1, y0 ) ), 'right': ( ( X1, Y0 ), ( X1, Y1 ), ( x1, y0 ), ( x1, y1 ) ),
		'back': ( ( X1, Y1 ), ( X0, Y1 ), ( x1, y1 ), ( x0, y1 ) ), 'left': ( ( X0, Y1 ), ( X0, Y0 ), ( x0, y1 ), ( x0, y0 ) ) }
	for s in sides:
		( pa, pb, wa, wb ) = edge[ s ]
		S.shell( [ ( *pa, ze - depth ), ( *pb, ze - depth ), ( *pb, ze ), ( *pa, ze ) ], [ ( 0, 1, 2, 3 ) ], mat )
		S.shell( [ ( *wa, b[ 'eave' ] ), ( *wb, b[ 'eave' ] ), ( *pb, ze - depth ), ( *pa, ze - depth ) ], [ ( 0, 1, 2, 3 ) ], r.get( 'soffit', mat ) )


def build_house( S, spec ):
	"""Every part of the house into S; returns its plan for the game."""
	mats = spec[ 'parts' ]
	blocks = spec[ 'blocks' ]
	tops = []
	for k, b in enumerate( blocks ):
		mine = [ o for o in spec.get( 'openings', [] ) if o[ 'block' ] == k ]
		for side in ( 'front', 'right', 'back', 'left' ):
			W, L = wall_frame( b, side )
			plinth, pmat = b.get( 'plinth', ( 0.3, b[ 'wall' ] ) )
			recesses = [ r for r in b.get( 'recesses', [] ) if r[ 'side' ] == side ]
			inside = lambda o, r: r[ 'from' ] <= o[ 'at' ] <= r[ 'to' ]
			def make( T, ours, holes, t0, t1, L=L, plinth=plinth, pmat=pmat, b=b ):
				holed( T, t0, t1, - FOOT, plinth, holes, pmat, reveals=False )
				holed( T, t0, t1, plinth, b[ 'eave' ], [ ( ta, tb, max( za, plinth ), zb ) for ta, tb, za, zb in holes if zb > plinth ], b[ 'wall' ], reveals=False )
				for ta, tb, za, zb in holes:
					if zb - za >= b[ 'eave' ] + FOOT - 1e-6: continue          # ( a recess's opening in the outer wall: no reveal )
					for q in ( [ ( ta, 0, za ), ( ta, 0, zb ), ( ta, SET_BACK, zb ), ( ta, SET_BACK, za ) ], [ ( tb, 0, zb ), ( tb, 0, za ), ( tb, SET_BACK, za ), ( tb, SET_BACK, zb ) ],
							[ ( ta, 0, zb ), ( tb, 0, zb ), ( tb, SET_BACK, zb ), ( ta, SET_BACK, zb ) ], [ ( tb, 0, za ), ( ta, 0, za ), ( ta, SET_BACK, za ), ( tb, SET_BACK, za ) ] ):
						T.shell( q, [ ( 0, 1, 2, 3 ) ], b[ 'wall' ] )
				for o in ours: door( T, o, spec.get( 'door_parts', mats ) ) if o[ 'kind' ] == 'door' else window( T, o, mats )
			ours = [ o for o in mine if o[ 'side' ] == side and not any( inside( o, r ) for r in recesses ) ]
			holes = [ ( o[ 'at' ] - o[ 'w' ] / 2, o[ 'at' ] + o[ 'w' ] / 2, o[ 'sill' ], o[ 'sill' ] + o[ 'h' ] ) for o in ours ]
			# ( the outer wall is open the full height where a recess is )
			holes += [ ( r[ 'from' ], r[ 'to' ], - FOOT, b[ 'eave' ] ) for r in recesses ]
			on_wall( S, W, lambda T, ours=ours, holes=holes: make( T, ours, holes, 0, L ) )
			for r in recesses:
				d = r[ 'depth' ]
				Wr = lambda t, z, out, W=W, d=d: W( t, z, out - d )
				ins = [ o for o in mine if o[ 'side' ] == side and inside( o, r ) ]
				on_wall( S, Wr, lambda T, ins=ins, r=r: make( T, ins, [ ( o[ 'at' ] - o[ 'w' ] / 2, o[ 'at' ] + o[ 'w' ] / 2, o[ 'sill' ], o[ 'sill' ] + o[ 'h' ] ) for o in ins ], r[ 'from' ], r[ 'to' ] ) )
				# its two returns, from the outer wall's face back to the recess's, and its head under the eaves
				def returns( T, r=r, d=d, b=b, plinth=plinth, pmat=pmat ):
					for z0, z1, m in ( ( - FOOT, plinth, pmat ), ( plinth, b[ 'eave' ], b[ 'wall' ] ) ):
						T.shell( [ ( r[ 'from' ], 0, z0 ), ( r[ 'from' ], 0, z1 ), ( r[ 'from' ], d, z1 ), ( r[ 'from' ], d, z0 ) ], [ ( 0, 1, 2, 3 ) ], m )
						T.shell( [ ( r[ 'to' ], 0, z1 ), ( r[ 'to' ], 0, z0 ), ( r[ 'to' ], d, z0 ), ( r[ 'to' ], d, z1 ) ], [ ( 0, 1, 2, 3 ) ], m )
					T.shell( [ ( r[ 'from' ], 0, b[ 'eave' ] ), ( r[ 'to' ], 0, b[ 'eave' ] ), ( r[ 'to' ], d, b[ 'eave' ] ), ( r[ 'from' ], d, b[ 'eave' ] ) ], [ ( 0, 1, 2, 3 ) ], b[ 'wall' ] )
				on_wall( S, W, returns )
		r = b[ 'roof' ]
		tops.append( ( hip if r[ 'form' ] == 'hip' else gable )( S, b, r ) )
	for c in spec.get( 'canopies', [] ):
		( x0, x1 ), ( y0, y1 ) = c[ 'x' ], c[ 'y' ]
		S.box( x0, x1, y0, y1, c[ 'z' ], c[ 'z' ] + c[ 'thick' ], c[ 'mat' ] )
		if c.get( 'fascia' ):
			for f in ( ( x0, x1, y0 - 0.02, y0 ), ( x0 - 0.02, x0, y0, y1 ), ( x1, x1 + 0.02, y0, y1 ) ):
				S.box( f[ 0 ], f[ 1 ], f[ 2 ], f[ 3 ], c[ 'z' ] - 0.02, c[ 'z' ] + c[ 'thick' ] + 0.02, c[ 'fascia' ] )
		for k, ( px, py ) in enumerate( c.get( 'posts', [] ) ):
			h = c.get( 'sizes', [ c[ 'post' ] ] * len( c[ 'posts' ] ) )[ k ] / 2
			S.post( px - h, px + h, py - h, py + h, - FOOT, c[ 'z' ], c.get( 'mats', [ c[ 'post_mat' ] ] * len( c[ 'posts' ] ) )[ k ] )
	for p in spec.get( 'pipes', [] ):
		b = blocks[ p[ 'block' ] ]
		W, L = wall_frame( b, p[ 'side' ] )
		x, y, _ = W( p[ 'at' ], 0, PIPE + 0.03 )
		S.pole( x, y, 0, b[ 'eave' ], PIPE, PIPE, p.get( 'mat', 'pipe' ), seg=8 )
	for u in spec.get( 'units', [] ):
		b = blocks[ u[ 'block' ] ]
		W, L = wall_frame( b, u[ 'side' ] )
		w, h, d = u[ 'size' ]
		on_wall( S, W, lambda T, u=u, w=w, h=h, d=d: T.box( u[ 'at' ] - w / 2, u[ 'at' ] + w / 2, - d, 0, u[ 'z' ], u[ 'z' ] + h, u[ 'mat' ], back=False ) )
	for st in spec.get( 'strips', [] ):
		b = blocks[ st[ 'block' ] ]
		W, L = wall_frame( b, st[ 'side' ] )
		on_wall( S, W, lambda T, st=st, b=b: T.box( st[ 'at' ] - st[ 'w' ] / 2, st[ 'at' ] + st[ 'w' ] / 2, - st.get( 'out', 0.03 ), 0, b.get( 'plinth', ( 0.3, None ) )[ 0 ], b[ 'eave' ], st[ 'mat' ], back=False ) )
	for outline in spec.get( 'paved', [] ): S.prism( outline[ ::- 1 ], 0.0, 0.04, 'paving', 'xy' )
	runs = []
	for f in spec.get( 'fences', [] ):
		for a, b in zip( f[ 'points' ], f[ 'points' ][ 1: ] ):
			iron_fence( S, a, b, f[ 'style' ] )
			runs.append( ( a, b, f[ 'style' ][ 'top' ] ) )
		for x, y in f[ 'points' ]: S.post( x - 0.025, x + 0.025, y - 0.025, y + 0.025, - FOUNDED, f[ 'style' ][ 'top' ], 'iron' )
	for wl in spec.get( 'walls', [] ):
		along, th = 0.0, wl[ 'thick' ]
		for a, b in zip( wl[ 'points' ], wl[ 'points' ][ 1: ] ):
			L = math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] ); ux, uy = ( b[ 0 ] - a[ 0 ] ) / L, ( b[ 1 ] - a[ 1 ] ) / L
			# ( the wall's own frame: t along it from a, d out of its face to the right of its run )
			W = lambda t, z, d, a=a, ux=ux, uy=uy: ( a[ 0 ] + ux * t + uy * d, a[ 1 ] + uy * t - ux * d, z )
			gates = sorted( ( g[ 'at' ] - along - g[ 'w' ] / 2, g[ 'at' ] - along + g[ 'w' ] / 2, g ) for g in wl.get( 'gates', [] ) if 0 <= g[ 'at' ] - along <= L )
			def make( T, L=L, gates=gates ):
				t = 0.0
				for g0, g1, g in gates + [ ( L, L, None ) ]:
					if g0 - t > 1e-3:
						T.box( t, g0, - th / 2, th / 2, - FOOT, wl[ 'height' ], wl[ 'mat' ] )
						T.box( t - 0.02, g0 + 0.02, - th / 2 - 0.03, th / 2 + 0.03, wl[ 'height' ], wl[ 'height' ] + 0.06, wl.get( 'cap', wl[ 'mat' ] ) )
					if g: T.box( g0, g1, - 0.02, 0.02, 0.0, g[ 'h' ], g[ 'mat' ] )
					t = g1
			on_wall( S, W, make )
			runs.append( ( a, b, wl[ 'height' ] ) )
			along += L
	for c in spec.get( 'chimneys', [] ):
		h = c[ 'side' ] / 2
		S.post( c[ 'x' ] - h, c[ 'x' ] + h, c[ 'y' ] - h, c[ 'y' ] + h, blocks[ 0 ][ 'eave' ], c[ 'top' ], c[ 'mat' ] )
		S.box( c[ 'x' ] - h - 0.05, c[ 'x' ] + h + 0.05, c[ 'y' ] - h - 0.05, c[ 'y' ] + h + 0.05, c[ 'top' ], c[ 'top' ] + 0.07, c.get( 'cap', c[ 'mat' ] ) )
	# the plan: the outline, a box per block up to its roof's top, the yard
	# ( by default the rectangle round all the blocks: give `outline` for a house that is not one )
	lo = ( min( b[ 'x' ][ 0 ] for b in blocks ), min( b[ 'y' ][ 0 ] for b in blocks ) ); hi = ( max( b[ 'x' ][ 1 ] for b in blocks ), max( b[ 'y' ][ 1 ] for b in blocks ) )
	outline = spec.get( 'outline' ) or [ ( lo[ 0 ], lo[ 1 ] ), ( hi[ 0 ], lo[ 1 ] ), ( hi[ 0 ], hi[ 1 ] ), ( lo[ 0 ], hi[ 1 ] ) ]
	boxes = []
	for b, top in zip( blocks, tops ): boxes += plan_box( b[ 'x' ][ 0 ], b[ 'x' ][ 1 ], b[ 'y' ][ 0 ], b[ 'y' ][ 1 ], top )
	return dict( outline=flat( outline ), boxes=boxes, walls=plan_walls( runs ), yard=flat( spec.get( 'yard' ) or outline ), paved=plan_paved( spec.get( 'paved', [] ) ), trees=plan_trees( [] ) )


def build( spec, out ):
	"""The house of SPEC into its own scene, exported to `out`; a report of its size."""
	scene = fresh_scene( spec[ 'name' ] )
	mats = make_materials( spec[ 'materials' ] )
	S = Shells()
	plan = build_house( S, spec )
	ob = S.object( spec[ 'name' ], mats, scene.collection, plan, up={ b[ 'roof' ][ 'cover' ] for b in spec[ 'blocks' ] } )
	os.makedirs( os.path.dirname( out ), exist_ok=True )
	export_glb( scene, out )
	me = ob.data
	return dict( vertices=len( me.vertices ), triangles=sum( len( p.vertices ) - 2 for p in me.polygons ), height=round( max( v.co.z for v in me.vertices ), 2 ) )
