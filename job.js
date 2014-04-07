var fs = require( 'fs' );

function functionReviver(key, value) {
    if (key === '') {
        return value;
    }

    if (typeof value === 'string') {
        var rfunc = /^function[^\(]*\(([^\)]*)\)[^\{]*{([\s\S]*)\}$/,
            match = value.match(rfunc);

        if (match) {
            var args = match[1].split(',').map(function(arg) { return arg.replace(/\s+/, ''); });
            // console.error( 'matched', match[ 2 ], 'end' );

            /*jshint evil:true */
            return new Function(args, match[2]);
        }
    }
    return value;
}

var arg = process.argv[ 2 ];
var opts = JSON.parse( arg, functionReviver );
var outputFormat = opts.outputFormat;
var inputFormat = opts.inputFormat;

var script = opts.script;
var context = opts.context || {};
for ( var i in context ) {
    global[ i ] = context[ i ];
}
global.fs = fs;

var outbuf = '';
var d = '';
process.stdin.on( 'readable', function() {
    d += process.stdin.read();
    if ( d === null ) {
        return;
    }
    //console.error( 'message on', process.pid, d.toString('ascii') );
    var messages = d.toString('ascii').split( '\n' );
    var i = 0;
    while ( i < messages.length ) {
        message = messages[ i ];
        if (i === messages.length - 1 ) {
            d = message;
            ++i;
            continue;
        }
        if ( !message.length ) {
            ++i;
            continue;
        }
        if ( inputFormat == 'number' ) {
            _data = +message; // TODO: other types
        }
        else {
            _data = message;
        }
        var _result;
        if ( _data ) {
            _result = script( _data );
        }
        // var _result = script.runInNewContext( context );
        // console.error( 'process', process.pid, JSON.stringify( message ), _result );
        if ( _result ) {
            outbuf += _result + '\n';
            if ( outbuf.length > 100 ) {
                var b = process.stdout.write( outbuf, 'ascii' );
                if ( b ) {
                    outbuf = '';
                }
            }
        }
        ++i;
    }
} );


process.stdin.on( 'end', function() {
    // console.error( 'data on end', outbuf.length, outbuf );
    process.stdout.write( outbuf, 'ascii' );
    outbuf = '';
    // process.exit();
} );
// console.error( 'process:', process.pid, 'job:', script, 'context: ', context );
