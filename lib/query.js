var geohash = require('ngeohash');


function queryByRanges(client, zSetName, ranges, withValues, callBack) {

    var multi;

    if(typeof client.batch === 'function') {
        multi = client.batch();
    } else {
        multi = client.multi();
    }

    if (withValues !== true) {
        buildMultiWithoutValues(ranges, zSetName, multi);
    } else {
        buildMultiWithValues(ranges, zSetName, multi);
    }

    multi.exec(function(err, replies) {

        if (err) {
            callBack(err, null);
        } else {
            if (withValues) processResultsWithValues(replies, callBack);
            else processResultsWithoutValues(replies, callBack);
        }
    });
}

function buildMultiWithValues(ranges, zSetName, multi) {

    var range = [];
    var i;

    for (i = 0; i < ranges.length; i++) {
        range = ranges[i];
        multi.zrangebyscore(zSetName, range[0], range[1], 'WITHSCORES');
    }
}

function buildMultiWithoutValues(ranges, zSetName, multi) {

    var range = [];
    var i;

    for (i = 0; i < ranges.length; i++) {
        range = ranges[i];
        multi.zrangebyscore(zSetName, range[0], range[1]);
    }
}

function processResultsWithoutValues(replies, callBack) {

    var concatedReplies = [];
    var i;

    for (i = 0; i < replies.length; i++) {
        concatedReplies = concatedReplies.concat(replies[i]);
    }

    callBack(null, concatedReplies);
}

function processResultsWithValues(replies, callBack) {

    var concatedReplies = {};
    var k = 0;
    var i;
    var j;
    var decoded;

    for (i = 0; i < replies.length; i++) {

        for (j = 0; j < replies[i].length; j += 2) {

            decoded = geohash.decode_int(replies[i][j + 1], 52);

            concatedReplies[replies[i][j]] = {
                latitude: decoded.latitude,
                longitude: decoded.longitude
            };

            k++;
        }
    }

    callBack(null, concatedReplies);
}


module.exports = queryByRanges;
