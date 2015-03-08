var geohash = require('ngeohash');
var query = require('./lib/query');


var rangeDepth = query.rangeDepth,
    getQueryRangesFromBitDepth = query.getQueryRangesFromBitDepth,
    queryByRanges = query.queryByRanges,
    queryByRangesWithValues = query.queryByRangesWithValues;


function Set(opts) {

    opts = opts || {};

    this.client = opts.client;
    this.zset = opts.zset || 'geo:locations';
    this.sets = {};
}

Set.prototype.initialize = function(redis_client, opts) {
    opts = opts || {};

    this.client = redis_client;
    this.zset = opts.zset ? opts.zset : (this.zset ? this.zset : 'geo:locations');
};

Set.prototype.addSet = function(set_name, callBack) {
    return new Set({
        client: this.client,
        zset: this.zset + ':' + set_name
    });
};

Set.prototype.addLocation = function(location_name, lat, lon, callBack) {
    this.client.zadd(this.zset, geohash.encode_int(lat, lon, 52), key_name, callBack);
};

Set.prototype.addLocations = function(location_array, callBack) {

    var args = [];

    for (var i = 0; i < location_array.length; i++) {
        args.push(geohash.encode_int(location_array[i][0], location_array[i][1], 52));
        args.push(location_array[i][2]);
    }

    args.unshift(this.zset);
    this.client.zadd(args, callBack);
};

Set.prototype.removeLocation = function(location_name, callBack) {
    this.client.zrem(this.zset, location_name, callBack);
};

Set.prototype.removeLocations = function(location_name_array, callBack) {
    location_name_array.unshift(this.zset);
    this.client.zrem(location_name_array, callBack);
};

Set.prototype.location = function(location_name, callBack) {
    // body...
};

Set.prototype.locations = function(location_name_array, callBack) {
    // body...
};

Set.prototype.nearby = function(lat, lon, radius, opts, callBack) {

    if (typeof opts === 'function' && callBack === undefined) {
        callBack = opts;
        opts = {};
    }

    var ranges = getQueryRangesFromBitDepth(lat, lon, rangeDepth(radius), 52);

    if (opts.values) {
        queryByRangesWithValues(this, ranges, callBack);
    } else {
        queryByRanges(this, ranges, callBack);
    }
};


module.exports = new Set();
