/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 */

exports.fourOhFour = function(resp, reason)
{
  resp.writeHead(404, {"Content-Type": "text/plain"});
  resp.write("Not Found");
  if (reason) {
    resp.write(": " + reason);
  }
  resp.end();
};

exports.serverError = function(resp, reason)
{
  resp.writeHead(500, {"Content-Type": "text/plain"});
  if (reason) resp.write(reason);
  resp.end();
};

exports.badRequest = function(resp, reason)
{
  resp.writeHead(400, {"Content-Type": "text/plain"});
  resp.write("Bad Request");
  if (reason) {
    resp.write(": " + reason);
  }
  resp.end();
};

exports.jsonResponse = function(resp, obj)
{
  resp.writeHead(200, {"Content-Type": "application/json"});
  if (obj !== undefined) resp.write(JSON.stringify(obj));
  resp.end();
};

exports.xmlResponse = function(resp, doc)
{
  resp.writeHead(200, {"Content-Type": "text/xml"});
  if (doc !== undefined) resp.write(doc);
  resp.end();
};
