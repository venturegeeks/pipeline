var child_process = require( 'child_process' );
var t1 = process.hrtime();

function functionReplacer(key, value) {
    if (typeof(value) === 'function') {
        return value.toString().replace( /\n/g, " " );
    }
    return value;
}

function Pipeline() {
    this.children = [];
    this.listeners = {};
    this.data = [];
    this.on = function( evt, callback ) {
        if ( !( evt in this.listeners ) ) {
            this.listeners[ evt ] = [];
        }
        this.listeners[ evt ].push( callback );
        return this;
    };
    this.emit = function( evt ) {
        if ( !( evt in this.listeners ) ) {
            return;
        }
        var data = Array.prototype.slice.call( arguments, 1 );
        var self = this;
        this.listeners[ evt ].forEach( function( listener ) {
            listener.apply( self, data );
        } );
    };
    this.fork = function( f, context ) {
        context = context || {};
        var child = child_process.spawn( 'node', [ './job.js' ], { stdio: [ 'pipe', 'pipe', process.stderr ] } );
        console.log( 'forked child', child.pid );

        child.stdin.write( JSON.stringify( { 
            type: 'job', 
            data: f,
            context: context
        }, functionReplacer ) + '\n', 'utf-8' );

        this.children.push( child );
        
        var pipeline = new Pipeline();
        child.stdout.on( 'data', function( m ) {
            // console.log( 'reading from child', m.toString(), 'end reading' );
            messages = m.toString().split( '\n' );
            messages.forEach( function( message ) {
                if ( !message.length ) {
                    return;
                }
                message = +message; // TODO: other types
                // console.log( 'child sent data', child.pid, message );
                if ( message ) {
                    pipeline.write( message );
                }
            } );
        } );
        child.on( 'exit', function() {
            pipeline.complete();
        } );

        return pipeline;
    };
    this.map = function( f ) {
        return this.fork( f );
    };
    this.filter = function( f ) {
        return this.fork( function( x ) { 
            if ( f( x ) ) { 
                return x; 
            } 
        }, { f: f } );
    };
    this.reduce = function( init, f ) {
        return this.fork( function( x ) { 
            sofar = f( x, sofar );
            return sofar;
        }, { f: f, sofar: init } );
    };
    this.write = function( item ) {
        this.data.push( item );
        for ( var i = 0; i < this.children.length; ++i ) {
            // console.log( 'sending to child', this.children[ i ].pid, item );
            this.children[ i ].stdin.write( item + '\n' );
        }
        this.emit( 'item', item );
    };
    this.complete = function() {
        this.children.forEach( function( child ) {
            child.stdin.end();
        } );
        // console.log( 'completed', this.data );
        this.emit( 'complete', this.data );
        this.data = [];
    };
    this.range = function( start, end ) {
        var i = start;
        var items = [];
        var self = this;
        this.on( 'start', function next() {
            ++i;
            if ( i < end ) {
                items.push( i );
                self.write( i );
                setTimeout( next, 0 );
            }
            else {
                self.complete( items );
            }
        } );
        return this;
    };
    /*
    this.feed = function( list ) {
        var self = this;
        list.forEach( function( el ) {
            self.write( el );
        } );
        this.complete( list );
    };
    */
    this.start = function() {
        this.emit( 'start' );
    };
    this.close = function() {
        this.children.forEach( function( child ) {
            console.log( 'killing child', child.pid );
            child.kill();
        } );
    };
}

p = new Pipeline();
p.range( 1, 1000 ).filter( function( x ) {
    return ( x % 3 == 0 || x % 5 == 0 );
} ).reduce( 0, function( x, sum ) {
    return x + sum;
} ).on( 'complete', function( total ) {
    console.log( 'total', total[ total.length - 1 ] );
    p.close();
} )
p.start();
