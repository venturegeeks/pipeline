var vm = require( 'vm' );
var script = null;
var context = null;

function functionReviver(key, value) {
    if (key === "") return value;
    
    if (typeof value === 'string') {
        var rfunc = /^function[^\(]*\(([^\)]*)\)[^\{]*{([\s\S]*)\}$/,
            match = value.match(rfunc);
        
        if (match) {
            var args = match[1].split(',').map(function(arg) { return arg.replace(/\s+/, ''); });
            return new Function(args, match[2]);
        }
    }
    return value;
}

/*
process.stdin.on( 'readable', function() {
    var data = process.stdin.read();
    console.error( 'process', process.pid, 'leftover data', data + '' );
} );
*/

// process.stdin.on( 'data', function( d ) {
process.stdin.on( 'readable', function() {
    var d = process.stdin.read();
    if ( d === null ) {
        return;
    }
    // console.error( 'message on', process.pid, d.toString() );
    var messages = d.toString('ascii').split( '\n' );
    var i = 0;
    while ( i < messages.length ) {
        message = messages[ i ].trim();
        if ( !message.length ) {
            ++i;
            continue;
        }
        if ( script ) {
            if ( message == 'ready' ) { // TODO: temporary fix
                return; 
            }
            _data = parseFloat( message ); // TODO: other types
            // context[ '_data' ] = parseFloat( message );
            var _result = script( _data );
            // var _result = script.runInNewContext( context );
            console.error( 'process', process.pid, JSON.stringify( message ), _result );
            if ( _result ) {
                process.stdout.write( _result + '\n' );
                // console.log( _result );
            }
        }
        else {
            msg = JSON.parse( message, functionReviver );
            script = msg.data;
            context = msg.context;
            for ( var i in context ) {
                global[ i ] = context[ i ];
            }
            // console.error( 'process:', process.pid, 'job:', script, 'context: ', context );
        }
        ++i;
    }
} );

process.stdin.on( 'end', function() {
    process.exit();
} );

console.log( 'ready' );
/*
var fs = require( 'fs' );
var BUFFSIZE = 1024;
var buf = new Buffer( BUFFSIZE );
var bytes = fs.readSync( process.stdin.fd, buf, 0, BUFFSIZE );
*/
