"""Ivan's house on Kolodvorska ulica, Andrijaševci (footprint 642): two storeys of bare red brick under
a hipped roof of brown-grey tiles, its gable-less front to the street at -y.

Run inside Blender as the other house scripts (tools/blender/houses/opcina.py). Writes
public/models/slavonia/houses/kolodvorska642.glb.

What it rests on: Ivan's TerraFrame photos of 2026-10-03 (the archive's survey kolodvorsk-boso, shots
1-11 of 14:06-14:20: the front across the road and from the verge, both front corners, the yard, the
pavement, a close-up of the lower window), each with its GPS position, compass heading and tilt, and
the state orthophoto for the depth. The map's outline is not the house (Ivan): the plan here replaces it.

  front     7.9 m wide. Measured in shot 4 from the wall's foot (its distance from how far below the
            horizon it lies) and checked three ways, which agree within a few per cent: the parked
            Mercedes C (1.77 m wide) in shot 1, the ground-floor room behind the lower window (4.0 m
            inside, Ivan: the room's part of the front comes to 4.4 m with its walls), and the GPS
            distance between shots 1 and 4. It faces 222 degrees, parallel to the street.
  depth     9.6 m: the roof's outline on the orthophoto (about 10.6 m) less the eaves' overhang.
  heights   the eaves at 6.2 m over the pavement (shots 1 and 4), the ground floor's slab at 3.2 m
            (the concrete band across the front); the roof rises about 2.9 m to its ridge, a pitch
            of about 32 degrees (shot 1).
  front     not flat (Ivan): the left part, 4.4 m, carries a window below (1.8 x 1.2 m) and above
            (1.75 x 1.3 m) in one column, under white roller shutters; the right part, the garage
            bay, stands one brick (12 cm) back inside a concrete frame: the brown garage door (2.95 x
            2.85 m, a band of glazing at its head) below, a window (1.65 x 1.25 m) above. Openings
            read off shot 1, square on from across the road, as shares of the front's width.
  sides     one small bathroom window each (Ivan): upstairs on the south-east (right) side, on the
            ground floor on the north-west (left) side.
  back      one window upstairs with an air conditioner's unit beside it (shot 2); behind the
            garage no room but the open drive through to the yard (the "anfor", Ivan).
  yard      its walls on the street line: south-east of the house 5.9 m of white render, up to the next house's wall,, the yard's
            brown sheet gate and a gate of boards in it (house shots 2-4, vicinity 2-5); north-west,
            the grey metal gate to the passage beside the neighbour (house shots 4, 8).
  later     the mailbox and the doorbell on the gate-side pier: the detail pass.
  colours   read off the sunlit photos and brought down to the surfaces' own: the brick, the tiles,
            the beige plinth, the brown garage door; the gutters galvanised.

Where it stands: the model's origin is the middle of the map's footprint rectangle (Landmarks.js); the
house's own middle lies 1.3 m along the front (shot 4's GPS) and 3.6 m toward the street from it: its
wall on the pavement's back edge, 10.7 m from the road's middle, as all the houses of the street stand
(Ivan; the orthophoto's eaves at 11 m) (the critic: a strip
of grass between them in the game that the photos do not have; placing it by the GPS distance alone
had it 1.3 m too far back). Sizes the photos cannot give (the windows' frames, the sills) are the
usual ones; ten centimetres either way are within what was asked (Ivan: plan from the orthophoto,
photos for the detail, big deviations fixed later).
"""
import os
ROOT = globals().get( 'REPO' ) or os.path.dirname( os.path.dirname( os.path.dirname( os.path.dirname( os.path.abspath( __file__ ) ) ) ) )
for f in ( 'shells.py', 'grounds.py', 'house.py' ): exec( compile( open( os.path.join( ROOT, 'tools', 'blender', f ), encoding='utf-8' ).read(), f, 'exec' ) )
OUT = os.path.join( ROOT, 'public', 'models', 'slavonia', 'houses', 'kolodvorska642.glb' )

W, D = 7.9, 9.6                        # along the street, and deep
CX, CY = 1.3, - 3.6                    # the house's middle in the footprint's frame
X0, X1, Y0, Y1 = CX - W / 2, CX + W / 2, CY - D / 2, CY + D / 2
EAVE = 6.3                             # the walls to the eaves (shots 1 and 4)
SLAB = 3.2                             # the upper floor's slab: the concrete band across the front
SPLIT = 4.4                            # the left (room's) part of the front, from its left corner
POST = 0.34                            # the garage bay's concrete post at the right corner
BAY = 0.12                             # how far the garage bay stands back: one brick (Ivan)
YARD = 5.9                             # the yard's street wall, from the house's corner to the next house's (722's) wall
UPPER = SLAB + 1.0                     # the upper windows' sills
SHUT = dict( panes=[ 2, 1 ], kind='window', box=0.18 )
ROOF = dict( form='hip', pitch=32, over=0.5, cover='tile', fascia=( 'gutter', 0.16 ), soffit='soffit' )

