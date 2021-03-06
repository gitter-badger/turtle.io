"use strict";

var dir      = __dirname,
    turtleio = require(dir + "/lib/turtle.io"),
    server   = turtleio();

server.get("/status", function (req, res) {
	server.respond(req, res, server.status());
}, "test");

server.start( {
	default : "test",
	root    : dir + "/sites",
	vhosts  : {
		"test" : "test"
	}
} );
