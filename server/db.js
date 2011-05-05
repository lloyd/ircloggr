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

        createTable("CREATE TABLE IF NOT EXISTS utterances ( id INTEGER PRIMARY KEY, ts INTEGER, who TEXT, utterance TEXT )");
    });
};

function logUtterance(dbHand, handle, utterance) {
    dbHand.execute(
        "INSERT INTO utterances (ts, who, utterance) VALUES(strftime('%s','now'),?,?)",
        [ handle, utterance ],
        function(error, rows) {
            if (error) {
                console.log("error inserting into database: " + error);
                process.exit(1);
            }
        });
}

exports.log_message = function(host, room, who, utterance) {
    var fname = host + "-" + room + ".sqlite";
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
