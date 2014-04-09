/*
 * Pipeline
 * ...
 * https://github.com/venturegeeks/pipeline
 *
 * Copyright (c) 2014 VentureGeeks
 * Licensed under the MIT license.
*/
var childProcess = require( 'child_process' );
var EventEmitter = require( 'events' ).EventEmitter;
var inherits = require( 'util' ).inherits;

function functionReplacer(key, value) {
    if (typeof(value) === 'function') {
        return value.toString();
    }
    return value;
}

function Pipeline( f, context, opts ) {
    EventEmitter.call( this );

    this.children = [];
    this.data = null;

    context = context || {};
    opts = opts || {};
    this.opts = opts;

    var self = this;

    proc = this.proc = childProcess.spawn( 'node', [ 
        __dirname + '/job.js', 
        '--script', functionReplacer( '', f ), 
        '--context', JSON.stringify( context, functionReplacer ),
        '--inputFormat', opts.inputFormat,
        '--outputFormat', opts.outputFormat
    ], {
        stdio: [ 'pipe', 'pipe', process.stderr, 'ipc' ]
    } );
    // console.log( 'forked child', proc.pid );

    proc.stdin.on( 'error', function() {
        console.log( 'error on stdin of', proc.pid );
    } );

    proc.on( 'message', function( message ) {
        self.updateData( message );
        if ( message ) {
            self.emit( 'item', message );
        }
    } );

    proc.stdout.on( 'data', function( m ) {
        // console.log( 'reading from child', m.toString(), 'end reading' );
        messages = m.toString().split( '\n' );
        messages.forEach( function( message ) {
            if ( !message.length ) {
                return;
            }
            if ( opts.outputFormat == 'number' ) {
                message = +message;
            }
            self.updateData( message );
            // console.log( 'child sent data', proc.pid, message );
            if ( message ) {
                self.emit( 'item', message );
            }
        } );
    } );


    proc.on( 'exit', function() {
        // console.log( 'proc', proc.pid, 'finished' );
        self.complete();
    } );
}

inherits( Pipeline, EventEmitter );

Pipeline.prototype.attach = function( child ) {
    this.children.push( child );
    this.proc.stdout.pipe( child.proc.stdin );
    this.proc.on( 'message', function( msg ) {
        child.proc.send( msg );
    } );
    return child;
};
Pipeline.prototype.fork = function( f, context, opts ) {
    opts = opts || {};
    if ( !opts.inputFormat ) {
        opts.inputFormat = this.opts.outputFormat;
    }
    if ( !opts.outputFormat ) {
        opts.outputFormat = opts.inputFormat;
    }
    var child = new Pipeline( f, context, opts );
    this.attach( child );
    return child;
};
Pipeline.prototype.updateData = function( item ) {
    if ( !this.data ) {
        this.data = [];
    }
    this.data.push( item );
};
Pipeline.prototype.map = function( f, opts ) {
    return this.fork( f, {}, opts );
};
Pipeline.prototype.filter = function( f, opts ) {
    return this.fork( function( x ) {
        if ( f( x ) ) {
            return x;
        }
    }, { f: f }, opts );
};
Pipeline.prototype.reduce = function( init, f, opts ) {
    var pipeline = this.fork( function( x ) {
        sofar = f( x, sofar );
        return sofar;
    }, { f: f, sofar: init }, opts );
    pipeline.updateData = function( item ) {
        pipeline.data = item;
    };
    return pipeline;
};
Pipeline.prototype.complete = function() {
    this.children.forEach( function( child ) {
        child.proc.stdin.end();
    } );
    // console.log( 'completed', this.data );
    this.emit( 'complete', this.data );
    this.completed = true;
};
Pipeline.prototype.close = function() {
    // console.log( 'killing proc', proc.pid );
    // this.proc.kill();
    this.children.forEach( function( child ) {
        child.close();
    } );
};
Pipeline.range = function( start, end ) {
    var pipeline = new Pipeline( function() {
        var message = '';
        var i = start;
        while ( i < end ) {
            message += i + '\n';
            if ( message.length > 100 ) {
                var b = process.stdout.write( message, 'ascii' );
                if ( b ) {
                    message = '';
                }
            }
            i += 1;
        }
        process.stdout.write( message, 'ascii' );
        process.exit();
    }, { start: start, end: end },
    { inputFormat: 'number', outputFormat: 'number' } );
    // console.log( 'ready time', process.hrtime( t1 )[ 1 ] / 1000000 );
    pipeline.proc.stdin.write( 1 + '\n', 'ascii' ); // send a start signal
    return pipeline;
};
Pipeline.readFile = function( fileName ) {
    var pipeline = new Pipeline( function() {
        var fd = fs.openSync( fileName, 'r' );
        if ( !fd ) {
            console.error( 'Error reading file', fileName );
            return;
        }
        while ( true ) {
            var buffer = new Buffer( 512, 'ascii' );
            var bytesRead = fs.readSync( fd, buffer, 0, 512 );
            // console.error( buffer.toString( 'ascii' ) );
            if ( !bytesRead ) {
                break;
            }
            process.stdout.write( buffer.slice( 0, bytesRead ), 'ascii' );
        }
        process.exit();
    }, { fileName: fileName }, { outputFormat: 'string' } );
    pipeline.proc.stdin.write( 1 + '\n', 'ascii' ); // send a start signal
    return pipeline;
};

module.exports = exports = Pipeline;
