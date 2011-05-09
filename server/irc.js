/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 */

const irc = require('irc'),
       db = require("./db.js"),
   config = require("./config.js");
 handlers = require("./irchandlers.js").handlers;

// a mapping of servernames to irc client handles
var clients = {
};

function createBot(host, room, cb) {
    var bot = new irc.Client(host, config.bot_name, {debug: config.debug_output});
    bot.addListener('error', function(message) {
        if (config.debug_output) console.log("error connecting to " + host + " " + room);
        cb(undefined);
    });
    bot.addListener('message', function (from, to, message) {
        // is this a public message to me?  if so, let's
        // see if there's a handler that would like to respond
        db.log_message(host, to, from, message);
        if (to === room && config.bot_name == message.substr(0, config.bot_name.length)) {
            // chop off our name
            message = message.substr(config.bot_name.length);
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
        if (config.debug_output) console.log("connected to " + host);
    });
    bot.addListener('registered', function () {
        if (config.debug_output) console.log("registered on " + host + " " + room);
        cb(bot);
    });
    bot.addListener('pm', function(nick, message) {
        if (config.debug_output) console.log('Got private message from ' + nick + ': ' + message);
    });
    bot.addListener('join', function(channel, who) {
        if (config.debug_output) console.log(who + ' has joined ' + channel);
    });
    bot.addListener('part', function(channel, who, reason) {
        if (config.debug_output) console.log(who + ' has left ' + channel + ': ' + reason);
    });
    bot.addListener('kick', function(channel, who, by, reason) {
        if (config.debug_output) console.log(who + ' was kicked from ' + channel + ' by ' + by + ': ' + reason);
    });
}

exports.listen = function(host, room, cb) {
    if (!clients.hasOwnProperty(host)) {
        createBot(host, room, function(bot) {
            if (config.debug_output) console.log("bot created for " + host);
            if (bot != undefined) {
                clients[host] = bot;
                exports.listen(host, room, cb);
            } else {
                cb(false);
            }
        });
    } else {
        clients[host].join(room, function(room) {
            if (config.debug_output) console.log("joined " + room);
            cb(true);
        });
    }
};
