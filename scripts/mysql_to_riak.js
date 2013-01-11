const config = require('../lib/config'),
          db = require('../lib/db');

const riak = require('riak-js').getClient();

db.connect(function(err) {
  if (err) {
    process.stderr.write("can't connect to database: " + err + "\n");
    process.exit(1);
  }

  db.client.query("SHOW TABLES", function(err, tables) {
    var arr = [];
    tables.forEach(function(t) {
      var tName = t[Object.keys(t)[0]];
      var o = db.fromDBName(tName);
      o.table = tName;
      arr.push(o);
    });
    function doThing() {
      if (!arr.length) db.close();
      else {
        migrate(arr.shift(), doThing);
      }
    }
    doThing();
  });
});

function batch(batchSize, doOne, amDone, allDone) {
  if (amDone()) return allDone();

  var curBatch = 0;

  while (curBatch < batchSize) {
    if (!amDone()) {
      function oneDone(err) {
        if (err) console.log('err', err);
        curBatch--;
        if (amDone()) {
          if (!curBatch) allDone();
        } else {
          curBatch++;
          doOne(oneDone);
        }
      }
      curBatch++
      doOne(oneDone);
    }
  }
}


function migrate(source, cb) {
  console.log("flushing bucket", source.table);
  flush(source.table, function() {
    console.log("flushed!  insertion begins on", source.table);
    db.client.query("SELECT COUNT(*) AS n FROM " + source.table, function(err, rez) {
      var rows = rez[0].n;
      var curOff = 0;

      function do10k(lcb) {
        if (curOff > rows) return cb();
        var pct = (curOff / (.01 * rows)).toFixed(1);
        console.log(pct + "%");
        curOff += 10000;
        db.client.query("SELECT UNIX_TIMESTAMP(ts) as ts, who, msg FROM " + source.table + " WHERE id > ? && id <= ?",
                        [ curOff - 10000, curOff ], function (err, rows) {
                          batch(2, function(cb) {
                            var o = rows.shift();
                            o.ts = new Date(o.ts * 1000);
                            riak.save(source.table, null, o, cb);
                          }, function() {
                            return !rows.length;
                          }, do10k);
                        });
      }

      console.log("reading", rows, "from", source.table);
      do10k();
    });
  });
}

// clear out the riak bucket.
function flush(bucket, cb) {
  riak.updateProps(bucket, {
    precommit: [ {
      "mod": "riak_search_kv_hook",
      "fun": "precommit"
    } ]
  }, function(err) {
    var keys = [];
    riak.keys(bucket, { keys: 'stream'})
      .on('keys', function(group) {
        keys = keys.concat(group);
      })
      .on('end', function() {
        console.log("got", keys.length, "to flush");
        batch(2, function(cb) {
          var x = keys.shift();
          riak.remove(bucket, x, cb);
        }, function() {
          return !keys.length;
        }, cb);
      }).start();
  });
}
