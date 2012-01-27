/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 */

// server configuration, config file parsing, and eventually command line switch
// handling.

const path = require('path'),
        fs = require('fs'),
       url = require('url'),
   winston = require('winston'),
   convict = require('convict');

var conf = convict({
  host: {
    format: 'string = "127.0.0.1"',
    env: 'IP_ADDRESS' },
  port: {
    format: 'integer = 0',
    env: 'PORT' },
  bot_name: {
    format: 'string = "ircloggr|dev"',
    env: 'BOT_NAME' },
  db: {
    host: 'string = "127.0.0.1"',
    port: 'integer = 3306',
    user: 'string = "ircloggr"',
    pass: 'string = ""',
    database: 'string = "ircloggr"' },
  deployment_url: 'string = "http://irclog.gr"',
  config_file: {
    format: 'union { string; null; } = null',
    env: 'CONFIG_FILE' },
  servers: 'object { }* = {}',
  debug_output: { env: 'DEBUG', format: 'boolean = false' }
});

if (conf.get('config_file')) {
  conf.loadFile(conf.get('config_file'));
}

// handle database string set in the environment
if (!process.env['MYSQL_URL'] && process.env['CLEARDB_DATABASE_URL_A']) {
  process.env['MYSQL_URL'] = process.env['CLEARDB_DATABASE_URL_A'];
}

if (process.env['MYSQL_URL']) {
  var u = url.parse(process.env['MYSQL_URL']);
  conf.set('db.host', u.host);
  conf.set('db.user', u.auth.split(':')[0]);
  conf.set('db.pass', u.auth.split(':')[1]);
  conf.set('db.database', u.path.substr(1));
}

winston.info('using mysql database at ' + conf.get('db.host') + " - " + conf.get('db.database'));

// read from the environment
if (process.env['SERVERS']) {
  var servers = {};
  process.env['SERVERS'].split('|').forEach(function(serverLine) {
    var ls = serverLine.split('=');
    if (!servers[ls[0]]) servers[ls[0]] = [];
    ls[1].split(',').forEach(function(room) {
      servers[ls[0]].push(room);
    });
  });
  conf.set('servers', servers);
}

conf.validate();

module.exports = conf;
