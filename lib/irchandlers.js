/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 */

const   db = require("./db.js"),
    config = require("./config.js");

// an exported array of message handlers
exports.handlers = [
    function(host, room, from, message, cb) {
        if (message === 'amnesia') {
            db.i_think_i_hit_my_head_or_something(host, room, function(ok) {
                cb( from + ": " +
                    (ok ? "Dude, I can no longer remember the last 30 minutes, o.O" :
                          "Hmm, I can't seem to forget the last 30 minutes o.O"));
            });
        } else {
            cb(undefined);
        }
    },
    function(host, room, from, message, cb) {
        cb(from + ": I am a robot. I don't say smart things.  I just listen: " +
           config.deployment_url);
    }
];
