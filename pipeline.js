var child_process = require( 'child_process' );
var EventEmitter = require( 'events' ).EventEmitter;
var inherits = require( 'util' ).inherits;
var t1 = process.hrtime();

function functionReplacer(key, value) {
    if (typeof(value) === 'function') {
        return value.toString().replace( /\n/g, " " );
    }
    return value;
}

function Pipeline( f, context ) {
    EventEmitter.call( this );

    this.children = [];
    this.data = [];

    context = context || {};

    var self = this;
    this.ready = false;

    if ( f ) {
        var proc = this.proc = child_process.spawn( 'node', [ './job.js' ], { stdio: [ 'pipe', 'pipe', process.stderr ] } );
        console.log( 'forked child', proc.pid );
        
        proc.stdin.on( 'error', function() {
            console.log( 'error on stdin of', proc.pid );
        } );

        proc.stdin.on( 'readable', function() {
            console.log( 'readable stdin of', proc.pid );
        } );

        proc.stdin.write( JSON.stringify( { 
            type: 'job', 
            data: f,
            context: context
        }, functionReplacer ) + '\n', 'utf-8' );

        proc.stdout.on( 'data', function( m ) {
            // console.log( 'reading from child', m.toString(), 'end reading' );
            messages = m.toString().split( '\n' );
            messages.forEach( function( message ) {
                if ( !message.length ) {
                    return;
                }
                if ( !self.ready && message == "ready" ) {
                    self.ready = true;
                    self.emit( 'ready' );
                    return;
                }
                message = +message; // TODO: other types
                // console.log( 'child sent data', proc.pid, message );
                if ( message ) {
                    self.emit( 'item', message );
                }
                /*
                if ( !self.children.length || !self.children[ 0 ].ready ) {
                    self.data.push( message );
                }
                */
            } );
        } );

        proc.on( 'exit', function() {
            console.log( 'proc', proc.pid, 'finished' );
            self.complete();
        } );
    }
};

inherits( Pipeline, EventEmitter );

Pipeline.prototype.fork = function( f, context ) {
    var child = new Pipeline( f, context );
    if ( this.proc ) {
        this.proc.stdout.pipe( child.proc.stdin );
    }
    this.children.push( child );
    var self = this;
    // child.on( 'ready', function() {
        /*
        for ( var i = 0; i < self.data.length; ++i ) {
            console.log( 'writing', self.data[ i ], 'to', child.proc.pid );
            var result = child.proc.stdin.write( self.data[ i ] + '\n' );
            if ( !result ) {
                console.error( 'failed writing to', child.proc.pid );
            }
        }
        self.data = [];
        if ( self.completed ) {
            child.proc.stdin.end();
        }
        */
    // } );
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
/*
Pipeline.prototype.write = function( item ) {
    if ( !this.children.length ) {
        this.data.push( item );
    }
    else {
        for ( var i = 0; i < this.children.length; ++i ) {
            // console.log( 'sending to child', this.children[ i ].proc.pid, item );
            var result = this.children[ i ].proc.stdin.write( item + '\n' );
            if ( !result ) {
                console.error( 'failed writing to', child.proc.pid );
            }
        }
    }
    this.emit( 'item', item );
};
*/
Pipeline.prototype.complete = function() {
    this.children.forEach( function( child ) {
        child.proc.stdin.end();
    } );
    // console.log( 'completed', this.data );
    this.emit( 'complete', this.data );
    this.completed = true;
};
Pipeline.prototype.close = function() {
    console.log( 'killing proc', proc.pid );
    if ( proc ) {
        proc.kill();
    }
    this.children.forEach( function( child ) {
        child.close();
    } );
};
Pipeline.range = function( start, end ) {
    var pipeline = new Pipeline( function() {
        for ( var i = start; i < end; ++i ) {
            process.stdout.write( i + '\n' );
        }
        console.error( 'range finished' );
        process.exit();
    }, { start: start, end: end } );
    pipeline.on( 'ready', function() {
        pipeline.proc.stdin.write( 1 + '\n' );
    } );
    return pipeline;
};

Pipeline.range( 1, 100000 ).filter( function( x ) {
    return ( x % 3 == 0 || x % 5 == 0 );
} ).reduce( 0, function( x, sum ) {
    return x + sum;
} ).on( 'complete', function( data ) {
    console.log( 'total', data[ data.length - 1 ] );
} );
