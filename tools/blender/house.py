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
      roof            { form: 'gable' | 'hip', ridge: 'x' | 'y' (gable: the way the ridge runs),
                      pitch: degrees, over: the eaves' overhang (m), verge: the overhang at a gable
                      end (m), cover: material, fascia: the board along the eaves and its depth
                      [ material, m ], soffit: material under the overhang }
  openings            in the walls, each { block, side: 'front' | 'right' | 'back' | 'left',
                      at: its middle, in metres from the wall's left end as one looks at the wall from
                      outside, sill: its foot over the floor, w, h, kind: 'window' | 'door',
                      panes: [ across, up ] (a window), transom: the height of a fixed top light (m),
                      box: a roller shutter's box over the opening (its height, m, inside the opening's
                      h), shutter: how much of the glass the shutter covers (0..1), leaf: 'glass' or a
                      material for a door's leaves, leaves: how many }
  canopies            flat roofs over an entrance, each { x, y: [ from, to ], z: its underside, thick,
                      posts: [ [ x, y ], ... ], post: its side (m), mat, fascia: material }
  pipes               downpipes: { block, side, at }
  units               boxes on a wall (an air conditioner's outdoor unit): { block, side, at, z, size: [ w, h, d ], mat }
  chimneys            { x, y, top: over the floor, side, mat }
  parts               the materials of the house's joinery by what they are for: frame, glass, box
                      (a roller shutter's), shutter, slat, sill
  outline             the plan the game takes for the house, [ [ x, y ], ... ] (default: block 0)
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
	if o.get( 'transom' ):
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
	for q in slopes: S.shell( q, [ tuple( range( len( q ) ) ) ], r[ 'cover' ] )
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
		S.shell( [ ( x0 - v, y0 - o, ze ), ( x1 + v, y0 - o, ze ), ( x1 + v, ym, zr ), ( x0 - v, ym, zr ) ], [ ( 0, 1, 2, 3 ) ], r[ 'cover' ] )
		S.shell( [ ( x1 + v, y1 + o, ze ), ( x0 - v, y1 + o, ze ), ( x0 - v, ym, zr ), ( x1 + v, ym, zr ) ], [ ( 0, 1, 2, 3 ) ], r[ 'cover' ] )
		for x, s in ( ( x0, - 1 ), ( x1, 1 ) ): S.shell( [ ( x, y0, b[ 'eave' ] ), ( x, y1, b[ 'eave' ] ), ( x, ym, zr ) ][ ::s ], [ ( 0, 1, 2 ) ], b[ 'wall' ] )
		eaves( S, b, r, ( x0 - v, x1 + v, y0 - o, y1 + o ), ze, sides=( 'front', 'back' ) )
	else:
		half = ( x1 - x0 ) / 2; zr = b[ 'eave' ] + half * tan; xm = ( x0 + x1 ) / 2
		S.shell( [ ( x0 - o, y1 + v, ze ), ( x0 - o, y0 - v, ze ), ( xm, y0 - v, zr ), ( xm, y1 + v, zr ) ], [ ( 0, 1, 2, 3 ) ], r[ 'cover' ] )
		S.shell( [ ( x1 + o, y0 - v, ze ), ( x1 + o, y1 + v, ze ), ( xm, y1 + v, zr ), ( xm, y0 - v, zr ) ], [ ( 0, 1, 2, 3 ) ], r[ 'cover' ] )
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
			ours = [ o for o in mine if o[ 'side' ] == side ]
			holes = [ ( o[ 'at' ] - o[ 'w' ] / 2, o[ 'at' ] + o[ 'w' ] / 2, o[ 'sill' ], o[ 'sill' ] + o[ 'h' ] ) for o in ours ]
			plinth, pmat = b.get( 'plinth', ( 0.3, b[ 'wall' ] ) )
			def make( T, ours=ours, holes=holes, L=L, plinth=plinth, pmat=pmat, b=b ):
				holed( T, 0, L, - FOOT, plinth, holes, pmat, reveals=False )
				holed( T, 0, L, plinth, b[ 'eave' ], [ ( ta, tb, max( za, plinth ), zb ) for ta, tb, za, zb in holes if zb > plinth ], b[ 'wall' ], reveals=False )
				for ta, tb, za, zb in holes:
					for q in ( [ ( ta, 0, za ), ( ta, 0, zb ), ( ta, SET_BACK, zb ), ( ta, SET_BACK, za ) ], [ ( tb, 0, zb ), ( tb, 0, za ), ( tb, SET_BACK, za ), ( tb, SET_BACK, zb ) ],
							[ ( ta, 0, zb ), ( tb, 0, zb ), ( tb, SET_BACK, zb ), ( ta, SET_BACK, zb ) ], [ ( tb, 0, za ), ( ta, 0, za ), ( ta, SET_BACK, za ), ( tb, SET_BACK, za ) ] ):
						T.shell( q, [ ( 0, 1, 2, 3 ) ], b[ 'wall' ] )
				for o in ours: ( door if o[ 'kind' ] == 'door' else window )( T, o, mats )
			on_wall( S, W, make )
		r = b[ 'roof' ]
		tops.append( ( hip if r[ 'form' ] == 'hip' else gable )( S, b, r ) )
	for c in spec.get( 'canopies', [] ):
		( x0, x1 ), ( y0, y1 ) = c[ 'x' ], c[ 'y' ]
		S.box( x0, x1, y0, y1, c[ 'z' ], c[ 'z' ] + c[ 'thick' ], c[ 'mat' ] )
		if c.get( 'fascia' ):
			for f in ( ( x0, x1, y0 - 0.02, y0 ), ( x0 - 0.02, x0, y0, y1 ), ( x1, x1 + 0.02, y0, y1 ) ):
				S.box( f[ 0 ], f[ 1 ], f[ 2 ], f[ 3 ], c[ 'z' ] - 0.02, c[ 'z' ] + c[ 'thick' ] + 0.02, c[ 'fascia' ] )
		for px, py in c.get( 'posts', [] ):
			h = c[ 'post' ] / 2
			S.post( px - h, px + h, py - h, py + h, - FOOT, c[ 'z' ], c[ 'post_mat' ] )
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
	for c in spec.get( 'chimneys', [] ):
		h = c[ 'side' ] / 2
		S.post( c[ 'x' ] - h, c[ 'x' ] + h, c[ 'y' ] - h, c[ 'y' ] + h, blocks[ 0 ][ 'eave' ], c[ 'top' ], c[ 'mat' ] )
		S.box( c[ 'x' ] - h - 0.05, c[ 'x' ] + h + 0.05, c[ 'y' ] - h - 0.05, c[ 'y' ] + h + 0.05, c[ 'top' ], c[ 'top' ] + 0.07, c.get( 'cap', c[ 'mat' ] ) )
	# the plan: the outline, a box per block up to its roof's top, the yard
	b0 = blocks[ 0 ]
	outline = spec.get( 'outline' ) or [ ( b0[ 'x' ][ 0 ], b0[ 'y' ][ 0 ] ), ( b0[ 'x' ][ 1 ], b0[ 'y' ][ 0 ] ), ( b0[ 'x' ][ 1 ], b0[ 'y' ][ 1 ] ), ( b0[ 'x' ][ 0 ], b0[ 'y' ][ 1 ] ) ]
	boxes = []
	for b, top in zip( blocks, tops ): boxes += plan_box( b[ 'x' ][ 0 ], b[ 'x' ][ 1 ], b[ 'y' ][ 0 ], b[ 'y' ][ 1 ], top )
	return dict( outline=flat( outline ), boxes=boxes, walls=plan_walls( [] ), yard=flat( spec.get( 'yard' ) or outline ), paved=plan_paved( spec.get( 'paved', [] ) ), trees=plan_trees( [] ) )


def build( spec, out ):
	"""The house of SPEC into its own scene, exported to `out`; a report of its size."""
	scene = fresh_scene( spec[ 'name' ] )
	mats = make_materials( spec[ 'materials' ] )
	S = Shells()
	plan = build_house( S, spec )
	ob = S.object( spec[ 'name' ], mats, scene.collection, plan )
	os.makedirs( os.path.dirname( out ), exist_ok=True )
	export_glb( scene, out )
	me = ob.data
	return dict( vertices=len( me.vertices ), triangles=sum( len( p.vertices ) - 2 for p in me.polygons ), height=round( max( v.co.z for v in me.vertices ), 2 ) )