SPEC = dict(
	name='Kolodvorska 642',
	materials={
		'brick': ( ( 165, 98, 66 ), 0.90, 0.0 ),         # the bare brick (shot 4, sunlit 211 137 92)
		'plinth': ( ( 170, 152, 112 ), 0.94, 0.0 ),      # the beige rendered plinth
		'stone': ( ( 150, 136, 104 ), 0.92, 0.0 ),       # the concrete frame and bands, unrendered
		'tile': ( ( 128, 92, 74 ), 0.85, 0.0 ),          # weathered terracotta, by eye (shot 1 is hazy: it read grey)
		'gutter': ( ( 160, 164, 166 ), 0.45, 0.6 ),      # galvanised
		'soffit': ( ( 120, 110, 100 ), 0.90, 0.0 ),
		'frame': ( ( 236, 236, 232 ), 0.50, 0.0 ),       # white PVC
		'glass': ( ( 40, 48, 58 ), 0.10, 0.0 ),
		'box': ( ( 230, 230, 226 ), 0.55, 0.0 ),
		'shutter': ( ( 194, 196, 190 ), 0.60, 0.0 ),     # the roller shutters (shot 4, sunlit 204 207 199)
		'slat': ( ( 170, 172, 166 ), 0.60, 0.0 ),
		'sill': ( ( 180, 176, 168 ), 0.70, 0.0 ),
		'door': ( ( 110, 82, 66 ), 0.60, 0.1 ),          # the brown garage door (shot 4, sunlit 130 99 81)
		'unit': ( ( 226, 226, 222 ), 0.50, 0.1 ),
		'shade': ( ( 34, 32, 30 ), 0.95, 0.0 ),          # the drive-through's dark, seen from the yard
		'render': ( ( 232, 230, 222 ), 0.92, 0.0 ),      # the yard wall's white render
		'gate': ( ( 120, 72, 48 ), 0.60, 0.3 ),          # the brown sheet gate
		'boards': ( ( 128, 100, 74 ), 0.85, 0.0 ),       # the gate of boards
		'steel': ( ( 112, 118, 120 ), 0.50, 0.5 ),       # the grey metal gate
	},
	parts=dict( frame='frame', glass='glass', box='box', shutter='shutter', slat='slat', sill='sill' ),
	blocks=[ dict( x=[ X0, X1 ], y=[ Y0, Y1 ], eave=EAVE, plinth=( 0.35, 'plinth' ), wall='brick', roof=ROOF,
		recesses=[ dict( side='front', **{ 'from': SPLIT }, to=W - POST, depth=BAY ) ] ) ],
	openings=[
		# the front: the room's window below and above, in one column; the garage bay's window and door
		dict( block=0, side='front', at=1.95, sill=1.45, w=1.8, h=1.2, shutter=1.0, **SHUT ),
		dict( block=0, side='front', at=2.1, sill=4.35, w=1.75, h=1.3, shutter=0.6, **SHUT ),
		dict( block=0, side='front', at=6.1, sill=4.3, w=1.65, h=1.25, shutter=0.9, **SHUT ),
		dict( block=0, side='front', at=6.1, sill=0, w=2.95, h=2.85, kind='door', leaves=2, leaf='door', transom=0.55 ),
		# the bathrooms' small windows: upstairs on the right side, on the ground floor on the left
		dict( block=0, side='right', at=D / 2, sill=UPPER + 0.5, w=0.6, h=0.6, shutter=0.0, panes=[ 1, 1 ], kind='window' ),
		dict( block=0, side='left', at=D / 2, sill=1.6, w=0.6, h=0.6, shutter=0.0, panes=[ 1, 1 ], kind='window' ),
		# the back: a window upstairs; behind the garage the drive through, open to the yard
		dict( block=0, side='back', at=2.6, sill=UPPER, w=1.4, h=1.3, shutter=0.3, **SHUT ),
		dict( block=0, side='back', at=W - 6.1, sill=0, w=2.95, h=2.7, kind='door', leaves=1, leaf='shade' ),
	],
	units=[
		# the concrete band of the slab across the left part, the air conditioner at the back
		dict( block=0, side='front', at=SPLIT / 2, z=SLAB, size=[ SPLIT, 0.22, 0.03 ], mat='stone' ),
		dict( block=0, side='back', at=4.2, z=UPPER + 0.4, size=[ 0.8, 0.55, 0.3 ], mat='unit' ),
	],
	# the garage bay's concrete post at the right corner
	strips=[ dict( block=0, side='front', at=W - POST / 2, w=POST, mat='stone', out=0.02 ) ],
	# the yard's walls on the street line, a little behind the house's front
	walls=[ dict( points=[ ( X1, Y0 + 0.15 ), ( X1 + YARD, Y0 + 0.15 ) ], height=2.1, thick=0.25, mat='render', cap='plinth',
			gates=[ dict( at=1.9, w=3.1, h=2.0, mat='gate' ), dict( at=4.6, w=2.0, h=1.9, mat='boards' ) ] ),
		dict( points=[ ( X0 - 2.9, Y0 + 0.15 ), ( X0, Y0 + 0.15 ) ], height=1.9, thick=0.25, mat='render', cap='plinth',
			gates=[ dict( at=1.45, w=2.6, h=1.8, mat='steel' ) ] ) ],
	# the ground it stands on: the house and the strip of yard behind those walls
	yard=[ ( X0 - 2.9, Y0 ), ( X1 + YARD, Y0 ), ( X1 + YARD, Y0 + 1.0 ), ( X1, Y0 + 1.0 ), ( X1, Y1 ), ( X0, Y1 ), ( X0, Y0 + 1.0 ), ( X0 - 2.9, Y0 + 1.0 ) ],
	chimneys=[ dict( x=X0 + 4.3, y=Y0 + 3.5, top=EAVE + 3.0, side=0.5, mat='brick' ) ],
)
# ( the doors' frames and leaves are the garage door's brown; a leaf names its part here )
SPEC[ 'door_parts' ] = dict( SPEC[ 'parts' ], frame='door', door='door', shade='shade' )

result = build( SPEC, OUT )
print( 'kolodvorska642:', result, '->', OUT )
