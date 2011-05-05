/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 */

const irc = require('irc'),
       db = require("./db.js"),
   config = require("./config.js");

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
        db.log_message(host, to, from, message);
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
