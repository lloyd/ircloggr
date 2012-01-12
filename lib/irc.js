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
  var bot = new irc.Client(host, config.bot_name, {debug: config.debug_output});
  bot.addListener('error', function(message) {
    winston.debug("error connecting to " + host + " " + room);
    cb(undefined);
  });
  bot.addListener('message', function (from, to, message) {
    // is this a public message to me?  if so, let's
    // see if there's a handler that would like to respond
    db.log_message(host, to, from, message);
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

exports.listen = function(host, room, cb) {
  if (!clients.hasOwnProperty(host)) {
    createBot(host, room, function(bot) {
      winston.debug("bot created for " + host);
      if (bot != undefined) {
        clients[host] = bot;
        exports.listen(host, room, cb);
      } else {
        cb(false);
      }
    });
  } else {
    clients[host].join(room, function(who) {
      winston.debug(who + " has joined");
      cb(true);
    });
  }
};
