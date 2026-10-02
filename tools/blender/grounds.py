"""Shared by the landmark scripts in this folder: what stands round a landmark (fences, walls, pillars,
gates), and how a model's plan is written for the game. Loaded after shells.py, the same way:

    exec( compile( open( os.path.join( ROOT, 'tools', 'blender', 'grounds.py' ), encoding='utf-8' ).read(), 'grounds.py', 'exec' ) )

Everything is laid on the ground of the model's frame (metres, z up): a point is ( x, y ).

A fence's style is a dict:
  base     ( height, thickness, material, coping's material or None ): the low wall the iron stands
           on, or None for iron that stands on the ground
  top      the height of the iron's top rail above the ground
  picket   ( thickness, metres between them )
  tall     ( every how many, how much taller ): the pickets that stand above the rest, or None
  ends     how far the fence stops short of each end of its run (half the pillar or the post there)
"""
import math

# a fence or a wall is founded this far under the ground (m)
FOUNDED = 0.3


def run( a, b ):
	"""A run along the ground from a to b: a function that turns ( along, across, z ) into a point,
	and the run's length."""
	l = math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] )
	tx, ty = ( b[ 0 ] - a[ 0 ] ) / l, ( b[ 1 ] - a[ 1 ] ) / l
	return ( lambda t, o, z: ( a[ 0 ] + tx * t - ty * o, a[ 1 ] + ty * t + tx * o, z ) ), l


def slab( S, at, t0, t1, o0, o1, z0, z1, mat ):
	"""A box along a run: from t0 to t1 along it, o0 to o1 across, z0 to z1; no face under it."""
	v = [ at( t, o, z ) for z in ( z0, z1 ) for o in ( o0, o1 ) for t in ( t0, t1 ) ]
	S.shell( v, [ ( 4, 5, 7, 6 ), ( 0, 1, 5, 4 ), ( 2, 6, 7, 3 ), ( 0, 4, 6, 2 ), ( 1, 3, 7, 5 ) ], mat )


def picket( S, at, t, z0, z1, size, mat='iron' ):
	"""An upright bar on a run: its four sides."""
	h = size / 2
	v = [ at( t + dt, do, z ) for z in ( z0, z1 ) for dt, do in ( ( - h, - h ), ( h, - h ), ( h, h ), ( - h, h ) ) ]
	S.shell( v, [ ( 0, 1, 5, 4 ), ( 1, 2, 6, 5 ), ( 2, 3, 7, 6 ), ( 3, 0, 4, 7 ) ], mat )


def iron_fence( S, a, b, F ):
	"""A stretch of iron fence from a to b in the style F: its base, two rails and the pickets."""
	at, l = run( a, b )
	t0, t1 = F[ 'ends' ], l - F[ 'ends' ]
	foot = 0.0
	if F[ 'base' ]:
		height, thick, mat, coping = F[ 'base' ]
		slab( S, at, t0, t1, - thick / 2, thick / 2, - FOUNDED, height, mat )
		foot = height
		if coping:
			slab( S, at, t0, t1, - thick / 2 - 0.03, thick / 2 + 0.03, height, height + 0.06, coping )
			foot = height + 0.06
	for z in ( foot + 0.14, F[ 'top' ] - 0.18 ): slab( S, at, t0, t1, - 0.012, 0.012, z, z + 0.035, 'iron' )
	size, gap = F[ 'picket' ]
	n = max( 1, round( ( t1 - t0 ) / gap ) )
	for k in range( n ):
		tall = F[ 'tall' ][ 1 ] if F[ 'tall' ] and k % F[ 'tall' ][ 0 ] == 0 else 0
		picket( S, at, t0 + ( t1 - t0 ) * ( k + 0.5 ) / n, foot, F[ 'top' ] + tall, size )


def masonry_wall( S, a, b, height, thick, mat, coping ):
	"""A wall from a to b under a coping."""
	at, l = run( a, b )
	slab( S, at, 0, l, - thick / 2, thick / 2, - FOUNDED, height, mat )
	slab( S, at, 0, l, - thick / 2 - 0.04, thick / 2 + 0.04, height, height + 0.07, coping )


def masonry_pillar( S, x, y, side, height, mat, cap ):
	"""A pillar `side` square under a cap that ends in a turned finial."""
	h, c = side / 2, side / 2 + 0.07
	S.post( x - h, x + h, y - h, y + h, - FOUNDED, height, mat )
	S.post( x - c, x + c, y - c, y + c, height, height + 0.12, cap )
	S.lathe( [ ( c * math.sqrt( 2 ) * 0.86, height + 0.12 ), ( 0.16, height + 0.34 ), ( 0.1, height + 0.4 ), ( 0.17, height + 0.52 ), ( 0.03, height + 0.66 ) ], x, y, cap, seg=4, turn=math.pi / 4 )


def iron_post( S, x, y, side, height ):
	"""A square iron post under a ball."""
	h = side / 2
	S.post( x - h, x + h, y - h, y + h, - FOUNDED, height, 'iron' )
	S.lathe( [ ( h * 0.6, height ), ( h * 1.5, height + h ), ( h * 1.5, height + 2 * h ), ( h * 0.3, height + 3 * h ) ], x, y, 'iron', seg=6 )


def gate_leaf( S, hinge, to, F ):
	"""An iron leaf from its hinge to the point `to`, its top bowed up in the middle."""
	at, l = run( hinge, to )
	top = F[ 'top' ]
	for z in ( 0.12, 1.0, top ): slab( S, at, 0, l, - 0.015, 0.015, z, z + 0.04, 'iron' )
	for t in ( 0.02, l - 0.02 ): slab( S, at, t - 0.02, t + 0.02, - 0.02, 0.02, 0.08, top + 0.25, 'iron' )
	size, gap = F[ 'picket' ]
	n = round( l / gap )
	for k in range( 1, n ): picket( S, at, l * k / n, 0.12, top + 0.25 * math.sin( math.pi * k / n ), size )


# ---- the plan a model carries for the game (src/regions/slavonia/build/Models.js): flat lists of
# numbers in the game's frame for a model, x as here and z = -y (the front toward +z)

def flat( points ):
	"""Points ( x, y ) as x, z, x, z, ..."""
	return [ c for x, y in points for c in ( round( x, 3 ), round( - y, 3 ) ) ]


def plan_box( x0, x1, y0, y1, top ):
	"""What cannot be walked through, as x0, x1, z0, z1, top."""
	return [ round( x0, 3 ), round( x1, 3 ), round( - y1, 3 ), round( - y0, 3 ), round( top, 3 ) ]


def plan_walls( runs ):
	"""Fences and walls ( a, b, height ) as x, z, x, z, height, ..."""
	return [ c for a, b, h in runs for c in flat( [ a, b ] ) + [ h ] ]


def plan_paved( outlines ):
	"""Paved outlines, each as its count of points and then x, z, ..."""
	return [ c for o in outlines for c in [ len( o ) ] + flat( o ) ]


def plan_trees( trees ):
	"""Trees ( x, y, height ) as x, z, height, ..."""
	return [ c for x, y, h in trees for c in ( x, - y, h ) ]
