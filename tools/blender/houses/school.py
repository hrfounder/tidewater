"""The primary school of Andrijaševci by the park: a school of the Yugoslav years, plain and
functional, as many in the area are.

Run inside Blender as the other house scripts (tools/blender/houses/opcina.py). Writes
public/models/slavonia/houses/school.glb. It stands on footprint 1319, which the map draws as the
whole school; its frame faces Školska ulica at the south-west end, so in this file:

  the main wing    two storeys, 53.3 m long (along y) by 23.2 m, its long front to the road at -x
                   (the face in Ivan's two photographs, with the entrance) and its back to the park
                   at +x
  the link         one storey under a flat roof at the main wing's north-east end, the entrance
                   court beside it
  the hall         across the north-east end, 31.6 m by 16.3 m, under its own roof

The corners are the footprint's (the survey sheet school agrees with the map here). The entrance is
on the front, toward Školska ulica and its parking: Ivan's correction, and the orthophoto's paved
forecourt there, 40 m from the north-east end. What the photographs give the front: three tall windows to a bay upstairs and down, each of three lights, the outer two with a small pane at the top and the middle one with it at the bottom (Ivan),
the bays parted by brown strips that run the full height; a band of the wall's cream between the
storeys; the entrance with its glass doors under a flat canopy with a dark fascia, the flags over it
and the ramp up to it; air conditioners' units on the wall. Measured on Ivan's photograph: the wall
178, 172, 142 and the strips 96, 70, 58 against a sky of 245 (an overcast day: the wall is taken at
that hue, as bright as pale render is); the roof as the survey read it. The orthophoto and the
sunset video (its frames over the park) give the roofs: a low gable along the main wing with a
brick chimney on its road side, the hall's own gable, the link's flat roof.

Not seen, and built by the same rule as the front: the park face and the ends of the main wing,
and the hall's walls (a band of high windows, as a school's hall has). Ivan can send Street View.
"""
import os
ROOT = globals().get( 'REPO' ) or os.path.dirname( os.path.dirname( os.path.dirname( os.path.dirname( os.path.abspath( __file__ ) ) ) ) )
for f in ( 'shells.py', 'grounds.py', 'house.py' ): exec( compile( open( os.path.join( ROOT, 'tools', 'blender', f ), encoding='utf-8' ).read(), f, 'exec' ) )
OUT = os.path.join( ROOT, 'public', 'models', 'slavonia', 'houses', 'school.glb' )

# the footprint's corners in this frame (model x, y)
WING = dict( x=[ - 17.07, 6.15 ], y=[ - 39.85, 13.45 ] )
LINK = dict( x=[ - 8.37, 0.5 ], y=[ 13.45, 25.8 ] )
LOBBY = dict( x=[ 0.5, 6.15 ], y=[ 13.45, 16.3 ] )
HALL = dict( x=[ - 14.44, 17.13 ], y=[ 23.5, 39.85 ] )
# The front, read off Ivan's two photographs by proportion (the near one: the eaves 7.2 m over the
# ground take 550 px, so 78 px a metre): six sections between the brown downpipes, three window units
# to a section with a narrow cream pier between them; a unit 2.6 m wide and 2.4 m tall, its head half
# a metre under the eaves upstairs; storeys of 3.7 m and a cream band of 1.3 m between the floors,
# where the air conditioners' units hang, stacked, on the piers.
STOREY, EAVE = 3.7, 7.2
SECTIONS = 6
WING_LEN = WING[ 'y' ][ 1 ] - WING[ 'y' ][ 0 ]
BAY = WING_LEN / SECTIONS
LOW_SILL = 0.6                                              # the ground floor's sills; upstairs, a storey higher
RAILING = dict( base=None, top=1.0, picket=( 0.025, 0.12 ), tall=None, ends=0.0 )   # white steel, a metre high (photograph)
# a unit of three lights: the two outer ones with their small pane at the top, the middle one with it
# at the bottom (Ivan; his photograph, enlarged)
UNIT = dict( w=2.6, h=2.4, lights=[ 'top', 'bottom', 'top' ], transom=0.55, kind='window' )
PIER = BAY / 3 - UNIT[ 'w' ]                            # between two units
# The entrance is the third section from the street (Školska ulica, at the south-west end, -y; Ivan).
# Along the front (its wall runs from the north-east end, t = 0, to the street end) its section is:
ENTRANCE = SECTIONS - 3
AT = ( ENTRANCE + 0.5 ) * BAY                           # the entrance's middle along the front
Y_AT = WING[ 'y' ][ 1 ] - AT                            # ... and its y

def bays( side, skip=() ):
	"""Three units in every section of a long face, on both storeys (only upstairs in those skipped)."""
	out = []
	for k in range( SECTIONS ):
		for f in ( 1 / 6, 3 / 6, 5 / 6 ):
			t = ( k + f ) * BAY
			if k not in skip: out.append( dict( block=0, side=side, at=t, sill=LOW_SILL, **UNIT ) )
			out.append( dict( block=0, side=side, at=t, sill=STOREY + LOW_SILL, **UNIT ) )
	return out

