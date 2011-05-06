const db = require("../server/db"),
      fs = require("fs");

var names = [
    "bob",
    "mary",
    "pedro",
    "george",
    "lloyd",
    "mike",
    "pascal",
    "dan",
    "harry"
];

process.stdin.on('data', function (chunk) {
    lines = chunk.toString().split("\n");
    for (var i = 0; i < lines.length; i++) {
        db.log_message("fake.host", "noroom", names[Math.floor(Math.random() * names.length)], lines[i]);
    }
    console.log("processed " + lines.length + " lines...");
});
process.stdin.resume();
