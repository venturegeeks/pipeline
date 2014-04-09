var fs = require( 'fs' );
var argv = require( 'minimist' )( process.argv.slice( 2 ) );

function functionReviver(key, value) {
    if (typeof value === 'string') {
        var rfunc = /^function[^\(]*\(([^\)]*)\)[^\{]*{([\s\S]*)\}$/,
            match = value.match(rfunc);

        if (match) {
            var args = match[1].split(',').map(function(arg) { return arg.replace(/\s+/, ''); });

            /*jshint evil:true */
            return new Function(args, match[2]);
        }
    }
    return value;
}

function Job( script, context, opts ) {
    this.script = script;
    this.context = context;
    this.outputFormat = opts.outputFormat || 'string';
    this.inputFormat = opts.inputFormat || 'string';
    this.outbuf = '';

    for ( var i in context ) {
        global[ i ] = context[ i ];
    }
    global.fs = fs;

    var inbuf = '';
    var self = this;
    process.stdin.on( 'readable', function() {
        data = process.stdin.read();
        if ( data === null ) {
            return;
        }
        if ( inbuf ) {
            data = inbuf + data;
        }
        //console.error( 'message on', process.pid, data.toString('ascii') );
        var messages = data.toString('ascii').split( '\n' );
        var i = 0;
        while ( i < messages.length ) {
            var message = messages[ i ];
            if (i === messages.length - 1 ) {
                inbuf = message;
                ++i;
                continue;
            }
            if ( !message.length ) {
                ++i;
                continue;
            }
            self.execute( message );
            ++i;
        }
    } );

    process.on( 'message', function( message ) {
        // console.error( 'got message', message, process.pid );
        self.execute( message );
    } );

    process.stdin.on( 'end', function() {
        // console.error( 'data on end', outbuf.length, outbuf );
        process.stdout.write( self.outbuf, 'ascii' );
        self.outbuf = '';
        process.exit();
    } );
}

Job.prototype.execute = function( input ) {
    var _data;
    if ( this.inputFormat === 'number' ) {
        _data = +input; // TODO: other types
    }
    else {
        _data = input;
    }
    var _result;
    if ( _data ) {
        _result = script( _data );
    }
    // var _result = script.runInNewContext( context );
    // console.error( 'process', process.pid, JSON.stringify( _data ), JSON.stringify( _result ) );
    if ( _result ) {
        if ( this.outputFormat == 'object' ) {
            process.send( _result );
            return;
        }
        if ( Array.isArray( _result ) && outputFormat !== 'array' ) {
            for ( var j = 0; j < _result.length; ++j ) {
                this.outbuf += _result[ j ] + '\n';
            }
        }
        else {
            this.outbuf += _result + '\n';
        }
        if ( this.outbuf.length > 100 ) {
            var b = process.stdout.write( this.outbuf, 'ascii' );
            if ( b ) {
                this.outbuf = '';
            }
        }
    }
};

function print_usage() {
    console.log( 'Usage:', process.argv[ 0 ], process.argv[ 1 ], " --script FUNCTION [--context JSON --inputFormat number|string|array|object --outputFormat number|string|array|object]" );
}

if ( !argv[ 'script' ] ) {
    print_usage();
    process.exit( 1 );
}

var script = functionReviver( '', argv[ 'script' ] );
var outputFormat = argv.outputFormat;
var inputFormat = argv.inputFormat;
var context = argv.context ? JSON.parse( argv.context, functionReviver ) : {};
var job = new Job( script, context, { outputFormat: outputFormat, inputFormat: inputFormat } );
// console.error( 'process:', process.pid, 'job:', script, 'context:', context, inputFormat, outputFormat );
