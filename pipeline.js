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
        return value.toString().replace( /\n/g, ' ' );
    }
    return value;
}

function Pipeline( f, context ) {
    EventEmitter.call( this );

    this.children = [];
    this.data = [];

    context = context || {};

    var self = this;

    if ( f ) {
        proc = this.proc = childProcess.spawn( 'node', [ './job.js', JSON.stringify( { script: f, context: context }, functionReplacer ) ], { stdio: [ 'pipe', 'pipe', process.stderr ] } );
        // console.log( 'forked child', proc.pid );

        proc.stdin.on( 'error', function() {
            console.log( 'error on stdin of', proc.pid );
        } );

        proc.stdout.on( 'data', function( m ) {
            // console.log( 'reading from child', m.toString(), 'end reading' );
            messages = m.toString().split( '\n' );
            messages.forEach( function( message ) {
                if ( !message.length ) {
                    return;
                }
                message = +parseFloat( message ); // TODO: other types
                // console.log( 'child sent data', proc.pid, message );
                if ( message ) {
                    self.emit( 'item', message );
                }
                self.data.push( message );
            } );
        } );


        proc.on( 'exit', function() {
            // console.log( 'proc', proc.pid, 'finished' );
            self.complete();
        } );
    }
}

inherits( Pipeline, EventEmitter );

Pipeline.prototype.fork = function( f, context ) {
    var child = new Pipeline( f, context );
    if ( this.proc ) {
        this.proc.stdout.pipe( child.proc.stdin );
    }
    this.children.push( child );
    return child;
};

Pipeline.prototype.map = function( f ) {
    return this.fork( f );
};
Pipeline.prototype.filter = function( f ) {
    return this.fork( function( x ) {
        if ( f( x ) ) {
            return x;
        }
    }, { f: f } );
};
Pipeline.prototype.reduce = function( init, f ) {
    return this.fork( function( x ) {
        sofar = f( x, sofar );
        return sofar;
    }, { f: f, sofar: init } );
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
    if ( proc ) {
        proc.kill();
    }
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
    }, { start: start, end: end } );
    // console.log( 'ready time', process.hrtime( t1 )[ 1 ] / 1000000 );
    pipeline.proc.stdin.write( 1 + '\n', 'ascii' );
    return pipeline;
};

module.exports = exports = Pipeline;
