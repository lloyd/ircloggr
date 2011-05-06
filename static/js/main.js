$(document).ready(function() {
    function showWaiting() {
        $("#logview .logdisplay").hide();
        $("#logview .waiting").show();
    }

    function showLogs() {
        $("#logview .waiting").fadeOut(300, function() {
            $("#logview .logdisplay").show();
        });
    }

    function renderLogs(data) {
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
            l.find(".who span").text(data[i].who);
            l.find(".what").text(data[i].msg);
            l.click(clickToContext);
            if (i % 2) l.addClass("odd");
            l.appendTo($(".logdisplay"));
            console.log(data[i].who);
        }
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
            (typeof before === 'string' ? ("/" +  encodeURIComponent(before)) : "");

        showWaiting();
        $.ajax({
            url: path,
            dataType: "json",
            success: function(data) {
                renderLogs(data);
                showLogs();
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
            encodeURIComponent(item) + "?num=15";

        showWaiting();
        $.ajax({
            url: path,
            dataType: "json",
            success: function(data) {
                renderLogs(data);
                $(".logdisplay .log[mid='"+item+"']").addClass("theOne");
                showLogs();
            },
            error: function(jqXHR, textStatus, err) {
                showError("problem fetching logs for " + host + " #" + room + ": " + err);
            }
        });
    }

    function search(host, room, before) {
    }

    function mainPage() {
        $("body > div").hide();
        $("#homescreen").fadeIn(500);
        console.log("foo");
        $.ajax({
            url: '/api/logs',
            dataType: "json",
            success: function(data) {
                console.log(data);
                $(".roomlist").empty();
                $(".howmany").text(data.length);
                for (var i = 0; i < data.length; i++) {
                    var rn = $("#templates > .room").clone();
                    rn.find(".host").text(data[i].host);
                    rn.find(".room").text("#" + data[i].room);
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
        console.log("hashchange: " + location.hash);
        var hash = $.trim(location.hash);
        var elems = hash.split('/');
        if (elems[0] === "" || elems[0] === "#home") {
            mainPage();
        } else if (elems[0] === "#browse") {
            browse.apply(undefined, elems.slice(1));
        } else if (elems[0] === "#show") {
            show.apply(undefined, elems.slice(1));
        } else if (elems[0] === "#search") {
            search.apply(undefined, elems.slice(1));
        }
    }
    $(window).hashchange(load);
    load();

    $("#logview .home").click(function() { location.hash = ""; });
});