/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 */

const sqlite = require('sqlite'),
        path = require('path');

var db = new sqlite.Database();

exports.log_message = function(room, host, handle, utterance) {
    return false;
};
