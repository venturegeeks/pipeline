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

process.stdin.on( 'data', function( d ) {
    var messages = d.toString().split( '\n' );
    var i = 0;
    while ( i < messages.length ) {
        message = messages[ i ].trim();
        if ( !message.length ) {
            ++i;
            continue;
        }
        if ( script ) {
            _data = parseFloat( message ); // TODO: other types
            // context[ '_data' ] = parseFloat( message );
            var _result = script( _data );
            // var _result = script.runInNewContext( context );
            console.error( 'process', process.pid, message, _result );
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

// console.error( 'process', process.pid, 'ready' );
