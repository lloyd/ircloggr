/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 */

var   sys = require("sys"),
     http = require("http"),
      url = require("url"),
     path = require("path"),
       fs = require("fs"),
  connect = require("connect");
     path = require('path'),
    wsapi = require('./wsapi.js'),
httputils = require('./httputils.js'),
  connect = require('connect'),
      irc = require('./irc.js');

var PRIMARY_HOST = "127.0.0.1";
var PRIMARY_PORT = 51432;

var server = connect.createServer()
    .use(connect.favicon())
    .use(connect.logger({
        format: ":status :method :remote-addr :response-time :url",
        stream: fs.createWriteStream(path.join(__dirname, "server.log"))
    }))
    .use(function(request, response, serveFile) {
        var urlpath = url.parse(request.url).pathname;
        if (wsapi[urlpath]) {
            wsapi[urlpath](request, response);
        } else {
            httputils.fourOhFour(response, "no such function: " + urlpath + "\n");
        }
    });

exports.setup = function(server) {
  var week = (7 * 24 * 60 * 60 * 1000);
  server.use(sessions({
      secret: COOKIE_SECRET,
      session_key: "eyedeeme_state",
      path: '/'
  }));
}

server.listen(PRIMARY_PORT, PRIMARY_HOST);
