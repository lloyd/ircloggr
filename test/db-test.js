#!/usr/bin/env node

const
assert = require('assert'),
vows = require('vows'),
db = require('../lib/db.js'),
config = require('../lib/config.js');

var suite = vows.describe('db');
suite.options.error = false;

// manually override the database we'll connect to for testing purposes
config.database = 'ircloggr_test';

suite.addBatch({
  "connect to database": {
    topic: function() {
      db.connect(this.callback);
    },
    "works": function(err) {
      assert.isNull(err);
    }
  }
});

suite.addBatch({
  "clearing test tables": {
    topic: function() {
      db.clearTestTables(this.callback);
    },
    "works": function(err) {
      assert.isNull(err);
    }
  }
});

suite.addBatch({
  "adding one new room": {
    topic: function() {
      db.addRoom("irc.freenode.net", "yajl", this.callback);
    },
    "works": function(err) {
      console.log
      assert.isNull(err);
    }
  },
  "adding a second new room simultaneously": {
    topic: function() {
      db.addRoom("irc.mozilla.org", "identity", this.callback);
    },
    "works": function(err) {
      assert.isNull(err);
    }
  }
});

suite.addBatch({
  "listing rooms": {
    topic: function() {
      db.listRooms(this.callback);
    },
    "shows the two we expect": function(err, r) {
      r.forEach(function(logged) {
        assert.ok([ 'irc.mozilla.org', 'irc.freenode.net' ].indexOf(logged.host) !== -1);
        assert.ok([ 'yajl', 'identity' ].indexOf(logged.room) !== -1);
      });
    }
  }
});

suite.addBatch({
  "logging utterances": {
    topic: function() {
      db.logMessage("irc.freenode.net", "#yajl", {
        who: "lloyd",
        utterance: "I love ircloggr"
      }, this.callback);
    },
    "succeeds": function(err) { assert.isNull(err) },
    "and more utterances": {
      topic: function() {
        db.logMessage("irc.freenode.net", "yajl", {
          who: "lloyd",
          utterance: "he is kind and gentle"
        }, this.callback);
      },      
      "succeeds": function(err) { assert.isNull(err) },
    }
  }
});

suite.addBatch({
  "searching utterances": {
    topic: function() {
      db.getUtterances(
        { host: "irc.freenode.net", room: "yajl", phrase: "and gentle" },
        this.callback);
    },
    works: function(err, r) {
      assert.isNull(err);
      assert.strictEqual(r.length, 1);
    }
  },
  "searching for multiple matches": {
    topic: function() {
      db.getUtterances({host:"irc.freenode.net", room:"yajl", phrase:"i" }, this.callback);
    },
    works: function(err, r) {
      assert.isNull(err);
      assert.strictEqual(r.length, 2);
    }
  }
});

suite.addBatch({
  "adding 200 utterances": {
    topic: function() {
      var cb = this.callback;
      var completed = 0;
      for (var i = 0; i < 200; i++) {
        db.logMessage("irc.mozilla.org", "#identity",
          who: "lloyd",
          utterance: "This is utterance #" + i
        }, function(err, r) {
          if (completed < 0) return;
          else if (err) {
            completed = -1;
            cb(err);
          } else if (++completed === 200) {
            cb(null);
          }
        });
      }
    },
    works: function(err, r) {
      assert.isNull(err);
    }
  }
});

suite.addBatch({
  "getting an utterance with context": {
    topic: function() {
      db.utteranceWithContext('irc.mozilla.org', 'identity', 100, 10, this.callback);
    },
    "yields expected results": function(err, r) {
      assert.isNull(err);
      assert.equal(r[0].id, 110);
      assert.equal(r[20].id, 90);
    }
  }
});

suite.addBatch({
  "closing the database": {
    topic: function() { db.close(this.callback); },
    works: function(err) { assert.isNull(err); }
  }
});

// run or export the suite.
if (process.argv[1] === __filename) suite.run();
else suite.export(module);
