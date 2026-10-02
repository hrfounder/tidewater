"""Render a model's scene from given places, to set beside the photographs it was made from.

In a running Blender, after the model's own script has built its scene:

    exec( compile( open( REPO + r'/tools/blender/look.py', encoding='utf-8' ).read(), 'look.py', 'exec' ) )
    look( 'StAndrew', r'<folder>', { 'front': ( ( x, y, z ), ( x, y, z ), 78 ), ... }, size=( 576, 1024 ) )

Each view is ( where the camera stands, what it looks at, its vertical field of view in degrees ), in
the model's frame. The pictures are for judging form and proportion only: one sun, a flat sky, a
green plane for the ground. Colour is judged in the game, under its own light.
"""
import bpy, math, mathutils, os


def look( scene_name, folder, views, size=( 576, 1024 ) ):
	scene = bpy.data.scenes[ scene_name ]
	bpy.context.window.scene = scene

	def own( name, make ):
		ob = bpy.data.objects.get( name ) or make()
		if ob.name not in scene.collection.objects: scene.collection.objects.link( ob )
		return ob

	def ground():
		me = bpy.data.meshes.new( 'LookGround' )
		me.from_pydata( [ ( - 80, - 80, - 0.01 ), ( 80, - 80, - 0.01 ), ( 80, 80, - 0.01 ), ( - 80, 80, - 0.01 ) ], [], [ ( 0, 1, 2, 3 ) ] )
		m = bpy.data.materials.new( 'LookGrass' )
		m.use_nodes = True
		m.node_tree.nodes[ 'Principled BSDF' ].inputs[ 'Base Color' ].default_value = ( 0.08, 0.16, 0.04, 1 )
		me.materials.append( m )
		return bpy.data.objects.new( 'LookGround', me )

	def sun():
		ob = bpy.data.objects.new( 'LookSun', bpy.data.lights.new( 'LookSun', 'SUN' ) )
		ob.data.energy = 2.2
		ob.rotation_euler = ( math.radians( 55 ), 0, math.radians( - 40 ) )
		return ob

	helpers = [ own( 'LookGround', ground ), own( 'LookSun', sun ), own( 'LookCam', lambda: bpy.data.objects.new( 'LookCam', bpy.data.cameras.new( 'LookCam' ) ) ) ]
	cam = helpers[ 2 ]
	cam.data.sensor_fit = 'VERTICAL'
	cam.data.clip_end = 600
	scene.camera = cam
	world = bpy.data.worlds.get( 'LookSky' ) or bpy.data.worlds.new( 'LookSky' )
	world.use_nodes = True
	world.node_tree.nodes[ 'Background' ].inputs[ 0 ].default_value = ( 0.55, 0.7, 0.95, 1 )
	world.node_tree.nodes[ 'Background' ].inputs[ 1 ].default_value = 0.6
	scene.world = world
	scene.render.resolution_x, scene.render.resolution_y = size
	scene.render.resolution_percentage = 100
	scene.view_settings.view_transform = 'Standard'
	os.makedirs( folder, exist_ok=True )
	for name, ( at, to, fov ) in views.items():
		cam.location = at
		cam.rotation_euler = ( mathutils.Vector( to ) - mathutils.Vector( at ) ).to_track_quat( '-Z', 'Y' ).to_euler()
		cam.data.angle_y = math.radians( fov )
		scene.render.filepath = os.path.join( folder, name + '.png' )
		bpy.ops.render.render( write_still=True )
	# the helpers leave the scene again: a model's export takes everything that is in it
	for ob in helpers: scene.collection.objects.unlink( ob )
	return list( views )
