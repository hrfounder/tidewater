"""Shared by the model scripts in this folder: meshes built as lists of plain shells, one material per
shell, and their export. A script loads it with

    exec( compile( open( os.path.join( ROOT, 'tools', 'blender', 'shells.py' ), encoding='utf-8' ).read(), 'shells.py', 'exec' ) )

(a script run with --python has no package to import from, and one exec'd inside a running Blender
has no file of its own).

Frame of every model: metres, z up, the front facing -y. The glTF export turns that into y up with
the front facing +z, which is the frame the game stands its models in.
"""
import bpy, bmesh, math


class Shells:

	"""Collects shells (vertices and faces with a material) into one mesh."""

	def __init__( self ):
		self.verts, self.faces, self.mats, self.smooth = [], [], [], []

	def shell( self, verts, faces, mat, smooth=False ):
		o = len( self.verts )
		self.verts += verts
		for f in faces:
			self.faces.append( [ o + i for i in f ] )
			self.mats.append( mat )
			self.smooth.append( smooth )

	def box( self, x0, x1, y0, y1, z0, z1, mat, back=True ):
		"""A box. back=False leaves out the +y face: the one against the wall the piece hangs on."""
		x0, x1, y0, y1, z0, z1 = min( x0, x1 ), max( x0, x1 ), min( y0, y1 ), max( y0, y1 ), min( z0, z1 ), max( z0, z1 )
		v = [ ( x, y, z ) for z in ( z0, z1 ) for y in ( y0, y1 ) for x in ( x0, x1 ) ]
		f = [ ( 0, 2, 3, 1 ), ( 4, 5, 7, 6 ), ( 0, 1, 5, 4 ), ( 0, 4, 6, 2 ), ( 1, 3, 7, 5 ) ]
		if back: f.append( ( 2, 6, 7, 3 ) )
		self.shell( v, f, mat )

	def frame( self, x0, x1, z0, z1, bar, y0, y1, mat ):
		"""A frame set in an opening: its face at y0, a ring `bar` wide round the opening, and the
		inner edges of the ring running back to y1. Its outer edges are against the reveal, unseen."""
		xi0, xi1, zi0, zi1 = x0 + bar, x1 - bar, z0 + bar, z1 - bar
		v = [ ( x0, y0, z0 ), ( x1, y0, z0 ), ( x1, y0, z1 ), ( x0, y0, z1 ), ( xi0, y0, zi0 ), ( xi1, y0, zi0 ), ( xi1, y0, zi1 ), ( xi0, y0, zi1 ),
			( xi0, y1, zi0 ), ( xi1, y1, zi0 ), ( xi1, y1, zi1 ), ( xi0, y1, zi1 ) ]
		f = [ ( 0, 1, 5, 4 ), ( 1, 2, 6, 5 ), ( 2, 3, 7, 6 ), ( 3, 0, 4, 7 ), ( 4, 5, 9, 8 ), ( 5, 6, 10, 9 ), ( 6, 7, 11, 10 ), ( 7, 4, 8, 11 ) ]
		self.shell( v, f, mat )

	def bar( self, x0, x1, z0, z1, y0, y1, mat ):
		"""A member across a frame: its face at y0 and the two long edges running back to y1."""
		if x1 - x0 < z1 - z0: sides = [ [ ( x0, y0, z0 ), ( x0, y0, z1 ), ( x0, y1, z1 ), ( x0, y1, z0 ) ], [ ( x1, y0, z1 ), ( x1, y0, z0 ), ( x1, y1, z0 ), ( x1, y1, z1 ) ] ]
		else: sides = [ [ ( x1, y0, z0 ), ( x0, y0, z0 ), ( x0, y1, z0 ), ( x1, y1, z0 ) ], [ ( x0, y0, z1 ), ( x1, y0, z1 ), ( x1, y1, z1 ), ( x0, y1, z1 ) ] ]
		self.shell( [ ( x0, y0, z0 ), ( x1, y0, z0 ), ( x1, y0, z1 ), ( x0, y0, z1 ) ], [ ( 0, 1, 2, 3 ) ], mat )
		for q in sides: self.shell( q, [ ( 0, 1, 2, 3 ) ], mat )

	def ledge( self, x0, x1, y0, y1, z0, z1, mat ):
		"""A sill or a step: a box seen from in front and above, without the faces under it and behind it."""
		v = [ ( x, y, z ) for z in ( z0, z1 ) for y in ( y0, y1 ) for x in ( x0, x1 ) ]
		self.shell( v, [ ( 4, 5, 7, 6 ), ( 0, 1, 5, 4 ), ( 0, 4, 6, 2 ), ( 1, 3, 7, 5 ) ], mat )

	def post( self, x0, x1, y0, y1, z0, z1, mat ):
		"""A post or a pillar standing on the ground: its four sides and its top."""
		v = [ ( x, y, z ) for z in ( z0, z1 ) for y in ( y0, y1 ) for x in ( x0, x1 ) ]
		self.shell( v, [ ( 4, 5, 7, 6 ), ( 0, 1, 5, 4 ), ( 2, 6, 7, 3 ), ( 0, 4, 6, 2 ), ( 1, 3, 7, 5 ) ], mat )

	def leaf( self, x0, x1, y0, y1, z0, z1, mat ):
		"""A hung leaf of boards, seen from its two faces and from above."""
		v = [ ( x, y, z ) for z in ( z0, z1 ) for y in ( y0, y1 ) for x in ( x0, x1 ) ]
		self.shell( v, [ ( 4, 5, 7, 6 ), ( 0, 1, 5, 4 ), ( 2, 6, 7, 3 ) ], mat )

	def panel( self, x0, x1, y, z0, z1, mat ):
		"""A flat panel facing -y."""
		self.shell( [ ( x0, y, z0 ), ( x1, y, z0 ), ( x1, y, z1 ), ( x0, y, z1 ) ], [ ( 0, 1, 2, 3 ) ], mat )

	def disc( self, cx, cz, r, y, mat, seg=12 ):
		"""A flat disc facing -y."""
		v = [ ( cx + r * math.cos( 2 * math.pi * k / seg ), y, cz + r * math.sin( 2 * math.pi * k / seg ) ) for k in range( seg ) ]
		self.shell( v, [ tuple( range( seg ) ) ], mat )

	def ring( self, cx, cz, r0, r1, y0, y1, mat, seg=12 ):
		"""A ring standing proud of the wall from y1 out to y0: its face and its outer rim."""
		v, f = [], []
		for k in range( seg ):
			c, s = math.cos( 2 * math.pi * k / seg ), math.sin( 2 * math.pi * k / seg )
			v += [ ( cx + r0 * c, y0, cz + r0 * s ), ( cx + r1 * c, y0, cz + r1 * s ), ( cx + r1 * c, y1, cz + r1 * s ) ]
		for k in range( seg ):
			a, b = 3 * k, 3 * ( ( k + 1 ) % seg )
			f += [ ( a, a + 1, b + 1, b ), ( a + 1, a + 2, b + 2, b + 1 ) ]
		self.shell( v, f, mat )

	def pole( self, x, y, z0, z1, r0, r1, mat, seg=8 ):
		"""An upright pole: a tapering prism of `seg` sides about the vertical through ( x, y ), capped on top."""
		v = []
		for r, z in ( ( r0, z0 ), ( r1, z1 ) ):
			for k in range( seg ):
				a = 2 * math.pi * ( k + 0.5 ) / seg
				v.append( ( x + r * math.cos( a ), y + r * math.sin( a ), z ) )
		f = [ ( k, ( k + 1 ) % seg, seg + ( k + 1 ) % seg, seg + k ) for k in range( seg ) ]
		f.append( tuple( range( seg, 2 * seg ) ) )
		self.shell( v, f, mat )

	def prism( self, poly, a0, a1, mat, plane='xz' ):
		"""An outline pushed through from a0 to a1, closed at both ends. plane 'xz': the outline is
		( x, z ) and runs along y; 'yz': ( y, z ) along x; 'xy': ( x, y ) along z (a slab)."""
		n = len( poly )
		P = { 'xz': lambda p, a: ( p[ 0 ], a, p[ 1 ] ), 'yz': lambda p, a: ( a, p[ 0 ], p[ 1 ] ), 'xy': lambda p, a: ( p[ 0 ], p[ 1 ], a ) }[ plane ]
		v = [ P( p, a0 ) for p in poly ] + [ P( p, a1 ) for p in poly ]
		f = [ tuple( range( n ) ), tuple( range( 2 * n - 1, n - 1, - 1 ) ) ]
		f += [ ( i, ( i + 1 ) % n, n + ( i + 1 ) % n, n + i ) for i in range( n ) ]
		self.shell( v, f, mat )

	def lathe( self, profile, cx, cy, mat, seg=32, turn=0.0, soft=False ):
		"""( radius, z ) pairs turned about the vertical through ( cx, cy ), capped at both ends. With
		more than 8 sides it is round: shaded smooth round the turn, and each step of the profile
		keeps its own edge unless `soft` (a bulb, a ball). With few sides (seg 4, 8) it is a tower or
		a spire: `turn` (radians) sets where its corners point, and it is shaded flat."""
		ring = lambda r, z: [ ( cx + r * math.cos( turn + 2 * math.pi * k / seg ), cy + r * math.sin( turn + 2 * math.pi * k / seg ), z ) for k in range( seg ) ]
		band = [ ( k, ( k + 1 ) % seg, seg + ( k + 1 ) % seg, seg + k ) for k in range( seg ) ]
		if soft:
			v = [ p for r, z in profile for p in ring( r, z ) ]
			f = [ tuple( i * seg + j for j in q ) for i in range( len( profile ) - 1 ) for q in band ]
			self.shell( v, f, mat, smooth=seg > 8 )
		else:
			for ( r0, z0 ), ( r1, z1 ) in zip( profile, profile[ 1: ] ): self.shell( ring( r0, z0 ) + ring( r1, z1 ), band, mat, smooth=seg > 8 )
		self.shell( ring( *profile[ 0 ] ), [ tuple( range( seg - 1, - 1, - 1 ) ) ], mat )
		self.shell( ring( *profile[ - 1 ] ), [ tuple( range( seg ) ) ], mat )

	def object( self, name, materials, collection, props=None ):
		"""The collected shells as an object named `name`; props become its custom properties."""
		used = sorted( set( self.mats ), key=lambda m: list( materials ).index( m ) )
		me = bpy.data.meshes.new( name )
		me.from_pydata( self.verts, [], self.faces )
		for m in used: me.materials.append( materials[ m ] )
		for poly, m, smooth in zip( me.polygons, self.mats, self.smooth ):
			poly.material_index = used.index( m )
			poly.use_smooth = smooth
		bm = bmesh.new(); bm.from_mesh( me )
		bmesh.ops.recalc_face_normals( bm, faces=bm.faces )
		bm.to_mesh( me ); bm.free()
		ob = bpy.data.objects.new( name, me )
		for k, v in ( props or {} ).items(): ob[ k ] = v
		collection.objects.link( ob )
		return ob


