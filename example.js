var Pipeline = require( './pipeline' );

Pipeline.range( 1, 1000 ).filter( function( x ) {
    return ( x % 3 === 0 || x % 5 === 0 );
} ).reduce( 0, function( x, sum ) {
    return x + sum;
} ).on( 'complete', function( total ) {
    console.log( 'total', total );
} );

Pipeline.range( 1, 10 ).map( function( x ) {
    return "" + x;
}, { outputFormat: 'string' } ).reduce( "", function( x, sofar ) {
    return sofar + x;
} ).on( 'complete', function( data ) {
    // output: 123456789
    console.log( "numbers", data );
} );

Pipeline.readFile( './LICENSE' ).reduce( 0, function( line, sofar ) {
    return sofar + line.match( /\S+/g ).length;
} ).on( 'complete', function( total ) {
    console.log( 'license word count', total );
} );
