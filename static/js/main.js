$(document).ready(function() {
  var linkRegex = /(?:https?:\/\/)(?:[\da-z\.-]+)\.(?:[a-z\.]{2,6})(?:[\/\w\.-]*)*\/?(?:#[\w\d=\/\.-]+)?(?:\?[_\-\.=&%\w\d=;]+)?/g;

  var markupTable = {
    0x02: "b",
    0x11: "tt",
    0x1d: "i",
    0x1f: "ul"

  };

  function formatMessage(who, msg) {
    // entity encode
    msg = $("<div/>").text(msg).html();

    // make links clickable
    msg = msg.replace(linkRegex, function (match) {
      return '<a href="' + match + '">' + match + "</a>";
    });

    // color highlight messages
    var openTags = [ ];
    var msgbuf = "";
    function closeTags(until) {
      while (openTags.length) {
        var t = openTags.pop();
        msgbuf += "</" + t + ">";
        if (until && until == t) break;
      }
    }
    function isOpen(t) {
      for (var i=0; i < openTags.length; i++) if (openTags[i] == t) return true;
      return false;
    }
    function openTag(t) {
      msgbuf += "<" + t + ">";
      openTags.push(t);
    }
    for (var i =0; i < msg.length; i++) {
      if (markupTable.hasOwnProperty(msg.charCodeAt(i))) {
        var t = markupTable[msg.charCodeAt(i)];
        if (isOpen(t)) closeTags(t);
        else openTag(t);
      } else if (msg.charCodeAt(i) == 0x0f) {
        closeTags();
      } else if (msg.charCodeAt(i) == 0x03) {
        if (isOpen('span')) closeTags('irc');

        // span coloring!
        var color = undefined;
        if (msg.charCodeAt(i+1) >= 0x30 &&  msg.charCodeAt(i+1) <= 0x39) {
          if (msg.charCodeAt(i+2) >= 0x30 &&  msg.charCodeAt(i+2) <= 0x39) {
            color = parseInt(msg.substr(i+1,2), 10);
            i += 2;
          } else {
            color = parseInt(msg.substr(i+1,1), 10);
            i += 1;
          }
        }
        if (color != undefined && color >= 0 && color <= 15) {
          msgbuf += "<span class=\"clr_" + color.toString() + "\">";
          openTags.push("span");
        }
      } else if (msg.charCodeAt(i) < 32 && msg.charCodeAt(i) != 1) {
        // uh oh, unknown control code!  add a question mark to output
        msgbuf += "?(" + msg.charCodeAt(i) + ")";
      } else {
        msgbuf += msg.charAt(i);
      }
    }
    closeTags();
    msg = msgbuf;

    // is this an action?
    if (msg.length >= 10 && msg.charCodeAt(0) == 1 && msg.charCodeAt(msg.length - 1) == 1
        & msg.substr(1,6) == "ACTION")
    {
      return "<div class=\"action\">*<span class=\"who\">" + who + "</span><span class=\"utt\">" + msg.substr(8, msg.length - 9) + "</span></div>";
    }
    else
    {
      return "<span class=\"who\">" + who + ":</span><span class=\"utt\">" + msg + "</span>";
    }
  }

  function setButtons(first_id, last_id, phrase) {
    var first = parseInt($("table.logdisplay tr:first-child").attr("mid"));
    var last = parseInt($("table.logdisplay tr:last-child").attr("mid"));

    if (last !== undefined && last !== 0) {
      var bottomButt = $("#templates .button.bottom").clone();
      bottomButt.find("b").text(first < last ? "newer" : "older");
      bottomButt.attr("mid", last+30);
      bottomButt.appendTo($("#logview .logdisplay"));
    }

    if (first !== undefined && first !== 0) {
      var bottomButt = $("#templates .button.top").clone();
      bottomButt.find("b").text(first < last ? "older" : "newer");
      bottomButt.attr("mid", first+1);
      bottomButt.prependTo($("#logview .logdisplay"));
    }

    $("#logview .button").click(function() {
      // if it's got a phrase, then it's a search, otherwise it's
      // a browse
      var mid = $(this).attr("mid");
      var hashBits = location.hash.split("/");
      location.hash = "#browse/" + hashBits[1] + "/" + hashBits[2] + "/" + mid;
    });
  }

  function showWaiting() {
    $("#logview .logdisplay").hide();
    $("#logview .waiting").show();
  }

  function showLogs() {
    $("#logview .waiting").fadeOut(300, function() {
      $("#logview .logdisplay").show();
    });
  }

  var colors = {};
  var colorsUsed = 2;

  function colorPerson(who) {
    if (colors[who]) return colors[who];
    // recycle
    if (colorsUsed >= 16) colorsUsed = 2;
    // skip yellow
    if (colorsUsed == 8) colorsUsed++;
    colors[who] = 'clr_' + colorsUsed++;
    return colors[who];
  }

  function renderLogs(data, chrono) {
    function clickToContext() {
      var hashBits = location.hash.split("/");
      location.hash = "#show/" + hashBits[1] + "/" + hashBits[2] + "/" + $(this).attr("mid");
    }
    var lt = $("#templates .log");
    $(".logdisplay").empty();
    for (var i = 0; i < data.length; i++) {
      var l = lt.clone();
      l.attr("mid", data[i].id);
      l.find(".time").text($.timeago(new Date(1000 * data[i].ts)));
      l.find(".what").html(formatMessage(data[i].who, data[i].msg));
      l.find(".who").addClass(colorPerson(data[i].who));
      l.click(clickToContext);
      if (i % 2) l.addClass("odd");
      if (chrono) l.prependTo($(".logdisplay"));
      else l.appendTo($(".logdisplay"));
    }
    // now go through and colorize people in messages
    $(".logdisplay td.what span.utt").each(function(e) {
      var x = $(this).html();
      for (var i in colors) {
        if (!colors.hasOwnProperty(i)) continue;
        var re = new RegExp("([ ]|^)" + i + "(?=[: ,\"]|$)");
        var rep = '$1<span class="' + colorPerson(i) + '">' + i + "</span>";
        x = x.replace(re, rep);
      }
      $(this).html(x);
    });
  }

  function showError(str) {
    alert(str);
  }

  function browse(host, room, before) {
    $("body > div").hide();
    $("body > div#logview").show();
    $("#logview .header .currentHost").text(host);
    $("#logview .header .currentRoom").text("#" + room);
    if (typeof host !== 'string' || typeof room !== 'string') {
      location.hash = "";
      return;
    }
    var path = "/api/utterances/" +
      encodeURIComponent(host) + "/" +
      encodeURIComponent(room) +
      (typeof before === 'string' ? ("?before=" +  encodeURIComponent(before)) : "");

    showWaiting();
    $.ajax({
      url: path,
      dataType: "json",
      success: function(data) {
        renderLogs(data, true);
        showLogs();

        // now let's set up buttons
        setButtons(data[0].id, data[data.length - 1].id, undefined);
      },
      error: function(jqXHR, textStatus, err) {
        showError("problem fetching logs for " + host + " #" + room + ": " + err);
      }
    });
  }

  function show(host, room, item) {
    $("body > div").hide();
    $("body > div#logview").show();
    $("#logview .header .currentHost").text(host);
    $("#logview .header .currentRoom").text("#" + room);
    if (typeof host !== 'string' || typeof room !== 'string') {
      location.hash = "";
      return;
    }
    var path = "/api/context/" +
      encodeURIComponent(host) + "/" +
      encodeURIComponent(room) + "/" +
      encodeURIComponent(item) + "?num=8";

    showWaiting();
    $.ajax({
      url: path,
      dataType: "json",
      success: function(data) {
        renderLogs(data, true);
        $(".logdisplay .log[mid='"+item+"']").addClass("theOne");
        showLogs();
        setButtons(data[0].id, data[data.length - 1].id, undefined);
      },
      error: function(jqXHR, textStatus, err) {
        showError("problem fetching logs for " + host + " #" + room + ": " + err);
      }
    });
  }

  function search(host, room, phrase, before) {
    $("body > div").hide();
    $("body > div#logview").show();
    $("#logview .header .currentHost").text(host);
    $("#logview .header .currentRoom").text("#" + room);
    if (typeof host !== 'string' || typeof room !== 'string') {
      location.hash = "";
      return;
    }
    var path = "/api/search/" +
      encodeURIComponent(host) + "/" +
      encodeURIComponent(room) + "/" +
      encodeURIComponent(phrase) +
      (typeof before === 'string' ? ("?before=" + before) : "");

    showWaiting();
    $.ajax({
      url: path,
      dataType: "json",
      success: function(data) {
        renderLogs(data, false);
        showLogs();
      },
      error: function(jqXHR, textStatus, err) {
        showError("problem fetching logs for " + host + " #" + room + ": " + err);
      }
    });
  }

  function mainPage() {
    $("body > div").hide();
    $("#homescreen").fadeIn(500);
    $.ajax({
      url: '/api/logs',
      dataType: "json",
      success: function(data) {
        $(".roomlist").empty();

        // sort roomlist by latest comments
        data = data.sort(function(a,b) { return b.latest - a.latest; });

        for (var i = 0; i < data.length; i++) {
          var rn = $("#templates tr.room").clone();
          rn.find(".updated").text($.timeago(new Date(1000 * data[i].latest)));
          rn.find(".host").text(data[i].host);
          rn.find(".room").text("#" + data[i].room);
          rn.find(".activity").text(data[i].thisMonth + " messages this month");
          rn.click(function() {
            location.hash = "#browse/"
              + ($(this).find(".host").text()) + "/"
              + ($(this).find(".room").text().substr(1))
          });
          $(".roomlist").append(rn);
        }
      },
      error: function(jqXHR, textStatus, err) {
        showError("Error fetching room list: " + err);
      }
    });
  }

  function load() {
    var hash = $.trim(location.hash);
    var elems = hash.split('/');
    if (elems[0] === "" || elems[0] === "#home") {
      mainPage();
    } else {
      $("#github_ribbon").fadeOut(500);
      if (elems[0] === "#browse") {
        browse.apply(undefined, elems.slice(1));
      } else if (elems[0] === "#show") {
        show.apply(undefined, elems.slice(1));
      } else if (elems[0] === "#search") {
        search.apply(undefined, elems.slice(1));
      }
    }    
  }
  $(window).hashchange(load);
  load();

  $("#logview .home").click(function() { location.hash = ""; });

  $("#logview .doSearch").click(function() {
    var hashBits = location.hash.split("/");
    var phrase = $.trim($("#logview .searchText").val());
    location.hash = "#search/" + hashBits[1] + "/" + hashBits[2] + "/" + phrase;
  });
  $('#logview .searchText').keypress(function(e){
    if(e.which == 13) {
      e.preventDefault();
      $('#logview .doSearch').click();
    }
  });
});
