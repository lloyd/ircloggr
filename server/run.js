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

// first set up irc bot
irc.listen("irc.mozilla.org", "#ircloggr", function(x) {
    irc.listen("irc.mozilla.org", "#ircloggr2", function(x) {
        runWSAPI();
    });
});

var server = undefined;

function runWSAPI() {
    server = connect.createServer()
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
        })
        .listen(PRIMARY_PORT, PRIMARY_HOST);
}
