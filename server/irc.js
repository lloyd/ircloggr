/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 */

const irc = require('irc');

exports.my_name = "ircloggr";

// a mapping of servernames to irc client handles
var clients = {
};

function createBot(host, room, cb) {
    var bot = new irc.Client(host, exports.my_name, {debug: true});
    console.log("created bot");
    bot.addListener('error', function(message) {
        console.log("error connecting to " + host + " " + room);
        cb(undefined);
    });
    bot.addListener('message', function (from, to, message) {
        console.log(from + ' => ' + to + ': ' + message);
    });
    bot.addListener('connect', function () {
        console.log("connected to " + host + " " + room);
    });
    bot.addListener('registered', function () {
        console.log("registered on " + host + " " + room);
        cb(bot);
    });
    bot.addListener('pm', function(nick, message) {
        console.log('Got private message from ' + nick + ': ' + message);
    });
    bot.addListener('join', function(channel, who) {
        console.log(who + ' has joined ' + channel);
    });
    bot.addListener('part', function(channel, who, reason) {
        console.log(who + ' has left ' + channel + ': ' + reason);
    });
    bot.addListener('kick', function(channel, who, by, reason) {
        console.log(who + ' was kicked from ' + channel + ' by ' + by + ': ' + reason);
    });
}

exports.listen = function(host, room, cb) {
    console.log("listen called: " + host + " | " + room);
    if (!clients.hasOwnProperty(host)) {
        console.log("create bot!");

        createBot(host, room, function(bot) {
            if (bot != undefined) {
                clients[host] = bot;
                exports.listen(host, room, cb);
            } else {
                cb(false);
            }
        });
    } else {
        clients[host].join(room, function(room) {
            console.log("joined " + room);
            cb(true);
        });
    }
};
