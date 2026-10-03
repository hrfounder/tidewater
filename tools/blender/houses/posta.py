"""The post office of Andrijaševci on Vinkovačka ulica: the one-storey wing against the north end of
the municipality, under the same canopy.

Run inside Blender as the other house scripts (tools/blender/houses/opcina.py). Writes
public/models/slavonia/houses/posta.glb. It stands on footprint 1561: 8.3 m along the street by
11.9 m deep, its front to the west; seen from the street, x runs north to south and the municipality
is against its right end.

What it rests on: Ivan's Street View picture of 2024 (it, the canopy and the municipality's corner
from across the street, south-west of it) and the street tour of 2025 (frames t_0124..0128). One
storey of the municipality's yellow over a grey plinth; a low hipped roof of grey-brown tiles with
dark eaves boards, a brick chimney at its back; in the front two windows of two lights, the post's
black sign and its yellow box at its south end; the windows' frames are dark. Its front stands 3 m before the municipality's (the
two footprints and the picture agree): the door, glass in a brown frame, is in its south wall in the
recess under the municipality's canopy (opcina.py), whose front corner here stands on a pillar clad
in grey stone. Sizes that the pictures cannot give are the usual ones.
"""
import os
ROOT = globals().get( 'REPO' ) or os.path.dirname( os.path.dirname( os.path.dirname( os.path.dirname( os.path.abspath( __file__ ) ) ) ) )
for f in ( 'shells.py', 'grounds.py', 'house.py' ): exec( compile( open( os.path.join( ROOT, 'tools', 'blender', f ), encoding='utf-8' ).read(), f, 'exec' ) )
OUT = os.path.join( ROOT, 'public', 'models', 'slavonia', 'houses', 'posta.glb' )

L, D = 8.3, 11.9                  # along the street, and deep (the footprint)
X0, X1, Y0, Y1 = - L / 2, L / 2, - D / 2, D / 2
EAVE = 3.4                        # the eaves over the floor: one storey, the door's head two thirds of the way up
MID = Y0 + 6.0                   # where the front roof ends and the back one begins
TWO = dict( w=1.4, h=1.5, sill=0.95, panes=[ 2, 1 ], kind='window' )
ROOF = dict( form='hip', pitch=22, over=0.5, cover='tile', fascia=( 'fascia', 0.22 ), soffit='soffit' )

SPEC = dict(
	name='Posta',
	materials={
		'wall': ( ( 222, 184, 104 ), 0.92, 0.0 ),       # the municipality's yellow: one render on both
		'plinth': ( ( 150, 148, 142 ), 0.94, 0.0 ),
		'frame': ( ( 74, 78, 62 ), 0.50, 0.0 ),         # the windows' frames: dark olive (Street View)
		'door': ( ( 96, 66, 44 ), 0.60, 0.0 ),          # the post's door: brown aluminium round the glass
		'glass': ( ( 40, 48, 58 ), 0.10, 0.0 ),
		'box': ( ( 236, 236, 232 ), 0.55, 0.0 ),
		'shutter': ( ( 214, 214, 208 ), 0.60, 0.0 ),
		'slat': ( ( 180, 180, 176 ), 0.60, 0.0 ),
		'sill': ( ( 200, 200, 196 ), 0.70, 0.2 ),
		'tile': ( ( 96, 88, 82 ), 0.85, 0.0 ),          # grey-brown tiles (Street View)
		'fascia': ( ( 72, 52, 40 ), 0.70, 0.0 ),
		'soffit': ( ( 210, 200, 186 ), 0.90, 0.0 ),
		'stone': ( ( 150, 150, 146 ), 0.90, 0.0 ),      # the pillar's cladding
		'brick': ( ( 150, 84, 60 ), 0.90, 0.0 ),
		'postbox': ( ( 232, 190, 40 ), 0.50, 0.1 ),     # Hrvatska pošta's yellow
		'sign': ( ( 32, 32, 34 ), 0.60, 0.1 ),
	},
	parts=dict( frame='frame', glass='glass', box='box', shutter='shutter', slat='slat', sill='sill' ),
	# ( the front half under a roof that runs along the street, hipped at its ends, the back half under
	# its own: from the street one sees the long slope and the hip at the north end )
	blocks=[ dict( x=[ X0, X1 ], y=[ Y0, MID ], eave=EAVE, plinth=( 0.3, 'plinth' ), wall='wall', roof=ROOF ),
		dict( x=[ X0, X1 ], y=[ MID, Y1 ], eave=EAVE, plinth=( 0.3, 'plinth' ), wall='wall', roof=ROOF ) ],
	openings=[
		dict( block=0, side='front', at=1.5, **TWO ),
		dict( block=0, side='front', at=3.5, **TWO ),
		dict( block=0, side='right', at=1.3, sill=0, w=1.2, h=2.35, kind='door', leaves=1, leaf='glass', transom=0.35 ),
	],
	units=[
		dict( block=0, side='front', at=6.6, z=1.35, size=[ 0.45, 0.75, 0.04 ], mat='sign' ),
		dict( block=0, side='front', at=7.3, z=0.85, size=[ 0.36, 0.42, 0.22 ], mat='postbox' ),
	],
	chimneys=[ dict( x=X0 + 2.2, y=Y1 - 2.0, top=EAVE + 2.2, side=0.5, mat='brick' ) ],
)
# ( the door's frame is the post's brown, not the windows' olive )
SPEC[ 'door_parts' ] = dict( SPEC[ 'parts' ], frame='door' )

result = build( SPEC, OUT )
print( 'posta:', result, '->', OUT )
