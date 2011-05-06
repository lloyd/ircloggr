/**
 * ircloggr - a node.js all-in-one implementation of irc logging visible via
 *            a REST/JSON interface.
 *
 * See LICENSE file for licensing information.
 */

const sqlite = require('sqlite'),
        path = require('path'),
      config = require('./config.js'),
          fs = require('fs');

var databases = {
};

function openDatabase(fname, cb) {
    var db = new sqlite.Database();
    db.open(path.join(config.dbs_path, fname), function (error) {
        if (error) {
            console.log("Couldn't open database ("+fname+"): " + error);
            process.exit(1);
        }

        function createTable(sql) {
            db.execute(sql, function (error, rows) {
                if (error) {
                    console.log("Couldn't create utterances table: " + error);
                    process.exit(1);
                }
                cb(db);
            });
        }

        createTable("CREATE TABLE IF NOT EXISTS utterances ( ts INTEGER, who TEXT, msg TEXT )");
    });
};

function logUtterance(dbHand, handle, utterance) {
    dbHand.execute(
        "INSERT INTO utterances (ts, who, msg) VALUES(strftime('%s','now'),?,?)",
        [ handle, utterance ],
        function(error, rows) {
            if (error) {
                console.log("error inserting into database: " + error);
                process.exit(1);
            }
        });
}

function toFname(host, room) {
    if (room.substr(0,1) != "#") room = "#" + room;
    return host + "_##_" + room + ".sqlite";
}

exports.log_message = function(host, room, who, utterance) {
    var fname = toFname(host, room);
    if (databases[fname]) {
        if (databases[fname].queue) {
            databases[fname].queue.push([who, utterance]);
        } else {
            // insert!
            logUtterance(databases[fname].handle, who, utterance);
        }
    } else {
        function dbUP(hand) {
            var queue = databases[fname].queue;
            delete databases[fname].queue;
            databases[fname].handle = hand;
            while (queue.length) {
                var ut = queue.shift();
                logUtterance(hand, ut[0], ut[1]);
            }
        }

        // on demand database creation.  first make a stub indicating
        // to other dudes that creation is in process
        databases[fname] = {
            queue: [ [ who, utterance ] ]
        };
        function dirExists() {
            var pathToDB = path.join(config.dbs_path, fname);
            fs.stat(pathToDB, function(err, stats) {
                if (err) {
                    openDatabase(fname, dbUP);
                } else if (!stats.isFile()) {
                    console.log("db file isn't a file: " + pathToDB);
                    process.exit(1);
                } else {
                    openDatabase(fname, dbUP);
                }
            });
        }

        // create directory if required
        fs.stat(config.dbs_path, function(err, stats) {
            if (err) {
                // good, no such directory
                fs.mkdir(config.dbs_path, "0755", function (ex) {
                    if (ex) {
                        console.log("error creating db directory (" + config.dbs_path +
                                    "): " + ex);
                        process.exit(1);
                    }
                    dirExists();
                });
            } else if (stats) {
                if (!stats.isDirectory()) {
                    console.log(config.dbs_path + " exists and is not a directory, " +
                                "run away!");
                    process.exit(1);
                }
                dirExists();
            }
        });
    }
};


exports.get_utterances = function(host, room, before, num, cb) {
    var fname = toFname(host,room);
    if (!databases.hasOwnProperty(fname) || !databases[fname].handle) {
        cb("no utterances for this host + room");
        return;
    }
    var whereClause = "";
    if (before && typeof before === 'number') {
        whereClause = "WHERE id < " + before;
    }
    databases[fname].handle.execute(
        'SELECT rowid as id, ts, who, msg FROM utterances '+whereClause+' ORDER BY rowid DESC LIMIT ' + num,
        [ ],
        function(err, rows) {
            cb(err, rows);
        });                
};

exports.search_utterances = function(host, room, phrase, before, num, cb) {
    var fname = toFname(host,room);
    if (!databases.hasOwnProperty(fname) || !databases[fname].handle) {
        cb("no utterances for this host + room");
        return;
    }
    var whereClause = "";
    if (before && typeof before === 'number') {
        whereClause = "WHERE rowid < " + before;
    }
    if (whereClause.length == 0) whereClause = "WHERE";
    else whereClause += " AND";
    whereClause += " msg LIKE ? ";
    
    console.log(whereClause);

    databases[fname].handle.execute(
        'SELECT rowid as id, ts, who, msg FROM utterances '+whereClause+' ORDER BY rowid DESC LIMIT ' + num,
        [ "%"+phrase+"%"  ],
        function(err, rows) {
            cb(err, rows);
        });                
};

exports.utterance_with_context = function(host, room, idIn, numIn, cb) {
    var fname = toFname(host,room);
    if (!databases.hasOwnProperty(fname) || !databases[fname].handle) {
        cb("no utterances for this host + room");
        return;
    }
    var num = 15, id = 0;
    if (typeof numIn === 'number') {
        if (numIn >= 0) num = numIn;
        if (num > 50) num = 50;
    }
    if (idIn && typeof idIn === 'number') id = idIn;

    var from = ((id > num) ? (id-num) : 0);
    var to = id + num;
    var whereClause = "WHERE id >= " + from + " AND id <= " + to;

    databases[fname].handle.execute(
        'SELECT rowid as id, ts, who, msg FROM utterances '+whereClause+' ORDER BY rowid DESC LIMIT ' + (num*2+1),
        [ ],
        function(err, rows) {
            cb(err, rows);
        });                
};


// at process startup, client should invoke load_databases to load up all them
// databases
exports.load_databases = function() {
    fs.readdir(config.dbs_path, function(err, files) {
        if (files === undefined) return;
        files.forEach(function (f) {
            if (!databases.hasOwnProperty(f)) {
                openDatabase(f, function(hand) {
                    databases[f] = { handle: hand };
                });
            }
        });
    });
};

exports.list_logged_rooms = function() {
    var arr = [];
    for (var k in databases) {
        var v = k.split("_##_");
        if (v[1].substr(0,1) == "#") v[1] = v[1].substr(1);
        arr.push({ host: v[0], room: v[1] });
    }
    return arr;
};
