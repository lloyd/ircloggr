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
    var urlobj = url.parse(req.url, true);
    var getArgs = urlobj.query;

    if (args.length != 3) {
        httputils.badRequest(resp, "bad request url, I expect: /utterances/<host>/<room>");        
        return;
    }
    
    var before = 0;
    var num = 30;

    if (getArgs.hasOwnProperty('num')) {
        num = parseInt(getArgs['num']);
        if (isNaN(num)) num = 30;
        if (num < 1) num = 1;
        if (num > 100) num = 100;
    }

    if (getArgs.hasOwnProperty('before')) {
        before = parseInt(getArgs['before']);
    }

    db.get_utterances(args[1], args[2], before, num, function(err, rez)  {
        if (err) {
            httputils.badRequest(resp, "cant get utterances: " + err);
            return;
        }
        // XXX: cache headers!
        httputils.jsonResponse(resp, rez);
    });
};

exports.logs = function(args, req, resp) {
    httputils.jsonResponse(resp, db.list_logged_rooms());
};
