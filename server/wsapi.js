/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 */

const     db = require('./db.js'),
         url = require('url'),
   httputils = require('./httputils.js');

exports.utterances = function(args, req, resp) {
    if (args.length != 3) {
        httputils.badRequest(resp, "bad request url, I expect: /utterances/<host>/<room>");        
        return;
    }
    db.get_utterances(args[1], args[2], function(err, rez)  {
        if (err) {
            httputils.badRequest(resp, "cant get utterances: " + err);
            return;
        }
        // XXX: cache headers!
        httputils.jsonResponse(resp, rez);
    });
};
