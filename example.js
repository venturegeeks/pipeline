var Pipeline = require( './pipeline' );

var t1 = process.hrtime();

Pipeline.range( 1, 1000 ).filter( function( x ) {
    return ( x % 3 === 0 || x % 5 === 0 );
} ).reduce( 0, function( x, sum ) {
    return x + sum;
} ).on( 'complete', function( data ) {
    var tdiff = process.hrtime( t1 );
    console.log( 'total', data[ data.length - 1 ] );
    console.log( 'time', tdiff[ 0 ] * 1000 + tdiff[ 1 ] / 1000000, 'ms' );
} );

Pipeline.range( 1, 10 ).map( function( x ) {
    return "x=" + x;
}, { outputFormat: 'string' } ).on( 'complete', function( data ) {
    console.log( data );
} );

Pipeline.readFile( './LICENSE' ).reduce( 0, function( line, sofar ) {
    return sofar + line.match( /\S+/g ).length;
} ).on( 'complete', function( data ) {
    var total = data[ data.length - 1 ];
    console.log( 'license word count', total );
} );
