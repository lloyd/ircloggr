/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 */

const     db = require('./db.js'),
         url = require('url'),
   httputils = require('./httputils.js'),
     winston = require('winston');

function haveError(err, res) {
  if (!err) return false;
  winston.error("server error encountered: " + err);
  res.status(500);
  res.json({ success: false, reason: err.toString() }); 
  return true;
}

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

exports.search = function(args, req, resp) {
    var urlobj = url.parse(req.url, true);
    var getArgs = urlobj.query;

    if (args.length != 4) {
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

    db.search_utterances(args[1], args[2], args[3], before, num, function(err, rez)  {
        if (err) {
            httputils.badRequest(resp, "cant get utterances: " + err);
            return;
        }
        // XXX: cache headers!
        httputils.jsonResponse(resp, rez);
    });
};

exports.context = function(args, req, resp) {
    var urlobj = url.parse(req.url, true);
    var getArgs = urlobj.query;

    if (args.length != 4) {
        httputils.badRequest(resp, "bad request url, I expect: /context/<host>/<room>/<id>");        
        return;
    }

    var num = 15;

    if (getArgs.hasOwnProperty('num')) {
        var n = parseInt(getArgs['num']);
        if (!isNaN(n)) num = n;
    }

    var id = parseInt(args[3]);
    if (isNaN(id)) id = 0;

    db.utterance_with_context(args[1], args[2], id, num, function(err, rez)  {
        if (err) {
            httputils.badRequest(resp, "cant get utterances with context: " + err);
            return;
        }
        // XXX: cache headers!
        httputils.jsonResponse(resp, rez);
    });
};

exports.logs = function(args, req, res) {
  db.listRooms(function(err, r) {
    if (!haveError(err, res)) res.json(r);
  });
};

exports.code_update = function(args, req, resp) {
    console.log("going down for code update!");
    process.exit(0);
}

exports.ping = function(args, req, resp) {
    httputils.jsonResponse(resp, true);
};
