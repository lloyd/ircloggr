# The RESTful JSON api

*Deployment Note*: you probably want to tuck this node server behind a
reverse caching proxy.  Every effort will be made to put reasonable
cache headers on api responses, and of course, you can configure all
that.  The goal is to push sqlite as far as it can go to keep deployment
simple.  We'll see.


### `/utterances/<host>/<room>?num=<number>&before=<id>`

Get the latest `num` irc messages.  default 30, max 100.  if `before`
is provided, they will be utterances before that with the specified
id.  This api is useful for basic display and pagination.

Response:

    array {
      object {
        integer id; // host+room numeric unique utterance identifier
        integer ts; // time since unix epoch in UTC
        string who; // who spake?
        string msg; // what did they say?
      }
    };

### `/context/<host>/<room>/<id>?num=<number>`

Get an uttrance and its context: <number> before it, and <number>
after it.  number defaults to 15, max 50.  This API is useful for
linking to specific utterances.

Response:

  same as `/utterances/' response

### `/search/<host>/<room>/<text>?num=<number>&before=<id>`

Search utterances, returning a max of `<number>` (default 30), occuring before utterance with <id>.

Response:

  same as `/utterances/' response

