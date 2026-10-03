// The footpaths of the Site that no map has (Survey.js PATHS): each a line of points and a width,
// laid as made ground, a slab a segment. Two segments meet on the line that halves the angle between
// them (a mitre), so each ends where the next begins and the path has no notch where it turns.

export function pathAreas( path ) {

	// ( the segments of one path are one piece of made ground: they share a level, Grade.js )
	const h = path.width / 2, group = {}, P = path.points;
	const normal = ( a, b ) => { const l = Math.hypot( b[ 0 ] - a[ 0 ], b[ 1 ] - a[ 1 ] ); return [ - ( b[ 1 ] - a[ 1 ] ) / l, ( b[ 0 ] - a[ 0 ] ) / l ]; };
	// the offset of each point to the path's left edge: the segment's normal at the ends, the mitre between
	const side = P.map( ( p, k ) => {

		const n0 = k > 0 ? normal( P[ k - 1 ], p ) : null, n1 = k + 1 < P.length ? normal( p, P[ k + 1 ] ) : null;
		if ( ! n0 || ! n1 ) { const n = n0 || n1; return [ n[ 0 ] * h, n[ 1 ] * h ]; }
		const m = [ n0[ 0 ] + n1[ 0 ], n0[ 1 ] + n1[ 1 ] ], cos = ( m[ 0 ] * n0[ 0 ] + m[ 1 ] * n0[ 1 ] ) / Math.hypot( ...m );
		return [ m[ 0 ] / Math.hypot( ...m ) * h / cos, m[ 1 ] / Math.hypot( ...m ) * h / cos ];

	} );
	return P.slice( 1 ).map( ( b, k ) => {

		const a = P[ k ], sa = side[ k ], sb = side[ k + 1 ];
		return { ring: [ [ a[ 0 ] - sa[ 0 ], a[ 1 ] - sa[ 1 ] ], [ b[ 0 ] - sb[ 0 ], b[ 1 ] - sb[ 1 ] ], [ b[ 0 ] + sb[ 0 ], b[ 1 ] + sb[ 1 ] ], [ a[ 0 ] + sa[ 0 ], a[ 1 ] + sa[ 1 ] ] ], of: path.of, group, source: path.source };

	} );

}
