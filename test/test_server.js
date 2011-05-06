/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 *
 * A simple test server for running static web pages and proxying
 * wsapi to /api.  Allows for local dev mirroing deployment layout.
 */

const sys = require("sys"),
     http = require("http"),
      url = require("url"),
     path = require("path"),
       fs = require("fs"),
  connect = require('connect');

var server = connect.createServer()
    .use(connect.favicon())
    .use(connect.logger())
    .use(function(request, response, next) {
        var parsedurl = url.parse(request.url);
        var urlpath = parsedurl.pathname + (parsedurl.search ? parsedurl.search : "");
        var args = urlpath.substr(1).split('/');
        if (args[0] == 'api') {
            // proxy
            var options = {
                host: '127.0.0.1',
                port: 51432,
                path: '/' + args.slice(1).join('/')
            };
            http.get(options, function(res) {
                response.writeHead(res.statusCode, {
                    "Content-Type": response.getHeader('content-type')
                });
                res.on('data', function(chunk) {
                    response.write(chunk);
                }).on('end', function() {
                    response.end();
                });
            }).on('error', function(e) {
                response.writeHead(503, {"Content-Type": "text/plain"});
                response.write("no api server running: " + e + "\n");
                response.end();
            });
        } else {
            next();
        }
    })
    .use(connect.static(path.join(path.dirname(__dirname), "static")))
    .listen(60000, "127.0.0.1");

console.log("running on http://127.0.0.1:60000");

