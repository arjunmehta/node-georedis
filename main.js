var geohash = require('ngeohash');

var query = require('./lib/query'),
    queryByRanges = query.queryByRanges,
    location = query.location,
    locations = query.locations;

var range = require('./lib/range');

var setIdCount = 0;


// main constructor

function Set(opts) {

    opts = opts || {};

    this.client = opts.client;
    this.zset = opts.zset || 'geo:locations';
    this.caching = opts.cache !== undefined ? opts.cache : false;
}


// initialization and new sets

Set.prototype.initialize = function(redis_client, opts) {

    opts = opts || {};

    this.client = redis_client;
    this.zset = opts.zset ? opts.zset : (this.zset ? this.zset : 'geo:locations');

    return this;
};

Set.prototype.addSet = function(set_name) {
    return new Set({
        client: this.client,
        zset: this.zset + ':' + (set_name || 'subset_' + randomId())
    });
};

Set.prototype.deleteSet = function(set_name, callBack) {
    this.client.del(this.zset + ':' + set_name, callBack);
};

Set.prototype.delete = function(callBack) {
    this.client.del(this.zset, callBack);
};


// adding locations

Set.prototype.addLocation = function(lat, lon, location_name, callBack) {
    this.client.zadd(this.zset, geohash.encode_int(lat, lon, 52), location_name, callBack);
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


// updating locations (same methods as add, existing locations get updated)

Set.prototype.updateLocation = Set.prototype.addLocation;

Set.prototype.updateLocations = Set.prototype.addLocations;


// removing locations

Set.prototype.removeLocation = function(location_name, callBack) {
    this.client.zrem(this.zset, location_name, callBack);
};

Set.prototype.removeLocations = function(location_name_array, callBack) {
    location_name_array.unshift(this.zset);
    this.client.zrem(location_name_array, callBack);
};


// querying location positions

Set.prototype.location = function(location_name, callBack) {
    query.location(this, location_name, callBack);
};

Set.prototype.locations = function(location_name_array, callBack) {
    query.locations(this, location_name_array, callBack);
};


// querying nearby locations

Set.prototype.nearby = function(lat, lon, radius, opts, callBack) {

    if (typeof opts === 'function' && callBack === undefined) {
        callBack = opts;
        opts = {};
    }

    var ranges = range(lat, lon, radius, this.caching);
    queryByRanges(this, ranges, opts.values, callBack);
};

Set.prototype.getQueryCache = function(lat, lon, radius) {
    return range(lat, lon, radius, false);
};

Set.prototype.nearbyWithQueryCache = function(ranges, opts, callBack) {

    if (typeof opts === 'function' && callBack === undefined) {
        callBack = opts;
        opts = {};
    }

    queryByRanges(this, ranges, opts.values, callBack);
};


// helpers

function randomId() {
    return '' + (~~(Math.random() * 1000000000000)).toString(36) + (setIdCount++);
}


module.exports = exports = new Set();
