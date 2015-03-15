var geohash = require('ngeohash');


function location(set, location_name, callBack) {

    set.client.zscore(set.zset, location_name, function(err, reply) {

        if (err) {
            if (typeof callBack === "function") callBack(err, null);
        } else {
            if (typeof callBack === "function") callBack(null, parseLocation(location_name, reply));
        }
    });
}

function locations(set, location_name_array, callBack) {

    var multi = set.client.multi(),
        i;

    for (i = 0; i < location_name_array.length; i++) {
        multi.zscore(set.zset, location_name_array[i]);
    }

    multi.exec(function(err, replies) {

        if (err) {
            if (typeof callBack === "function") callBack(err, null);
        } else {

            var concatedReplies = [];

            for (i = 0; i < replies.length; i++) {
                concatedReplies.push(parseLocation(location_name_array[i], replies[i]));
            }

            if (typeof callBack === 'function') callBack(null, concatedReplies);
        }
    });
}

function parseLocation(location_name, hash) {

    var latlon = geohash.decode_int(hash, 52);

    return {
        name: location_name,
        latitude: latlon.latitude,
        longitude: latlon.longitude
    };
}


function queryByRanges(set, ranges, with_values, callBack) {

    var multi = set.client.multi();

    if (with_values === undefined) {
        buildMultiWithoutValues(ranges, set.zset, multi);
    } else {
        buildMultiWithValues(ranges, set.zset, multi);
    }

    multi.exec(function(err, replies) {

        if (err) {
            if (typeof callBack === 'function') callBack(err, null);
        } else {
            if (with_values) processResultsWithValues(replies, callBack);
            else processResultsWithoutValues(replies, callBack);
        }
    });
}

function buildMultiWithValues(ranges, zset, multi) {
    
    var range = [];

    for (var i = 0; i < ranges.length; i++) {
        range = ranges[i];
        multi.ZRANGEBYSCORE(zset, range[0], range[1], 'WITHSCORES');
    }
}

function buildMultiWithoutValues(ranges, zset, multi) {

    var range = [];

    for (var i = 0; i < ranges.length; i++) {
        range = ranges[i];
        multi.ZRANGEBYSCORE(zset, range[0], range[1]);
    }
}

function processResultsWithoutValues(replies, callBack) {

    var concatedReplies = [];

    for (var i = 0; i < replies.length; i++) {
        concatedReplies = concatedReplies.concat(replies[i]);
    }

    if (typeof callBack === 'function') callBack(null, concatedReplies);
}

function processResultsWithValues(replies, callBack) {

    var concatedReplies = [],
        k = 0,
        decoded;

    for (var i = 0; i < replies.length; i++) {
        for (var j = 0; j < replies[i].length; j += 2) {
            decoded = geohash.decode_int(replies[i][j + 1], 52);
            concatedReplies[k] = [replies[i][j], decoded.latitude, decoded.longitude];
            k++;
        }
    }

    if (typeof callBack === 'function') callBack(null, concatedReplies);
}


module.exports = exports = {
    queryByRanges: queryByRanges,
    location: location,
    locations: locations
};
