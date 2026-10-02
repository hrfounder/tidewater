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
		self.verts, self.faces, self.mats = [], [], []

	def shell( self, verts, faces, mat ):
		o = len( self.verts )
		self.verts += verts
		for f in faces:
			self.faces.append( [ o + i for i in f ] )
			self.mats.append( mat )

	def box( self, x0, x1, y0, y1, z0, z1, mat, back=True ):
		"""A box. back=False leaves out the +y face: the one against the wall the piece hangs on."""
		x0, x1, y0, y1, z0, z1 = min( x0, x1 ), max( x0, x1 ), min( y0, y1 ), max( y0, y1 ), min( z0, z1 ), max( z0, z1 )
		v = [ ( x, y, z ) for z in ( z0, z1 ) for y in ( y0, y1 ) for x in ( x0, x1 ) ]
		f = [ ( 0, 2, 3, 1 ), ( 4, 5, 7, 6 ), ( 0, 1, 5, 4 ), ( 0, 4, 6, 2 ), ( 1, 3, 7, 5 ) ]
		if back: f.append( ( 2, 6, 7, 3 ) )
		self.shell( v, f, mat )

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

	def object( self, name, materials, collection, props=None ):
		"""The collected shells as an object named `name`; props become its custom properties."""
		used = sorted( set( self.mats ), key=lambda m: list( materials ).index( m ) )
		me = bpy.data.meshes.new( name )
		me.from_pydata( self.verts, [], self.faces )
		for m in used: me.materials.append( materials[ m ] )
		for poly, m in zip( me.polygons, self.mats ): poly.material_index = used.index( m )
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
