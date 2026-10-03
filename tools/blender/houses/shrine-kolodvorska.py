"""The wayside shrine at the junction of Kolodvorska ulica and Ulica Matije Gupca, Andrijaševci: a
slender cream pillar on a pink plinth under a steep two-sided roof of dark sheet, its gables edged in
a red saw-tooth, a cross on the ridge; in its front, behind glass, a pointed niche with a saint.

Run inside Blender as the other house scripts. Writes public/models/slavonia/houses/shrine-kolodvorska.glb.
It stands on the footprint Survey.js ADDED gives it (1.4 x 1.4 m), its niche to the south-east.

What it rests on: Ivan's TerraFrame photos of 2026-10-03, vicinity 13-15 and 18-19 (survey
kolodvorsk-boso). First, rough pass: sizes by eye against the people-sized things beside it (the
bench, the bicycle rack); the saw-tooth trim and the statue are the detail pass's.
"""
import os
ROOT = globals().get( 'REPO' ) or os.path.dirname( os.path.dirname( os.path.dirname( os.path.dirname( os.path.abspath( __file__ ) ) ) ) )
for f in ( 'shells.py', 'grounds.py', 'house.py' ): exec( compile( open( os.path.join( ROOT, 'tools', 'blender', f ), encoding='utf-8' ).read(), f, 'exec' ) )
OUT = os.path.join( ROOT, 'public', 'models', 'slavonia', 'houses', 'shrine-kolodvorska.glb' )

SIDE = 1.6                        # the pillar's square (critic: 1.4 read slight beside the bench)
EAVE = 4.2                        # its walls to the roof's eaves
SPEC = dict(
	name='Shrine Kolodvorska',
	materials={
		'wall': ( ( 236, 226, 200 ), 0.90, 0.0 ),       # cream render
		'plinth': ( ( 214, 160, 150 ), 0.92, 0.0 ),     # the pink plinth
		'sheet': ( ( 52, 58, 60 ), 0.50, 0.5 ),         # the dark roof
		'trim': ( ( 170, 70, 60 ), 0.80, 0.0 ),         # the gables' red edging
		'frame': ( ( 60, 52, 46 ), 0.50, 0.0 ),
		'glass': ( ( 40, 46, 54 ), 0.10, 0.0 ),
		'box': ( ( 236, 226, 200 ), 0.90, 0.0 ), 'shutter': ( ( 236, 226, 200 ), 0.90, 0.0 ),
		'slat': ( ( 236, 226, 200 ), 0.90, 0.0 ), 'sill': ( ( 214, 160, 150 ), 0.92, 0.0 ),
		'iron': ( ( 40, 40, 42 ), 0.60, 0.8 ),
		'paving': ( ( 168, 166, 158 ), 0.90, 0.0 ),
	},
	parts=dict( frame='frame', glass='glass', box='box', shutter='shutter', slat='slat', sill='sill' ),
	blocks=[ dict( x=[ - SIDE / 2, SIDE / 2 ], y=[ - SIDE / 2, SIDE / 2 ], eave=EAVE, plinth=( 0.9, 'plinth' ), wall='wall',
		roof=dict( form='gable', ridge='y', pitch=58, over=0.15, verge=0.15, cover='sheet', fascia=( 'trim', 0.12 ), soffit='trim' ) ) ],
	openings=[ dict( block=0, side='front', at=SIDE / 2, sill=1.6, w=0.7, h=1.9, kind='window', panes=[ 1, 1 ], shutter=0.0 ) ],
	# the concrete slab it stands on (vicinity 13-18)
	paved=[ [ ( - 1.7, - 1.9 ), ( 1.7, - 1.9 ), ( 1.7, 1.5 ), ( - 1.7, 1.5 ) ] ],
	yard=[ ( - 1.7, - 1.9 ), ( 1.7, - 1.9 ), ( 1.7, 1.5 ), ( - 1.7, 1.5 ) ],
	# the cross on the front gable's apex
	chimneys=[ dict( x=0, y=- SIDE / 2, top=EAVE + 0.85 * SIDE / 2 * 1.6 + 0.6, side=0.05, mat='iron' ) ],
)

result = build( SPEC, OUT )
print( 'shrine:', result, '->', OUT )
