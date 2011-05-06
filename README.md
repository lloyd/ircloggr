ircloggr is a irc logging system.  it includes a bot that connects to
servers and rooms you specify in a config file, and a RESTful JSON API
that you may use to extract and search logs.  Also bundled is a sample
client website that can render logs.

The whole damn thing is self contained (sqlite), runs in a single process,
and is built with node.js.

## Software Prerequisites

  * node.js (0.4.7 is the hotness)
  * connect (>= 1.4.0) `npm install connect`
  * irc (>= 0.2.0) `npm install irc`
  * sqlite (>= 1.0.3) `npm install sqlite`
