"""The municipality of Andrijaševci (Općina Andrijaševci) on Vinkovačka ulica: the two-storey block.

Run inside Blender (as the other model scripts):

    REPO = r'<repo>'; exec( compile( open( REPO + r'/tools/blender/houses/opcina.py', encoding='utf-8' ).read(), 'opcina.py', 'exec' ), { 'REPO': REPO } )

Writes public/models/slavonia/houses/opcina.glb. It stands on footprint 1560 (survey sheet opcina):
16.2 m along the street by 10.1 m, its front to the west. Seen from the street, x runs north to south.

What it rests on: the street tour of 2025 (the video of the drive from Rokovci, frames at 30-35 s,
tools: F:/tidewater-data/ref/tour/t_0122..0144) for the face; the orthophoto for the plan and the
roof. Measured by numbers: the render's yellow reads 222, 183, 95 on three frames (its whites read
234, 217, 209 in that evening light, so the yellow is taken a little bluer, as white would be white).
Read by proportion off the frames: two storeys, the eaves at about two storeys' height over a low
plinth, a roof so low it is not seen from the street (hipped, under solar panels on the orthophoto);
on the ground floor the glazed entrance under a flat canopy at the north end, then three wide windows
of three lights with a top light; upstairs a wide window of three lights over the entrance, then
three of two lights with roller shutters, an air conditioner's unit beside the first; a downpipe at
the middle. Sizes that the frames cannot give (a window's height, the sill's) are the usual ones.
"""
import os
ROOT = globals().get( 'REPO' ) or os.path.dirname( os.path.dirname( os.path.dirname( os.path.dirname( os.path.abspath( __file__ ) ) ) ) )
for f in ( 'shells.py', 'grounds.py', 'house.py' ): exec( compile( open( os.path.join( ROOT, 'tools', 'blender', f ), encoding='utf-8' ).read(), f, 'exec' ) )
OUT = os.path.join( ROOT, 'public', 'models', 'slavonia', 'houses', 'opcina.glb' )

L, D = 16.2, 10.1                 # along the street, and deep (the footprint)
X0, X1, Y0, Y1 = - L / 2, L / 2, - D / 2, D / 2
STOREY, EAVE = 3.0, 6.0           # floor to floor; the eaves over the ground floor (the upstairs windows' boxes are just under the fascia)
UP = STOREY                        # the upper floor's level
WIDE = dict( w=3.0, h=1.95, sill=0.8, panes=[ 3, 1 ], transom=0.5 )          # a ground-floor window
TWO = dict( w=1.4, h=1.45, sill=UP + 0.95, panes=[ 2, 1 ], box=0.22, shutter=0.18 )   # an upstairs window

SPEC = dict(
	name='Opcina',
	materials={
		'wall': ( ( 222, 184, 104 ), 0.92, 0.0 ),       # the yellow render (measured, see above)
		'plinth': ( ( 150, 148, 142 ), 0.94, 0.0 ),
		'frame': ( ( 240, 240, 236 ), 0.50, 0.0 ),      # white PVC frames
		'glass': ( ( 40, 48, 58 ), 0.10, 0.0 ),
		'box': ( ( 236, 236, 232 ), 0.55, 0.0 ),        # the roller shutters' boxes
		'shutter': ( ( 214, 214, 208 ), 0.60, 0.0 ),
		'slat': ( ( 180, 180, 176 ), 0.60, 0.0 ),
		'sill': ( ( 200, 200, 196 ), 0.70, 0.2 ),
		'tile': ( ( 84, 71, 67 ), 0.85, 0.0 ),          # the roof as the survey read it
		'fascia': ( ( 72, 52, 40 ), 0.70, 0.0 ),        # dark brown boards: the eaves and the canopy
		'soffit': ( ( 210, 200, 186 ), 0.90, 0.0 ),
		'post': ( ( 84, 62, 46 ), 0.70, 0.0 ),
		'pipe': ( ( 200, 200, 196 ), 0.50, 0.3 ),
		'unit': ( ( 226, 226, 222 ), 0.60, 0.1 ),
		'stone': ( ( 150, 150, 146 ), 0.90, 0.0 ),      # the north pillar's cladding
	},
	parts=dict( frame='frame', glass='glass', box='box', shutter='shutter', slat='slat', sill='sill' ),
	blocks=[ dict( x=[ X0, X1 ], y=[ Y0, Y1 ], eave=EAVE, plinth=( 0.25, 'plinth' ), wall='wall',
		roof=dict( form='hip', pitch=12, over=0.6, cover='tile', fascia=( 'fascia', 0.32 ), soffit='soffit' ) ) ],
	openings=[
		# the ground floor: the entrance, then the three wide windows
		dict( block=0, side='front', at=2.2, sill=0, w=2.2, h=2.75, kind='door', leaves=2, leaf='glass', transom=0.45 ),
		dict( block=0, side='front', at=5.9, kind='window', **WIDE ),
		dict( block=0, side='front', at=9.9, kind='window', **WIDE ),
		dict( block=0, side='front', at=13.9, kind='window', **WIDE ),
		# upstairs: the wide window over the entrance, then three of two lights
		dict( block=0, side='front', at=2.2, kind='window', w=2.4, h=1.45, sill=UP + 0.95, panes=[ 3, 1 ], box=0.22, shutter=0.1 ),
		dict( block=0, side='front', at=5.6, kind='window', **TWO ),
		dict( block=0, side='front', at=10.3, kind='window', **TWO ),
		dict( block=0, side='front', at=14.0, kind='window', **TWO ),
	],
	canopies=[ dict( x=[ X0, X0 + 3.9 ], y=[ Y0 - 2.6, Y0 ], z=2.8, thick=0.28, mat='soffit', fascia='fascia',
		# ( a dark wooden post at its south corner, a pillar clad in grey stone at its north one, by the
		# post office's front: the post office's door is in the recess under it, posta.py )
		posts=[ [ X0 + 3.7, Y0 - 2.4 ], [ X0 + 0.3, Y0 - 2.35 ] ], sizes=[ 0.24, 0.5 ], mats=[ 'post', 'stone' ], post=0.24, post_mat='post' ) ],
	pipes=[ dict( block=0, side='front', at=8.1, mat='pipe' ) ],
	units=[ dict( block=0, side='front', at=6.9, z=UP + 1.25, size=[ 0.8, 0.55, 0.3 ], mat='unit' ) ],
	# the ground it stands on: the footprint and the paved strip before it, under the canopy
	yard=[ ( X0, Y0 - 2.8 ), ( X1, Y0 - 2.8 ), ( X1, Y1 ), ( X0, Y1 ) ],
)

result = build( SPEC, OUT )
print( 'opcina:', result, '->', OUT )
