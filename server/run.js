/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 */

const sys = require("sys"),
     http = require("http"),
      url = require("url"),
     path = require("path"),
       fs = require("fs"),
  connect = require("connect");
     path = require('path'),
    wsapi = require('./wsapi.js'),
httputils = require('./httputils.js'),
  connect = require('connect'),
      irc = require('./irc.js'),
   config = require('./config.js');

var PRIMARY_HOST = "127.0.0.1";
var PRIMARY_PORT = 51432;

// XXX: command line switch handling

// parse config file
try {
    config.parse_config_file();
} catch(e) {
    if (e && e.code === 'EBADF') {
        console.log("missing config file: " + e.path);
    } else {
        console.log("problem reading config file (" + config.config_path + "): " + e);
    }
    process.exit(1);
}

// need rooms configured, otherwise, what are we even doing?
if (Object.keys(config.servers).length === 0) {
    console.log("No irc rooms are configured!  Go update the config file!");
    process.exit(1);
}

// now connect to specified servers
var toConnect = [];
for (var host in config.servers) {
    for (var i = 0; i < config.servers[host].length; i++) {
        var room = config.servers[host][i];
        toConnect.push([host, room]);
    }
}
function connectOneRoom() {
    if (toConnect.length == 0) runWSAPI();
    else {
        var cur = toConnect.shift();
        if (cur[1].substr(0,1) != '#') cur[1] = "#" + cur[1];
        irc.listen(cur[0], cur[1], function(x) {
            if (x !== true) {
                console.log("error connecting to : " + cur[0] + " " + cur[1]);
                process.exit(1);
            }
            connectOneRoom();
        });
    }
}
connectOneRoom();

/*
irc.listen("irc.mozilla.org", "#ircloggr", function(x) {
    irc.listen("irc.mozilla.org", "#ircloggr2", function(x) {
        runWSAPI();
    });
});
*/

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
