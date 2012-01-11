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
  if (room.substr(0,1) === "#") room = room.substr(1);
  return (host.replace(/\./g, '$') + "$$" + room);
}

function fromDBName(dbName) {
  var ar = dbName.split('$$');
  return {
    host: ar[0].replace(/\$/g, '.'),
    room: ar[1]
  };
}  

exports.logMessage = function(host, room, who, utterance, cb) {
  var dbname = toDBName(host, room);
  client.query(
    'INSERT INTO ' + dbname + '(who, msg) VALUES(?,?)',
    [ who, utterance ],
    cb);
};

exports.getUtterances = function(args, cb) {
  if (!args.host || !args.room) throw 'missing required args';
  var dbname = toDBName(args.host,args.room);
  var whereClause = "";
  if (args.before && typeof args.before === 'number') {
    whereClause = "WHERE id < " + before;
  }
  if (typeof args.num != 'number') {
    args.num = 30;
  }
  var params = [ ];
  if (args.phrase) {
    if (whereClause.length == 0) whereClause = "WHERE";
    else whereClause += " AND";
    whereClause += " msg LIKE ? ";
    params.push('%' + args.phrase + '%');
  }

  client.query(
    'SELECT id, (UNIX_TIMESTAMP(ts) * 1000) as ts, who, msg FROM '+ dbname + ' ' +
      whereClause + ' ORDER BY id DESC LIMIT ' + args.num,
    params,
    cb);
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

  client.query(
    'SELECT id, (UNIX_TIMESTAMP(ts) * 1000) as ts, who, msg FROM ' + dbname + ' ' +
      whereClause+' ORDER BY id DESC LIMIT ' + (num*2+1),
    cb);
};


exports.listRooms = function(cb) {
  client.query("SHOW TABLES", function(err, r) {
    if (err) return cb(err);
    var rooms = [ ];
    r.forEach(function(row) {
      rooms.push(fromDBName(row[Object.keys(row)[0]]));
    });
    cb(null, rooms);
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
    "msg VARCHAR(512)" +
    ")";
  client.query(sql, cb);
};

exports.close = function(cb) {
  client.end(function(err) {
    client = undefined;
    if (cb) cb(!err ? null : err);
  });
};
