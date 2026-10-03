"""The primary school of Andrijaševci by the park: a school of the Yugoslav years, plain and
functional, as many in the area are.

Run inside Blender as the other house scripts (tools/blender/houses/opcina.py). Writes
public/models/slavonia/houses/school.glb. It stands on footprint 1319, which the map draws as the
whole school; its frame faces Školska ulica at the south-west end, so in this file:

  the main wing    two storeys, 53.3 m long (along y) by 23.2 m, its long face to the park at +x
                   (the face in Ivan's two photographs) and to the road at -x
  the link         one storey under a flat roof at the main wing's north-east end, the entrance
                   court beside it
  the hall         across the north-east end, 31.6 m by 16.3 m, under its own roof

The corners are the footprint's (the survey sheet school agrees with the map here). What the
photographs give the park face: two tall windows to a bay upstairs and down, each of two lights under a top light,
the bays parted by brown strips that run the full height; a band of the wall's cream between the
storeys; the entrance with its glass doors under a flat canopy with a dark fascia, the flags over it
and the ramp up to it; air conditioners' units on the wall. Measured on Ivan's photograph: the wall
178, 172, 142 and the strips 96, 70, 58 against a sky of 245 (an overcast day: the wall is taken at
that hue, as bright as pale render is); the roof as the survey read it. The orthophoto and the
sunset video (its frames over the park) give the roofs: a low gable along the main wing with a
brick chimney on its road side, the hall's own gable, the link's flat roof.

Not seen, and built by the same rule as the park face: the road face and the ends of the main wing,
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
STOREY, EAVE = 3.4, 7.0
BAY = ( WING[ 'y' ][ 1 ] - WING[ 'y' ][ 0 ] ) / 11       # eleven bays along the wing's park face
UNIT = dict( w=1.95, h=2.05, panes=[ 2, 1 ], transom=0.55, kind='window' )   # two to a bay, nearly a storey high
ENTRANCE = 8                                            # the bay of the entrance, counted from the south-west end

def bays( side, skip=() ):
	"""Two windows in every bay of a long face, on both storeys (only upstairs in the bays skipped)."""
	out = []
	for k in range( 11 ):
		for f in ( 0.27, 0.73 ):
			t = ( k + f ) * BAY
			if k not in skip: out.append( dict( block=0, side=side, at=t, sill=0.75, **UNIT ) )
			out.append( dict( block=0, side=side, at=t, sill=STOREY + 0.75, **UNIT ) )
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
	},
	parts=dict( frame='frame', glass='glass', box='box', shutter='shutter', slat='slat', sill='sill' ),
	blocks=[
		dict( WING, eave=EAVE, plinth=( 0.35, 'plinth' ), wall='wall', roof=dict( form='gable', ridge='y', pitch=12, over=0.7, verge=0.4, cover='sheet', fascia=( 'fascia', 0.3 ), soffit='soffit' ) ),
		dict( LINK, eave=3.8, plinth=( 0.35, 'plinth' ), wall='wall', roof=dict( form='hip', pitch=3, over=0.4, cover='sheet', fascia=( 'fascia', 0.4 ), soffit='soffit' ) ),
		dict( LOBBY, eave=3.8, plinth=( 0.35, 'plinth' ), wall='wall', roof=dict( form='hip', pitch=3, over=0.4, cover='sheet', fascia=( 'fascia', 0.4 ), soffit='soffit' ) ),
		dict( HALL, eave=7.6, plinth=( 0.35, 'plinth' ), wall='wall', roof=dict( form='gable', ridge='x', pitch=15, over=0.6, verge=0.3, cover='sheet', fascia=( 'fascia', 0.3 ), soffit='soffit' ) ),
	],
	openings=(
		# the park face: a group in every bay but the entrance's; the entrance's glass under its canopy
		bays( 'right', skip=( ENTRANCE, ) )
		+ [ dict( block=0, side='right', at=( ENTRANCE + 0.5 ) * BAY, sill=0, w=4.4, h=2.8, kind='door', leaves=4, leaf='glass', transom=0.5 ) ]
		# the road face (not seen: as the park face)
		+ bays( 'left' )
		# the ends: two windows a storey at the south-west end
		+ [ dict( block=0, side='front', at=t, sill=s, w=1.6, h=1.55, panes=[ 2, 1 ], kind='window' ) for t in ( 7.0, 16.2 ) for s in ( 0.9, STOREY + 0.9 ) ]
		# the hall: a band of high windows along each long side (not seen)
		+ [ dict( block=3, side=side, at=t, sill=4.4, w=4.4, h=2.0, panes=[ 4, 1 ], kind='window' ) for side in ( 'front', 'back' ) for t in ( 4.0, 9.8, 15.6, 21.4, 27.2 ) ]
		# the link: its doors on the court
		+ [ dict( block=1, side='right', at=6.0, sill=0, w=2.4, h=2.6, kind='door', leaves=2, leaf='glass', transom=0.4 ) ]
	),
	# ( the entrance's canopy is held from the wall: no posts )
	canopies=[ dict( x=[ WING[ 'x' ][ 1 ], WING[ 'x' ][ 1 ] + 3.0 ], y=[ WING[ 'y' ][ 0 ] + ( ENTRANCE + 0.5 ) * BAY - 3.6, WING[ 'y' ][ 0 ] + ( ENTRANCE + 0.5 ) * BAY + 3.6 ], z=3.1, thick=0.4, mat='soffit', fascia='fascia' ) ],
	units=[ dict( block=0, side='right', at=( ENTRANCE - 1 ) * BAY + 0.4, z=STOREY + 1.2, size=[ 0.8, 0.55, 0.3 ], mat='unit' ),
		dict( block=0, side='right', at=( ENTRANCE - 1 ) * BAY + 0.4, z=1.6, size=[ 0.8, 0.55, 0.3 ], mat='unit' ),
		dict( block=0, side='right', at=( ENTRANCE + 2 ) * BAY - 0.4, z=STOREY + 1.2, size=[ 0.8, 0.55, 0.3 ], mat='unit' ) ],
	# the brown strips between the bays, full height, as thin boxes on the park face
	strips=[ dict( block=0, side='right', at=k * BAY, w=0.3, mat='strip' ) for k in range( 1, 11 ) ],
	chimneys=[ dict( x=- 14.3, y=- 0.7, top=12.5, side=1.2, mat='brick' ) ],
	# ( the map's ring has the hall's west end 2.3 m short of its east end's line: the orthophoto shows one
	# rectangle, and the hall is taken whole )
	outline=[ ( - 17.07, - 39.85 ), ( 6.15, - 39.85 ), ( 6.15, 16.3 ), ( 0.5, 16.3 ), ( 0.5, 23.5 ), ( 17.13, 23.5 ), ( 17.13, 39.85 ), ( - 14.44, 39.85 ), ( - 14.44, 23.5 ), ( - 8.37, 23.5 ), ( - 8.37, 13.45 ), ( - 17.07, 13.45 ) ],
	# the ground it stands on: the building, the strip before the park face under the canopy, and the
	# entrance court between the wing, the link and the hall
	yard=[ ( - 17.07, - 39.85 ), ( 9.35, - 39.85 ), ( 9.35, 16.3 ), ( 17.13, 16.3 ), ( 17.13, 39.85 ), ( - 14.44, 39.85 ), ( - 14.44, 23.5 ), ( - 8.37, 23.5 ), ( - 8.37, 13.45 ), ( - 17.07, 13.45 ) ],
)

result = build( SPEC, OUT )
print( 'school:', result, '->', OUT )
