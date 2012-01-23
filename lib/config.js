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
   winston = require('winston');

exports.bot_name = process.env['BOT_NAME'] || "ircloggr_dev";

exports.config_path = path.join(path.dirname(__dirname), "config.json");

exports.db_host = '127.0.0.1';
exports.db_port = 3306;
exports.db_user = 'ircloggr';
exports.db_pass = undefined;
exports.database = 'ircloggr';

// handle database string set in the environment
if (!process.env['MYSQL_URL'] && process.env['CLEARDB_DATABASE_URL_A']) {
  process.env['MYSQL_URL'] = process.env['CLEARDB_DATABASE_URL_A'];
}

if (process.env['MYSQL_URL']) {
  var u = url.parse(process.env['MYSQL_URL']);
  exports.db_host = u.host;
  exports.db_user = u.auth.split(':')[0];
  exports.db_pass = u.auth.split(':')[1];
  exports.database = u.path.substr(1);
}

winston.info('using mysql database at ' + exports.db_host + " - " + exports.database);

exports.host = process.env['IP_ADDRESS'] || "127.0.0.1";

exports.port = process.env['PORT'] || 0;

exports.deployment_url = "http://irclog.gr";

exports.servers = {
};

exports.import_config = function() {
  // read from the environment
  if (process.env['SERVERS']) {
    process.env['SERVERS'].split('|').forEach(function(serverLine) {
      var ls = serverLine.split('=');
      if (!exports.servers[ls[0]]) exports.servers[ls[0]] = [];
      ls[1].split(',').forEach(function(room) {
        exports.servers[ls[0]].push(room);
      });
    });
  }
  // or look for a config file
  else {
    try {
      var conf = JSON.parse(fs.readFileSync(exports.config_path));

      for (var k in conf) {
        if (exports[k] === undefined || k.substr(0,5) === "parse")
          throw "unsupported key: " + k;
        if (exports[k] !== null && typeof exports[k] !== typeof conf[k]) {
          throw "'"+k+"' is a "+ typeof exports[k] +", it should be a " + typeof conf[k]; 
        }
        exports[k] = conf[k];
      }
    } catch(e) {
      winston.error('error in config file: ' + exports.config_path)
    }
  }

  winston.info('configured rooms:');
  winston.info(JSON.stringify(exports.servers, null, 4));
};
