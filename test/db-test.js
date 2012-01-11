#!/usr/bin/env node

const
assert = require('assert'),
vows = require('vows'),
db = require('../lib/db.js');

var suite = vows.describe('db');
suite.options.error = false;

suite.addBatch({
  "connect to database": {
    topic: function() {
      db.connect(this.callback);
    },
    "works": function(r) {
      assert.isTrue(r);
    }
  }
});

// run or export the suite.
if (process.argv[1] === __filename) suite.run();
else suite.export(module);
