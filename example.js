var Pipeline = require( './pipeline' );

Pipeline.range( 1, 1000 ).filter( function( x ) {
    return ( x % 3 === 0 || x % 5 === 0 );
} ).reduce( 0, function( x, sum ) {
    return x + sum;
} ).on( 'complete', function( total ) {
    console.log( 'total', total );
} );

Pipeline.range( 1, 10 ).reduce( "", function( x, sofar ) {
    return sofar + x;
}, { outputFormat: "string" } ).on( 'complete', function( data ) {
    // output: 123456789
    console.log( "numbers", data );
} );

Pipeline.readFile( './LICENSE' ).map( function( line ) {
    return line.replace( /[,.!?\/\\:"\'(){}\[\]'-]/g, '' ).toLowerCase().split( ' ' );
} ).reduce( {}, function( word, sofar ) {
    // console.log( foo );
    if ( !( word in sofar ) ) {
        sofar[ word ] = 1;
    }
    else {
        sofar[ word ] += 1;
    }
    return sofar;
}, { outputFormat: 'object' } ).on( 'complete', function( dict ) {
    console.log( 'Word frequency of LICENSE file:', dict );
} );
