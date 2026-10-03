"""The corner shop at the end of Kolodvorska ulica, by the junction with Ulica Matije Gupca (footprint
723): one storey of white render over a plinth of grey granite tiles, an L of two wings under brown
hipped roofs; its door, double and glazed under the old sign 'ČOP', at the corner to the junction,
up two steps of brown tile; tall shop windows along Ulica Matije Gupca, small ones on Kolodvorska.

Run inside Blender as the other house scripts. Writes public/models/slavonia/houses/shop-kolodvorska.glb.

What it rests on: Ivan's TerraFrame photos of 2026-10-03 (survey kolodvorsk-boso, vicinity 8-12 and
16) and the orthophoto. The plan is the footprint's two rectangles, which the roofs agree with, set on the pavements of both
streets as the photos have its walls (vicinity 9, 11, 16): the corner block, 10.9 m along Kolodvorska
and 12.1 m deep along Ulica Matije Gupca (its right side), and
the wing to its north-west along Kolodvorska, 12.5 x 5.4 m, up to the long white building's (722's) wall.
The corner to the junction is cut at 45 degrees (Ivan), 2.4 m across, and the door stands indented
0.4 m into the cut, up its two steps. The sign's lettering and the granite's grain are not modelled.
"""
import os
ROOT = globals().get( 'REPO' ) or os.path.dirname( os.path.dirname( os.path.dirname( os.path.dirname( os.path.abspath( __file__ ) ) ) ) )
for f in ( 'shells.py', 'grounds.py', 'house.py' ): exec( compile( open( os.path.join( ROOT, 'tools', 'blender', f ), encoding='utf-8' ).read(), f, 'exec' ) )
OUT = os.path.join( ROOT, 'public', 'models', 'slavonia', 'houses', 'shop-kolodvorska.glb' )

EAVE = 3.8                                   # one tall storey (a shop's)
# Its walls stand on the pavements of both streets (the photos; the map's outline lies 3.9 m back from
# Kolodvorska and 2.8 m from Ulica Matije Gupca): the footprint's rectangles moved that far
DX, DY = 2.8, - 3.9
CORNER = dict( x=[ - 0.43 + DX, 10.51 + DX ], y=[ - 6.06 + DY, 6.04 + DY ] )
WING = dict( x=[ - 9.8, - 0.43 + DX ], y=[ - 6.06 + DY, - 0.7 + DY ] )   # ( its end against 722's wall )
CUT = 1.7                                    # the corner's cut along each wall: 2.4 m across (vicinity 9-11)
ROOF = dict( form='hip', pitch=30, over=0.5, cover='tile', fascia=( 'fascia', 0.2 ), soffit='soffit' )
SHOP = dict( kind='window', panes=[ 1, 1 ], shutter=0.0 )
SMALL = dict( kind='window', panes=[ 2, 1 ], shutter=0.0 )

