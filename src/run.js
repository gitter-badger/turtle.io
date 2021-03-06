/**
 * Runs middleware in a chain
 *
 * @method run
 * @param  {Object} req    Request Object
 * @param  {Object} res    Response Object
 * @param  {String} host   [Optional] Host
 * @param  {String} method HTTP method
 * @return {Object}        TurtleIO instance
 */
TurtleIO.prototype.run = function ( req, res, host, method ) {
	var self       = this,
	    middleware = this.routes( req.parsed.pathname, host, method ),
	    nth        = middleware.length,
	    i          = -1;

	function last ( timer, err ) {
		if ( timer.stopped === null ) {
			timer.stop();
			self.signal( "middleware", function () {
				return [host, req.url, timer.diff()];
			} );
		}

		if ( !err ) {
			if ( REGEX_GET.test( method ) ) {
				self.request( req, res );
			}
			else if ( self.allowed( "get", req.parsed.pathname, req.vhost ) ) {
				self.error( req, res, self.codes.NOT_ALLOWED );
			}
			else {
				self.error( req, res, self.codes.NOT_FOUND );
			}
		}
		else {
			self.error( req, res, ( self.codes[( err.message || err ).toUpperCase()] || self.codes.SERVER_ERROR ), ( err.stack || err.message || err ) );
		}
	}

	function next ( err ) {
		var timer = precise().start(),
		    arity = 3;

		if ( ++i < nth && typeof middleware[i] == "function" ) {
			try {
				if ( err ) {
					// Finding the next error handling middleware
					arity = middleware[i].toString().replace( /(^.*\()|(\).*)|(\n.*)/g, "" ).split( "," ).length;

					if ( arity < 4 ) {
						while ( arity < 4 && ++i < nth && middleware[i] == "function" ) {
							arity = middleware[i].toString().replace( /(^.*\()|(\).*)|(\n.*)/g, "" ).split( "," ).length;
						}
					}
				}

				if ( timer.stopped === null ) {
					timer.stop();
					self.signal( "middleware", function () {
						return [host, req.url, timer.diff()];
					} );
				}

				if ( i < nth ) {
					arity === 3 ? middleware[i]( req, res, next ) : middleware[i]( err, req, res, next );
				}
				else {
					last( timer, err );
				}
			}
			catch ( e ) {
				next( e );
			}
		}
		else if ( !res._header && self.config.catchAll ) {
			last( timer, err );
		}
	}

	next();

	return this;
};