def make_materials( table ):
	"""table: name -> ( sRGB 0-255, roughness, metallic ). Plain base colours: the game shades them."""
	lin = lambda c: ( c / 255 ) ** 2.2
	out = {}
	for name, ( rgb, rough, metal ) in table.items():
		m = bpy.data.materials.get( name ) or bpy.data.materials.new( name )
		m.use_nodes = True
		bsdf = m.node_tree.nodes.get( 'Principled BSDF' )
		bsdf.inputs[ 'Base Color' ].default_value = ( lin( rgb[ 0 ] ), lin( rgb[ 1 ] ), lin( rgb[ 2 ] ), 1 )
		bsdf.inputs[ 'Roughness' ].default_value = rough
		bsdf.inputs[ 'Metallic' ].default_value = metal
		out[ name ] = m
	return out


def fresh_scene( name ):
	"""A scene of this script's own, emptied: a running Blender keeps whatever else it has open."""
	scene = bpy.data.scenes.get( name ) or bpy.data.scenes.new( name )
	for ob in list( scene.collection.objects ): bpy.data.objects.remove( ob, do_unlink=True )
	bpy.context.window.scene = scene
	return scene


def export_glb( scene, path ):
	"""Export the objects of `scene`, and nothing else a running Blender has open."""
	bpy.context.window.scene = scene
	bpy.ops.export_scene.gltf( filepath=path, export_format='GLB', use_active_scene=True, export_apply=True, export_yup=True,
		export_extras=True, export_materials='EXPORT', export_normals=True, export_texcoords=False, export_animations=False )
