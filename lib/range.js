var geohash = require('ngeohash');


var rangeIndex = [
    0.6, // 52
    1, // 50
    2.19, // 48
    4.57, // 46
    9.34, // 44
    14.4, // 42
    33.18, // 40
    62.1, // 38
    128.55, // 36
    252.9, // 34
    510.02, // 32
    1015.8, // 30
    2236.5, // 28
    3866.9, // 26
    8749.7, // 24
    15664, // 22
    33163.5, // 20
    72226.3, // 18
    150350, // 16
    306600, // 14
    474640, // 12
    1099600, // 10
    2349600, // 8
    4849600, // 6
    10018863 // 4
];


function rangeDepth(radius) {
    var i;
    for (i = 0; i < rangeIndex.length - 1; i++) {
        if (radius - rangeIndex[i] < rangeIndex[i + 1] - radius) {
            return 52 - (i * 2);
        }
    }
    return 2;
}

function rangeDepthWide(radius) {
    var i;
    for (i = 0; i < rangeIndex.length - 1; i++) {
        if (rangeIndex[i] > radius) {
            return 52 - (i * 2);
        }
    }
    return 2;
}

function getQueryRangesFromRadius(lat, lon, radius, wide) {
    var rangeBitDepth = (wide === true) ? rangeDepthWide(radius) : rangeDepth(radius);
    return getQueryRangesFromBitDepth(lat, lon, rangeBitDepth, 52);
}

function getQueryRangesFromBitDepth(lat, lon, radiusBitDepth, bitDepth) {

    var hash = geohash.encode_int(lat, lon, radiusBitDepth);
    var neighbors = buildBoxSet(hash, radiusBitDepth);
    var ranges = rangesFromBoxSet(neighbors);

    increaseRangeBitDepth(ranges, radiusBitDepth, bitDepth);

    return ranges;
}

function buildBoxSet(hash, radiusBitDepth) {

    var neighbors = geohash.neighbors_int(hash, radiusBitDepth);

    neighbors.push(hash);
    neighbors.sort();

    if (radiusBitDepth <= 4) {
        neighbors = getUniqueInArray(neighbors);
    }

    return neighbors;
}

function rangesFromBoxSet(neighbors) {

    var ranges = [];
    var lowerRange = 0;
    var upperRange = 0;
    var i;

    for (i = 0; i < neighbors.length; i++) {
        lowerRange = neighbors[i];
        upperRange = lowerRange + 1;
        while (neighbors[i + 1] === upperRange) {
            neighbors.shift();
            upperRange = neighbors[i] + 1;
        }
        ranges.push([lowerRange, upperRange]);
    }

    return ranges;
}

function increaseRangeBitDepth(ranges, radiusBitDepth, bitDepth) {

    var bitDiff = bitDepth - radiusBitDepth;
    var range;
    var i;

    for (i = 0; i < ranges.length; i++) {
        range = ranges[i];
        range[0] = leftShift(range[0], bitDiff);
        range[1] = leftShift(range[1], bitDiff);
    }
}


// helper methods

function leftShift(integer, shft) {
    return integer * Math.pow(2, shft);
}

function getUniqueInArray(arr) {
    var u = {};
    var a = [];
    var i;

    for (i = 0; i < arr.length; ++i) {
        if (u[arr[i]] === 1) {
            continue;
        }
        a.push(arr[i]);
        u[arr[i]] = 1;
    }

    return a;
}


module.exports = exports = getQueryRangesFromRadius;
