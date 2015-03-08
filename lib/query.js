var geohash = require('ngeohash');
var cache = {};

var rangeIndex = [0.6, //52
    1, //50
    2.19, //48
    4.57, //46
    9.34, //44
    14.4, //42
    33.18, //40
    62.1, //38
    128.55, //36
    252.9, //34
    510.02, //32
    1015.8, //30
    2236.5, //28
    3866.9, //26
    8749.7, //24
    15664, //22
    33163.5, //20
    72226.3, //18
    150350, //16
    306600, //14
    474640, //12
    1099600, //10
    2349600, //8
    4849600, //6
    10018863 //4
];


function rangeDepth(radius) {
    for (var i = 0; i < rangeIndex.length - 1; i++) {
        if (radius - rangeIndex[i] < rangeIndex[i + 1] - radius) {
            return 52 - (i * 2);
        }
    }
    return 2;
}


function checkCache(hash, radiusBitDepth) {
    if (cache[radiusBitDepth][hash] !== undefined) {
        return cache[radiusBitDepth][hash];
    }
    return false;    
}


function getQueryRangesFromBitDepth(lat, lon, radiusBitDepth, bitDepth) {

    var bitDiff = bitDepth - radiusBitDepth;
    if (bitDiff < 0) {
        throw new Error('bitDepth must be high enough to calculate range within radius');
    }

    var hash = geohash.encode_int(lat, lon, radiusBitDepth);
    if (caching === true) {
        var cached = checkCache(lat, lon, radiusBitDepth);
        if (cached !== false) {
            return cached;
        }        
    }

    var i,
        ranges = [],
        range,
        lowerRange = 0,
        upperRange = 0,
        neighbors = geohash.neighbors_int(hash, radiusBitDepth);

    neighbors.push(hash);
    neighbors.sort();

    if (radiusBitDepth <= 4) {
        neighbors = getUniqueInArray(neighbors);
    }

    for (i = 0; i < neighbors.length; i++) {
        lowerRange = neighbors[i];
        upperRange = lowerRange + 1;
        while (neighbors[i + 1] === upperRange) {
            neighbors.shift();
            upperRange = neighbors[i] + 1;
        }
        ranges.push([lowerRange, upperRange]);
    }

    for (i = 0; i < ranges.length; i++) {
        range = ranges[i];
        range[0] = leftShift(range[0], bitDiff);
        range[1] = leftShift(range[1], bitDiff);
    }

    if (caching === true) {
        cache[radiusBitDepth][hash] = ranges;
    }

    return ranges;
}


function queryByRanges(set, ranges, callBack) {

    var i,
        range = [],
        multi = set.client.multi();

    for (i = 0; i < ranges.length; i++) {
        range = ranges[i];
        multi.ZRANGEBYSCORE(set.zset, range[0], range[1]);
    }

    multi.exec(function(err, replies) {
        var concatedReplies = [];
        for (i = 0; i < replies.length; i++) {
            concatedReplies = concatedReplies.concat(replies[i]);
        }
        if (typeof callBack === 'function') callBack(err, concatedReplies);
    });
}


function queryByRangesWithValues(set, ranges, callBack) {

    var i,
        range = [],
        multi = set.client.multi(),
        k = 0,
        decoded;

    for (i = 0; i < ranges.length; i++) {
        range = ranges[i];
        multi.ZRANGEBYSCORE(set.zset, range[0], range[1], 'WITHSCORES');
    }

    multi.exec(function(err, replies) {
        var concatedReplies = [];
        for (i = 0; i < replies.length; i++) {
            for (var j = 0; j < replies[i].length; j += 2) {
                decoded = geohash.decode_int(replies[i][j + 1], 52);
                concatedReplies[k] = [replies[i][j], decoded.latitude, decoded.longitude];
                k++;
            }
        }

        if (typeof callBack === 'function') callBack(err, concatedReplies);
    });
}


// helper methods

function leftShift(integer, shft) {
    return integer * Math.pow(2, shft);
}

function getUniqueInArray(arr) {
    var u = {},
        a = [];

    for (var i = 0; i < arr.length; ++i) {
        if (u[arr[i]] === 1) {
            continue;
        }
        a.push(arr[i]);
        u[arr[i]] = 1;
    }

    return a;
}


module.exports = exports = {
    rangeDepth: rangeDepth,
    getQueryRangesFromBitDepth: getQueryRangesFromBitDepth,
    queryByRanges: queryByRanges,
    queryByRangesWithValues: queryByRangesWithValues
};
