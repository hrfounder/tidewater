"""Fetch the cadastre of a core block: every parcel and every building the land registry has drawn.

    python3 tools/geodata/cadastre.py bosut 45.22730,18.74159,4

Source: the INSPIRE download services of the State Geodetic Administration of Croatia (Državna
geodetska uprava), https://api.uredjenazemlja.hr/services/inspire/{cp,bu}/wfs: cadastral parcels
(cp:CadastralParcel) and buildings (bu:Building), in the map grid the tiles use (EPSG:3765). The
services state no fees and no access constraints.

Writes tools/geodata/cache/<area>/cadastre.json (not committed: places.py and survey.py read it):

  parcels    [ { id, label, rings: [ [ [ east, north ], ... ], ... ] } ]   label: the parcel's number
  buildings  [ { id, rings } ]
  (a ring is closed; the first of a feature's rings is its outline, the rest are holes)

The service answers a square at a time and often fails under load (its database runs out of
cursors): the block is asked for in squares of SQUARE metres, each tried up to TRIES times with a
growing wait, and each square's answer is kept in cache/<area>/cadastre/ so that a run that was cut
short carries on where it stopped. A feature that lies across two squares comes twice and is kept once.
"""
import os, sys, json, time, urllib.request
from pyproj import Transformer

HERE = os.path.dirname( os.path.abspath( __file__ ) )
WFS = 'https://api.uredjenazemlja.hr/services/inspire/{kind}/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames={type}&outputFormat=application/json&bbox={box}&count={count}'
LAYERS = { 'parcels': ( 'cp', 'cp:CadastralParcel' ), 'buildings': ( 'bu', 'bu:Building' ) }
SQUARE = 250         # the side of a square asked for at once (m)
COUNT = 5000         # the most features asked of one square: a full answer means the square is too big
TRIES = 12


def ask( kind, typ, box, path ):
    """One square's features, from the cache or the service."""
    if os.path.exists( path ): return json.load( open( path, encoding='utf-8' ) )
    url = WFS.format( kind=kind, type=typ, box=','.join( f'{v:.0f}' for v in box ), count=COUNT )
    for attempt in range( TRIES ):
        try:
            with urllib.request.urlopen( url, timeout=180 ) as r: data = r.read()
            if data[ :1 ] == b'{':
                answer = json.loads( data )
                if len( answer[ 'features' ] ) >= COUNT: sys.exit( f'{typ}: {COUNT} features in one square of {SQUARE} m: make SQUARE smaller' )
                with open( path + '.part', 'wb' ) as f: f.write( data )
                os.replace( path + '.part', path )
                return answer
        except Exception: pass
        time.sleep( min( 60, 3 * ( attempt + 1 ) ) )
    sys.exit( f'{typ}: no answer for the square at {box[ 0 ]:.0f},{box[ 1 ]:.0f} after {TRIES} tries: run again later, what was fetched is kept' )


def rings( feature ):
    """A feature's polygon as rings of [ east, north ]: its own geometry, or the INSPIRE 2D geometry."""
    g = feature.get( 'geometry' ) or ( ( feature[ 'properties' ].get( 'geometry2D' ) or {} ).get( 'geometry' ) ) or feature[ 'properties' ].get( 'geometry' )
    if not g: return None
    polys = g[ 'coordinates' ] if g[ 'type' ] == 'MultiPolygon' else [ g[ 'coordinates' ] ]
    # ( a parcel in two pieces: the largest; the registry draws them as one in all but a few cases )
    area = lambda r: abs( sum( a[ 0 ] * b[ 1 ] - b[ 0 ] * a[ 1 ] for a, b in zip( r, r[ 1: ] ) ) ) / 2
    poly = max( polys, key=lambda p: area( p[ 0 ] ) )
    return [ [ [ round( x, 2 ), round( y, 2 ) ] for x, y in ring ] for ring in poly ]


def main():

    area = sys.argv[ 1 ] if len( sys.argv ) > 1 else 'bosut'
    lat, lon, km = ( float( v ) for v in sys.argv[ 2 ].split( ',' ) ) if len( sys.argv ) > 2 else ( 45.22730, 18.74159, 4 )
    cx, cy = ( round( v ) for v in Transformer.from_crs( 'EPSG:4326', 'EPSG:3765', always_xy=True ).transform( lon, lat ) )
    half = km * 500
    cache = os.path.join( HERE, 'cache', area, 'cadastre' )
    os.makedirs( cache, exist_ok=True )
    out, t = {}, time.time()
    # the squares nearest the block's middle first: a run that is cut short has the middle
    squares = sorted( ( ( e, n ) for e in range( int( cx - half ), int( cx + half ), SQUARE ) for n in range( int( cy - half ), int( cy + half ), SQUARE ) ),
        key=lambda s: max( abs( s[ 0 ] + SQUARE / 2 - cx ), abs( s[ 1 ] + SQUARE / 2 - cy ) ) )
    for name, ( kind, typ ) in LAYERS.items():
        seen = {}
        for k, ( e, n ) in enumerate( squares ):
            answer = ask( kind, typ, ( e, n, e + SQUARE, n + SQUARE ), os.path.join( cache, f'{kind}_{e}_{n}.json' ) )
            for f in answer[ 'features' ]:
                r = rings( f )
                if not r or f[ 'id' ] in seen: continue
                seen[ f[ 'id' ] ] = { 'id': f[ 'id' ], 'rings': r }
                if name == 'parcels': seen[ f[ 'id' ] ][ 'label' ] = f[ 'properties' ].get( 'label' )
            if k % 16 == 15: print( f'  {name}: {k + 1} of {len( squares )} squares, {len( seen )} so far ({time.time() - t:.0f} s)', flush=True )
        out[ name ] = list( seen.values() )
    path = os.path.join( HERE, 'cache', area, 'cadastre.json' )
    with open( path, 'w', encoding='utf-8' ) as f: json.dump( out, f, separators=( ',', ':' ), ensure_ascii=False )
    print( f'{len( out[ "parcels" ] )} parcels, {len( out[ "buildings" ] )} buildings -> {path} ({os.path.getsize( path ) >> 10} kB)' )


if __name__ == '__main__':
    main()
