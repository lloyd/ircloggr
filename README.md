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

## Testing & Development

I hope you'll find ircloggr simple to hack on.  Here are the steps to get
a local instance up and running:

  1. Install node.js and prerequisites listed above
  2. Copy `config.json.sample` to `config.json` and modify to your tast
  3. start the ircloggr server: `node server/run.js`
  4. start the test harness: `node test/test_server.js
  5. point your browser at http://localhost:60000/

The "test server" in step four is basically a tiny little web server
that serves up the files in /static at root, and proxies requests to
/api/* to the ircloggr [web services api](blob/master/WSAPI.md).  It
simulates the role that nginx or another webserver/reverse proxy
server might play during deployment.

## Deployment

One way to deploy the server is behind an nginx reverse proxy.
nginx can handle response compression, and caching (TODO).  Here's
a sample nginx configuration

    http {
        include       mime.types;

        gzip  on;
        gzip_proxied any;
        gzip_types text/html application/json application/x-javascript text/css;

        server {
            listen       80;
            server_name  irclog.gr;

            location / {
                root   /home/http/ircloggr/static;
                index  index.html;
            }

            location = /api/code_update {
                internal;
            }

            location /api/ {
                proxy_pass        http://127.0.0.1:51432/;
                proxy_set_header  X-Real-IP  $remote_addr;
            }
        }
    }

