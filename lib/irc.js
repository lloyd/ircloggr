/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 */

const irc = require('irc'),
       db = require("./db.js"),
   config = require("./config.js"),
 handlers = require("./irchandlers.js").handlers,
  winston = require('winston');

// a mapping of servernames to irc client handles
var clients = {
};

function createBot(host, room, cb) {
  var bot = new irc.Client(host, config.get('bot_name'),
                           { debug: config.get('debug_output')});
  bot.addListener('error', function(message) {
    winston.debug("error connecting to " + host + " " + room);
    cb(undefined);
  });
  bot.addListener('message', function (from, to, message) {
    // is this a public message to me?  if so, let's
    // see if there's a handler that would like to respond
    db.logMessage(host, to, {
      who: from,
      utterance: message
    }, function(err) {
      if (err) winston.error('error logging utterance: ' + err);
    });
    if (to === room && bot.nick == message.substr(0, bot.nick.length)) {
      // chop off our name
      message = message.substr(bot.nick.length);
      // chop of typical chars that delimit our name from message
      while (message.length && (message.charAt(0) == ':' || message.charAt(0) == ',')) {
        message = message.substr(1);
      }
      message = message.trim();

      // let's try to find a handler
      function tryHandler(i) {
        if (i >= handlers.length) return;
        handlers[i](host, room, from, message, function(response) {
          if (response != undefined) {
            bot.say(to, response);
          } else {
            tryHandler(i+1);
          }
        });
      }
      tryHandler(0);
    }
  });
  bot.addListener('connect', function () {
    winston.debug("connected to " + host);
  });
  bot.addListener('registered', function () {
    winston.debug("registered on " + host + " " + room);
    cb(bot);
  });
  bot.addListener('pm', function(nick, message) {
    winston.debug('Got private message from ' + nick + ': ' + message);
  });
  bot.addListener('join', function(channel, who) {
    winston.debug(who + ' has joined ' + channel);
  });
  bot.addListener('part', function(channel, who, reason) {
    winston.debug(who + ' has left ' + channel + ': ' + reason);
  });
  bot.addListener('kick', function(channel, who, by, reason) {
    winston.debug(who + ' was kicked from ' + channel + ' by ' + by + ': ' + reason);
  });
}

/* listen to one server/room pair */
exports.listen = function(host, room, cb) {
  db.addRoom(host, room, function(err) {
    if (err) return cb(err);

    if (!clients.hasOwnProperty(host)) {
      winston.debug('attempting to connect to \'' + host + "'");
      createBot(host, room, function(bot) {
        winston.debug("bot created for " + host);
        if (bot != undefined) {
          clients[host] = { bot: bot, rooms: [] };
          exports.listen(host, room, cb);
        } else {
          cb("couldn't connect!");
        }
      });
    } else {
      clients[host].bot.join(room, function(who) {
        clients[host].rooms.push(room);
        winston.debug(who + " has joined " + host + " - " + room);
        cb(null);
      });
    }
  });
};

/* connect to all configured rooms, disconnect from rooms that aren't
 * configured */
exports.connectAllRooms = function(cb) {
  var servers = config.get('servers');

  // need rooms configured, otherwise, what are we even doing?
  if (Object.keys(servers).length === 0) {
    return cb("No irc rooms are configured!  Go update the config file!");
  }

  // now connect to specified servers
  var toConnect = [];
  for (var host in servers) {
    for (var i = 0; i < servers[host].length; i++) {
      var room = servers[host][i];
      if (room.substr(0,1) != '#') room = "#" + room;
      toConnect.push([host, room]);
    }
  }

  // first, let's disconnect all rooms that are not in the array
  Object.keys(clients).forEach(function(host) {
    clients[host].rooms.forEach(function(room) {
      var found = false;
      toConnect.forEach(function(x) {
        if (x[0] === host && x[1] === room) found = true; 
      });
      if (!found) {
        winston.info(host + " - " + room + " no longer configured, leaving");
        clients[host].bot.part(room);
        clients[host].rooms.splice(clients[host].rooms.indexOf(room), 1);
      }
    });
  });

  // now let's connect up to all rooms
  function connectOneRoom() {
    if (toConnect.length == 0) return cb(null);
    else {
      var cur = toConnect.shift();
      if (clients[cur[0]] && clients[cur[0]].rooms &&
          clients[cur[0]].rooms.indexOf(cur[1]) != -1)
      {
        winston.debug('already connected to: ' + cur.join(" - "));
        connectOneRoom();
      } else {
        exports.listen(cur[0], cur[1], function(err) {
          if (err) {
            winston.error("can't connect to " + cur[0] + " " + cur[1] + ": " + err);
          }
          connectOneRoom();
        });
      }
    }
  }
  connectOneRoom();
};