SPEC = dict(
	name='Shop Kolodvorska',
	materials={
		'wall': ( ( 234, 232, 226 ), 0.92, 0.0 ),      # white render (vicinity 9, 10)
		'plinth': ( ( 108, 108, 106 ), 0.80, 0.0 ),    # grey granite tiles
		'tile': ( ( 118, 84, 66 ), 0.85, 0.0 ),        # brown tiles (vicinity 11, 12)
		'fascia': ( ( 150, 96, 70 ), 0.70, 0.0 ),      # the copper-brown gutters
		'soffit': ( ( 220, 214, 204 ), 0.90, 0.0 ),
		'frame': ( ( 96, 60, 46 ), 0.55, 0.0 ),        # the brown frames of the door and the windows
		'glass': ( ( 40, 46, 54 ), 0.10, 0.0 ),
		'box': ( ( 234, 232, 226 ), 0.90, 0.0 ), 'shutter': ( ( 210, 210, 204 ), 0.60, 0.0 ),
		'slat': ( ( 180, 180, 176 ), 0.60, 0.0 ), 'sill': ( ( 200, 198, 192 ), 0.70, 0.0 ),
		'step': ( ( 132, 58, 44 ), 0.70, 0.0 ),        # the brown-red tiled steps
		'sign': ( ( 40, 54, 70 ), 0.50, 0.0 ),         # the sign's dark blue panel
		'unit': ( ( 226, 226, 222 ), 0.50, 0.1 ),
	},
	parts=dict( frame='frame', glass='glass', box='box', shutter='shutter', slat='slat', sill='sill' ),
	blocks=[ dict( **CORNER, eave=EAVE, plinth=( 1.0, 'plinth' ), wall='wall', roof=ROOF, chamfer=dict( size=CUT, indent=0.4 ) ),
		dict( **WING, eave=EAVE, plinth=( 1.0, 'plinth' ), wall='wall', roof=ROOF ) ],
	openings=[
		# the door at the corner, up its steps; the tall shop windows along Ulica Matije Gupca
		dict( block=0, side='corner', at=CUT * 2 ** 0.5 / 2, sill=0.35, w=1.5, h=2.6, kind='door', leaves=2, leaf='glass', transom=0.5 ),
		dict( block=0, side='right', at=3.6, sill=0.9, w=1.1, h=2.0, **SHOP ),
		dict( block=0, side='right', at=5.4, sill=0.9, w=1.1, h=2.0, **SHOP ),
		dict( block=0, side='right', at=7.4, sill=0.9, w=1.1, h=2.0, **SHOP ),
		# on Kolodvorska: two small windows on the corner block, two on the wing (vicinity 8)
		dict( block=0, side='front', at=4.0, sill=1.3, w=1.0, h=1.2, **SMALL ),
		dict( block=0, side='front', at=8.0, sill=1.3, w=1.0, h=1.2, **SMALL ),
		dict( block=1, side='front', at=3.0, sill=1.3, w=1.0, h=1.2, **SMALL ),
		dict( block=1, side='front', at=7.0, sill=1.3, w=1.0, h=1.2, **SMALL ),
	],
	# the plan: the L of the two wings (the corner of the yard behind the wing is not the shop's), and
	# the ground it stands on with the steps before the door
	outline=[ ( WING[ 'x' ][ 0 ], WING[ 'y' ][ 0 ] ), ( CORNER[ 'x' ][ 1 ] - CUT, CORNER[ 'y' ][ 0 ] ), ( CORNER[ 'x' ][ 1 ], CORNER[ 'y' ][ 0 ] + CUT ), ( CORNER[ 'x' ][ 1 ], CORNER[ 'y' ][ 1 ] ),
		( CORNER[ 'x' ][ 0 ], CORNER[ 'y' ][ 1 ] ), ( CORNER[ 'x' ][ 0 ], WING[ 'y' ][ 1 ] ), ( WING[ 'x' ][ 0 ], WING[ 'y' ][ 1 ] ) ],
	yard=[ ( WING[ 'x' ][ 0 ], WING[ 'y' ][ 0 ] ), ( CORNER[ 'x' ][ 1 ] - CUT - 0.3, CORNER[ 'y' ][ 0 ] ), ( CORNER[ 'x' ][ 1 ] - CUT + 0.2, CORNER[ 'y' ][ 0 ] - 0.5 ),
		( CORNER[ 'x' ][ 1 ] + 0.5, CORNER[ 'y' ][ 0 ] + CUT - 0.2 ), ( CORNER[ 'x' ][ 1 ], CORNER[ 'y' ][ 0 ] + CUT + 0.3 ), ( CORNER[ 'x' ][ 1 ], CORNER[ 'y' ][ 1 ] ),
		( CORNER[ 'x' ][ 0 ], CORNER[ 'y' ][ 1 ] ), ( CORNER[ 'x' ][ 0 ], WING[ 'y' ][ 1 ] ), ( WING[ 'x' ][ 0 ], WING[ 'y' ][ 1 ] ) ],
	units=[
		# the steps before the door, the sign over it, the air conditioner on Kolodvorska (vicinity 8)
		dict( block=0, side='corner', at=CUT * 2 ** 0.5 / 2, z=0.0, size=[ 2.2, 0.17, 0.6 ], mat='step' ),
		dict( block=0, side='corner', at=CUT * 2 ** 0.5 / 2, z=0.17, size=[ 2.0, 0.17, 0.3 ], mat='step' ),
		dict( block=0, side='corner', at=CUT * 2 ** 0.5 / 2, z=3.05, size=[ 1.7, 0.45, 0.04 ], mat='sign' ),
		dict( block=1, side='front', at=4.6, z=2.4, size=[ 0.8, 0.55, 0.3 ], mat='unit' ),
	],
)

result = build( SPEC, OUT )
print( 'shop:', result, '->', OUT )