SPEC = dict(
	name='School',
	materials={
		'wall': ( ( 232, 224, 186 ), 0.92, 0.0 ),       # pale cream (the hue measured, see above)
		'strip': ( ( 120, 88, 72 ), 0.90, 0.0 ),        # the brown strips between the bays
		'plinth': ( ( 150, 148, 142 ), 0.94, 0.0 ),
		'frame': ( ( 236, 236, 232 ), 0.50, 0.0 ),
		'glass': ( ( 112, 120, 122 ), 0.10, 0.0 ),     # the panes read 138..152 grey on the photograph: sky and curtains in them
		'box': ( ( 236, 236, 232 ), 0.55, 0.0 ),
		'shutter': ( ( 214, 214, 208 ), 0.60, 0.0 ),
		'slat': ( ( 180, 180, 176 ), 0.60, 0.0 ),
		'sill': ( ( 200, 200, 196 ), 0.70, 0.2 ),
		'sheet': ( ( 120, 64, 60 ), 0.60, 0.3 ),        # the roofs' sheet (survey 90, 70, 67; the sunset video's red-brown)
		'fascia': ( ( 70, 56, 50 ), 0.70, 0.0 ),        # the canopy's and the eaves' dark boards (measured 60, 50, 46)
		'soffit': ( ( 220, 214, 196 ), 0.90, 0.0 ),
		'brick': ( ( 150, 84, 60 ), 0.90, 0.0 ),
		'unit': ( ( 226, 226, 222 ), 0.60, 0.1 ),
		'steel': ( ( 170, 172, 174 ), 0.40, 0.8 ),
		'iron': ( ( 236, 236, 232 ), 0.45, 0.4 ),       # the front lawn's railing: white steel (photograph)
		'paving': ( ( 176, 174, 166 ), 0.92, 0.0 ),     # concrete, light on the orthophoto
	},
	parts=dict( frame='frame', glass='glass', box='box', shutter='shutter', slat='slat', sill='sill' ),
	blocks=[
		dict( WING, eave=EAVE, plinth=( 0.35, 'plinth' ), wall='wall', roof=dict( form='gable', ridge='y', pitch=12, over=0.7, verge=0.4, cover='sheet', fascia=( 'fascia', 0.3 ), soffit='soffit' ) ),
		dict( LINK, eave=3.8, plinth=( 0.35, 'plinth' ), wall='wall', roof=dict( form='hip', pitch=3, over=0.4, cover='sheet', fascia=( 'fascia', 0.4 ), soffit='soffit' ) ),
		dict( LOBBY, eave=3.8, plinth=( 0.35, 'plinth' ), wall='wall', roof=dict( form='hip', pitch=3, over=0.4, cover='sheet', fascia=( 'fascia', 0.4 ), soffit='soffit' ) ),
		dict( HALL, eave=7.6, plinth=( 0.35, 'plinth' ), wall='wall', roof=dict( form='gable', ridge='x', pitch=15, over=0.6, verge=0.3, cover='sheet', fascia=( 'fascia', 0.3 ), soffit='soffit' ) ),
	],
	openings=(
		# the front, to the road: three units in every section but the entrance's ground floor, where a
		# glass screen stands under the canopy: the doors in the middle, fixed glass each side
		bays( 'left', skip=( ENTRANCE, ) )
		+ [ dict( block=0, side='left', at=AT, sill=0, w=2.6, h=3.0, kind='door', leaves=2, leaf='glass', transom=0.55 ) ]
		+ [ dict( block=0, side='left', at=AT + d * BAY / 3, sill=0.3, w=2.6, h=2.7, panes=[ 2, 1 ], transom=0.55, kind='window' ) for d in ( - 1, 1 ) ]
		# the park face (not seen: as the front)
		+ bays( 'right' )
		# the ends: two windows a storey at the south-west end
		+ [ dict( block=0, side='front', at=t, sill=s, w=1.6, h=1.55, panes=[ 2, 1 ], kind='window' ) for t in ( 7.0, 16.2 ) for s in ( 0.9, STOREY + 0.9 ) ]
		# the hall: a band of high windows along each long side (not seen)
		+ [ dict( block=3, side=side, at=t, sill=4.4, w=4.4, h=2.0, panes=[ 4, 1 ], kind='window' ) for side in ( 'front', 'back' ) for t in ( 4.0, 9.8, 15.6, 21.4, 27.2 ) ]
		# the link: its doors on the court
		+ [ dict( block=1, side='right', at=6.0, sill=0, w=2.4, h=2.6, kind='door', leaves=2, leaf='glass', transom=0.4 ) ]
	),
	# ( the entrance's canopy is held from the wall: no posts )
	canopies=[ dict( x=[ WING[ 'x' ][ 0 ] - 3.0, WING[ 'x' ][ 0 ] ], y=[ Y_AT - BAY / 2, Y_AT + BAY / 2 ], z=LOW_SILL + 2.4 + 0.15, thick=0.4, mat='soffit', fascia='fascia' ) ],
	# the air conditioners' units: stacked in the band between the floors, on a pier, clear of the windows
	# (two by the entrance, as in the near photograph; one more in each of the next sections)
	# ( the entrance's own section has its canopy in the band: its unit is upstairs, on the pier beside the
	# flags; the pair stacked in the band is in the section to its north-east, the ramp's side )
	units=[ dict( block=0, side='left', at=( k + f ) * BAY, z=z, size=[ 0.8, 0.55, 0.3 ], mat='unit' )
		for k, f, zs in ( ( ENTRANCE - 1, 2 / 3, ( LOW_SILL + 2.5, LOW_SILL + 3.1 ) ), ( ENTRANCE, 1 / 3, ( STOREY + LOW_SILL + 1.4, ) ),
			( ENTRANCE - 2, 1 / 3, ( LOW_SILL + 2.8, ) ), ( ENTRANCE - 3, 2 / 3, ( LOW_SILL + 2.8, ) ), ( ENTRANCE + 1, 1 / 3, ( LOW_SILL + 2.8, ) ) ) for z in zs ]
	# the band between the floors: a ledge under the upper sills and one over the lower heads, the whole front
	+ [ dict( block=0, side='left', at=WING_LEN / 2, z=z, size=[ WING_LEN, 0.06, 0.05 ], mat='sill' ) for z in ( LOW_SILL + 2.4 + 0.2, STOREY + LOW_SILL - 0.3 ) ],
	# the brown downpipes between the sections, the full height
	strips=[ dict( block=0, side='left', at=k * BAY, w=0.15, out=0.08, mat='strip' ) for k in range( 1, SECTIONS ) ],
	chimneys=[ dict( x=- 14.3, y=- 0.7, top=12.5, side=1.2, mat='brick' ) ],
	# ( the map's ring has the hall's west end 2.3 m short of its east end's line: the orthophoto shows one
	# rectangle, and the hall is taken whole )
	outline=[ ( - 17.07, - 39.85 ), ( 6.15, - 39.85 ), ( 6.15, 16.3 ), ( 0.5, 16.3 ), ( 0.5, 23.5 ), ( 17.13, 23.5 ), ( 17.13, 39.85 ), ( - 14.44, 39.85 ), ( - 14.44, 23.5 ), ( - 8.37, 23.5 ), ( - 8.37, 13.45 ), ( - 17.07, 13.45 ) ],
	# Its grounds, read off the sheet turned to this frame (sheet schoolturn: x across, y up the sheet):
	# the front lawn from the façade to the pavement of Školska ulica, behind a white railing, the
	# concrete forecourt before the entrance and its path out to the pavement; behind, the paved
	# schoolyard by the south-west half of the park face and the walk along the rest of it; the
	# entrance court between the wing, the link and the hall.
	# ( the forecourt: the concrete the orthophoto shows, carried on under the whole canopy )
	paved=[ [ ( - 30.0, - 28.0 ), ( - 17.07, - 28.0 ), ( - 17.07, - 12.8 ), ( - 20.07, - 12.8 ), ( - 20.07, - 15.5 ), ( - 30.0, - 15.5 ) ],
		[ ( - 37.0, - 23.0 ), ( - 30.0, - 23.0 ), ( - 30.0, - 19.0 ), ( - 37.0, - 19.0 ) ],
		# ( the schoolyard's trees stand at its south-west edge, on the lawn: the paving stops short of them )
		[ ( 6.15, - 34.0 ), ( 18.0, - 34.0 ), ( 18.0, - 15.0 ), ( 6.15, - 15.0 ) ],
		[ ( 6.15, - 15.0 ), ( 8.2, - 15.0 ), ( 8.2, 13.45 ), ( 6.15, 13.45 ) ],
		[ ( 0.5, 16.3 ), ( 17.13, 16.3 ), ( 17.13, 23.5 ), ( 0.5, 23.5 ) ] ],
	# ( the railing along the pavement, open where the forecourt's path comes out to it )
	fences=[ dict( points=[ ( - 36.5, 14.0 ), ( - 36.5, - 18.8 ) ], style=RAILING ), dict( points=[ ( - 36.5, - 23.2 ), ( - 36.5, - 40.5 ) ], style=RAILING ) ],
	yard=[ ( - 37.0, - 40.6 ), ( 18.0, - 40.6 ), ( 18.0, - 15.0 ), ( 8.2, - 15.0 ), ( 8.2, 16.3 ), ( 17.13, 16.3 ), ( 17.13, 39.85 ), ( - 14.44, 39.85 ), ( - 14.44, 23.5 ), ( - 8.37, 23.5 ), ( - 8.37, 14.5 ), ( - 37.0, 14.5 ) ],
)

result = build( SPEC, OUT )
print( 'school:', result, '->', OUT )
