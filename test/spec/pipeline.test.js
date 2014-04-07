/**
 * @fileOverview API Surface.
 */
var chai = require('chai');
var expect = chai.expect;

var Pipeline = require( '../..' );


describe('API Surface', function() {
  it('Will perform reliably', function(done) {
    var invocations = 0;
    for (var i = 0; i < 10; i++) {
      Pipeline.range( 1, 10000 ).filter( function( x ) {
          return ( x % 3 === 0 || x % 5 === 0 );
      } ).reduce( 0, function( x, sum ) {
          return x + sum;
      } ).on( 'complete', function( data ) {
          var total = data[ data.length - 1 ];
          expect(total).to.equal(23331668);
          if (++invocations === 10) {
            done();
          }
      } );
    }
  });
});
