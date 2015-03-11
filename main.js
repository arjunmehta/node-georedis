var geohash = require('ngeohash');

var query = require('./lib/query');
var range = require('./lib/range');

var core = new Set();

// var rangeDepth = query.rangeDepth,
//     getQueryRangesFromBitDepth = query.getQueryRangesFromBitDepth,
//     queryByRanges = query.queryByRanges,
//     queryByRangesWithValues = query.queryByRangesWithValues;


function Set(opts) {

    opts = opts || {};

    this.client = opts.client;
    this.zset = opts.zset || 'geo:locations';
    this.caching = opts.cache !== undefined ? opts.cache : false;

    this.sets = {};
}

Set.prototype.initialize = function(redis_client, opts) {

    opts = opts || {};

    this.client = redis_client;
    this.zset = opts.zset ? opts.zset : (this.zset ? this.zset : 'geo:locations');

    return this;
};

Set.prototype.addSet = function(set_name) {
    return new Set({
        client: this.client,
        zset: this.zset + ':' + set_name
    });
};

Set.prototype.addLocation = function(location_name, lat, lon, callBack) {

    this.client.zadd(this.zset, geohash.encode_int(lat, lon, 52), location_name, callBack);
};

Set.prototype.addLocations = function(location_array, callBack) {

    var args = [];

    for (var i = 0; i < location_array.length; i++) {
        args.push(geohash.encode_int(location_array[i][0], location_array[i][1], 52));
        args.push(location_array[i][2]);
    }

    args.unshift(this.zset);
    // console.log("ZADD LOCATIONS", args);
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

    var ranges = range(lat, lon, radius, this.caching);
    query(this, ranges, opts.values, callBack);
};

module.exports = exports = new Set();
