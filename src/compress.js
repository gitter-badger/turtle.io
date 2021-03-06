/**
 * Pipes compressed asset to Client
 *
 * @method compressed
 * @param  {Object}  req     HTTP(S) request Object
 * @param  {Object}  res     HTTP(S) response Object
 * @param  {Object}  body    Response body
 * @param  {Object}  type    gzip (gz) or deflate (df)
 * @param  {String}  etag    Etag
 * @param  {Boolean} file    Indicates `body` is a file path
 * @param  {Object}  options [Optional] Stream options
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.compress = function ( req, res, body, type, etag, file, options ) {
	var self    = this,
	    timer   = precise().start(),
	    method  = REGEX_GZIP.test( type ) ? "createGzip" : "createDeflate",
	    sMethod = method.replace( "create", "" ).toLowerCase(),
	    fp      = etag ? this.config.tmp + "/" + etag + "." + type : null;

	function next ( exist ) {
		if ( !file ) {
			// Pipe Stream through compression to Client & disk
			if ( typeof body.pipe == "function" ) {
				body.pipe( zlib[method]() ).pipe( res );
				body.pipe( zlib[method]() ).pipe( fs.createWriteStream( fp ) );

				timer.stop();

				self.signal( "compress", function () {
					return [etag, fp, timer.diff()];
				} );
			}
			// Raw response body, compress and send to Client & disk
			else {
				zlib[sMethod]( body, function ( e, data ) {
					if ( e ) {
						self.log( new Error( "[client " + ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
						self.unregister( req.parsed.href );
						self.error( req, res, self.codes.SERVER_ERROR );
					}
					else {
						res.end( data );

						if ( fp ) {
							fs.writeFile( fp, data, "utf8", function ( e ) {
								if ( e ) {
									self.log( new Error( "[client " + ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
									self.unregister( req.parsed.href );
								}
							} );
						}

						timer.stop();

						self.signal( "compress", function () {
							return [etag, fp || "dynamic", timer.diff()];
						} );
					}
				} );
			}
		}
		else {
			// Pipe compressed asset to Client
			fs.createReadStream( body, options ).on( "error", function ( e ) {
				self.log( new Error( "[client " + ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
				self.unregister( req.parsed.href );
				self.error( req, res, self.codes.SERVER_ERROR );
			} ).pipe( zlib[method]() ).pipe( res );

			// Pipe compressed asset to disk
			if ( exist === false ) {
				fs.createReadStream( body ).on( "error", function ( e ) {
					self.log( new Error( "[client " + ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
				} ).pipe( zlib[method]() ).pipe( fs.createWriteStream( fp ) );
			}

			timer.stop();

			self.signal( "compress", function () {
				return [etag, fp, timer.diff()];
			} );
		}
	}

	if ( fp ) {
		fs.exists( fp, function ( exist ) {
			// Pipe compressed asset to Client
			if ( exist && !options ) {
				fs.createReadStream( fp ).on( "error", function ( e ) {
					self.log( new Error( "[client " + ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
					self.unregister( req.parsed.href );
					self.error( req, res, self.codes.SERVER_ERROR );
				} ).pipe( res );

				timer.stop();

				self.signal( "compress", function () {
					return [etag, fp, timer.diff()];
				} );
			}
			else {
				next( exist );
			}
		} );
	}
	else {
		next();
	}

	return this;
};
