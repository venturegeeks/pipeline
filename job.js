var vm = require( 'vm' );
var fs = require( 'fs' );

var arg = process.argv[ 2 ];
var msg = JSON.parse( arg, functionReviver );
var script = msg.script;
var context = msg.context || {};
for ( var i in context ) {
    global[ i ] = context[ i ];
}
global.fs = fs;

function functionReviver(key, value) {
    if (key === "") return value;
    
    if (typeof value === 'string') {
        var rfunc = /^function[^\(]*\(([^\)]*)\)[^\{]*{([\s\S]*)\}$/,
            match = value.match(rfunc);
        
        if (match) {
            var args = match[1].split(',').map(function(arg) { return arg.replace(/\s+/, ''); });
            // console.error( 'matched', match[ 2 ], 'end' );
            return new Function(args, match[2]);
        }
    }
    return value;
}

var outbuf = '';
process.stdin.on( 'readable', function() {
    var d = process.stdin.read();
    if ( d === null ) {
        return;
    }
    //console.error( 'message on', process.pid, d.toString('ascii') );
    var messages = d.toString('ascii').split( '\n' );
    var i = 0;
    while ( i < messages.length ) {
        // message = messages[ i ].trim();
        message = messages[ i ];
        if ( !message.length ) {
            //console.error( "no length", message, +message, script( +message ) );
            ++i;
            continue;
        }
        _data = +message; // TODO: other types
        // context[ '_data' ] = parseFloat( message );
        if ( _data ) {
            var _result = script( _data );
        }
        // var _result = script.runInNewContext( context );
        // console.error( 'process', process.pid, JSON.stringify( message ), _result );
        if ( _result ) {
            // outbuf.concat( _result + '\n' );
            // outbuf = Buffer.concat( [ outbuf, new Buffer( _result + '\n', 'ascii' ) ] );
            outbuf += _result + '\n';
            if ( outbuf.length > 100 || ending ) {
                // if ( ending ) { console.error( 'ending' ); }
                var b = fs.writeSync( 1, new Buffer( outbuf, 'ascii' ), 0, outbuf.length, null, function(){} );
                if ( b != outbuf.length ) {
                    console.error( 'error writing on job', process.pid, b.length, outbuf.length );
                }
                if ( b ) {
                    outbuf = '';
                }
            }
            //process.stdout.write( _result + '\n' );
            // console.log( _result );
        }
        ++i;
    }
} );

var ending = false;

process.stdin.on( 'end', function() {
    ending = true;
    // console.error( 'data on end', outbuf.length, outbuf );
    fs.writeSync( 1, new Buffer( outbuf, 'ascii' ), 0, outbuf.length, null );
    outbuf = '';
    // process.exit();
} );
// console.error( 'process:', process.pid, 'job:', script, 'context: ', context );
