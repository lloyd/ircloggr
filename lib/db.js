/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 */

const mysql = require('mysql'),
       path = require('path'),
     config = require('./config.js'),
         fs = require('fs');

var client;

function toDBName(host, room) {
  if (!host || !room) throw 'missing required args';
  if (room.substr(0,1) === "#") room = room.substr(1);
  host = host.replace('-', '_');
  return (host.replace(/\./g, '$') + "$$" + room);
}

function fromDBName(dbName) {
  var ar = dbName.split('$$');
  return {
    host: ar[0].replace('_', '-')replace(/\$/g, '.'),
    room: ar[1]
  };
}

exports.logMessage = function(host, room, argArray, cb) {
  if (!Array.isArray(argArray)) argArray = [argArray];
  var dbname = toDBName(host, room);
  var sql = 'INSERT INTO ' + dbname + '(ts, who, msg) VALUES';
  var first = true;
  params = [ ];
  argArray.forEach(function(args) {
    var date_func = 'NOW';
    var date_val = ''
    if (args.date) {
      date_val = (args.date.getTime() / 1000);
      date_func = 'FROM_UNIXTIME';
    }
    if (!first) sql += ',';
    first = false;
    sql += '('+date_func+'(?),?,?)';
    params.push(date_val);
    params.push(args.who);
    params.push(args.utterance);
  });
  client.query(sql, params, cb);
};

exports.getUtterances = function(args, cb) {
  var dbname = toDBName(args.host,args.room);
  var whereClause = "";
  if (args.before && typeof args.before === 'number') {
    whereClause = "WHERE id < " + args.before;
  }
  if (typeof args.num != 'number') {
    args.num = 30;
  }
  var orderBy = ' ORDER BY id DESC ';

  var params = [ ];
  if (args.phrase) {
    if (whereClause.length == 0) whereClause = "WHERE";
    else whereClause += " AND";
    whereClause += " MATCH (who,msg) AGAINST(?)";
    params.push(args.phrase);
    orderBy = ""; // use match score ordering
  }
  var sql = 'SELECT id, UNIX_TIMESTAMP(ts) as ts, who, msg FROM '+ dbname + ' ' +
    whereClause + orderBy + ' LIMIT ' + args.num;
  client.query(sql, params, cb);
};

exports.utteranceWithContext = function(host, room, idIn, numIn, cb) {
  var dbname = toDBName(host,room);
  var num = 15, id = 0;
  if (typeof numIn === 'number') {
    if (numIn >= 0) num = numIn;
    if (num > 50) num = 50;
  }
  if (idIn && typeof idIn === 'number') id = idIn;

  var from = ((id > num) ? (id-num) : 0);
  var to = id + num;
  var whereClause = "WHERE id >= " + from + " AND id <= " + to;

  var sql = 'SELECT id, UNIX_TIMESTAMP(ts) as ts, who, msg FROM ' + dbname + ' ' +
    whereClause +' ORDER BY id DESC LIMIT ' + (num*2+1);
  client.query(sql, cb);
};

// cache listRooms responses because they take a lot of queries and don't scale well
var listRoomsCache;
var listRoomsCacheUpdated;

function newerThan(time, seconds) {
  if (!time) return false;
  return (new Date().getTime() - time.getTime()) < (seconds * 1000);
}

exports.listRooms = function(cb) {
  // if newerThan 5 minutes, we'll use the value
  if (newerThan(listRoomsCacheUpdated, 20 * 5)) {
    // prevent invocation of callback
    var realCB = cb;
    cb = undefined;
    // async return cached results
    process.nextTick(function() { realCB(null, listRoomsCache); });
  }

  // if newerThan 1 minute, we won't update the cache
  if (newerThan(listRoomsCacheUpdated, 60)) return;

  // prevent simul requests from causing expensive queries to run in ||
  if (listRoomsCache) listRoomsCacheUpdated = new Date();
  
  client.query("SHOW TABLES", function(err, tables) {
    if (err) return cb ? cb(err) : undefined;
    var rooms = [ ];
    tables.forEach(function(row) {
      var dbname = row[Object.keys(row)[0]];
      var d = fromDBName(dbname);
      client.query(
        "SELECT COUNT(*) AS n FROM " + dbname + " WHERE ts > DATE_SUB(NOW(), INTERVAL 1 MONTH)",
        function(err, r) {
          if (err) {
            if (cb) { cb(err); cb = undefined; }
            return;
          }
          d.thisMonth = r[0].n;
          client.query(
            'SELECT UNIX_TIMESTAMP(ts) as ts FROM ' + dbname + ' ORDER BY id DESC LIMIT 1',
            function(err, r) {
              if (err) {
                if (cb) { cb(err); cb = undefined; }
                return;
              }
              d.latest = r.length ? r[0].ts : 0;
              rooms.push(d);
              if (rooms.length === tables.length) {
                listRoomsCacheUpdated = new Date();
                listRoomsCache = rooms;
                if (cb) cb(null, rooms);
              }
            });
          });
    });
  });
};

// XXX: port this!
// forget 30 minutes of conversation in host/room
exports.i_think_i_hit_my_head_or_something = function(host, room, cb) {
    var fname = toFname(host,room);
    if (!databases.hasOwnProperty(fname) || !databases[fname].handle) {
        cb(true);
        return;
    }

    databases[fname].handle.execute(
        "DELETE FROM utterances WHERE strftime('%s','now','-30 minutes') < ts",
        [ ],
        function(err, rows) {
            cb(err == undefined);
        });
};

exports.connect = function(cb) {
  var options = {
    host: config.db_host,
    port: config.db_port,
    user: config.db_user,
    password: config.db_pass,
    database: config.database
  };

  client = mysql.createClient(options);

  client.ping(cb);
};

exports.clearTestTables = function(cb) {
  if (config.database != 'ircloggr_test') {
    throw "cowardly refusing to drop tables";
  }
  client.query("SHOW TABLES", function(err, r) {
    if (err) return cb(err);
    r.forEach(function(row) {
      client.query("DROP TABLE " + row[Object.keys(row)[0]]);
    });
    cb(null);
  });
};

exports.addRoom = function(host, room, cb) {
  var dbName = toDBName(host, room);
  // XXX: fulltext indexing!
  var sql = "CREATE TABLE IF NOT EXISTS " + dbName + " (" +
    "id BIGINT AUTO_INCREMENT PRIMARY KEY," +    
    "ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL," +
    "who CHAR(48) NOT NULL," +
    "msg TEXT," +
    "FULLTEXT (who,msg)," +
    "INDEX(ts)" + 
    ") ENGINE=MyISAM;";
  client.query('set @@auto_increment_increment=1', function(err) {
    if (err) return cb(err);
    client.query(sql, cb);
  });
};

exports.close = function(cb) {
  client.end(function(err) {
    client = undefined;
    if (cb) cb(!err ? null : err);
  });
};
