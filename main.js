var geohash = require('ngeohash');

var query = require('./lib/query');
var range = require('./lib/range');

var queryByRanges = query.queryByRanges;

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

Set.prototype.addLocation = function(location_name, coordinate, callBack) {
    this.client.zadd(this.zset, geohash.encode_int(coordinate.latitude, coordinate.longitude, 52), location_name, callBack);
};

Set.prototype.addLocations = function(location_set, callBack) {

    var args = [];
    var location_ame;
    var location;

    for (location_ame in location_set) {
        location = location_set[location_ame];
        args.push(geohash.encode_int(location.latitude, location.longitude, 52));
        args.push(location_ame);
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

Set.prototype.nearby = function(point, radius, opts, callBack) {

    var ranges;

    if (typeof opts === 'function' && callBack === undefined) {
        callBack = opts;
        opts = {};
    }

    ranges = range(point.latitude, point.longitude, radius, this.caching);
    queryByRanges(this, ranges, opts.withCoordinates, callBack);
};

Set.prototype.getQueryCache = function(lat, lon, radius) {
    return range(lat, lon, radius, false);
};

Set.prototype.nearbyWithQueryCache = function(ranges, opts, callBack) {

    if (typeof opts === 'function' && callBack === undefined) {
        callBack = opts;
        opts = {};
    }

    queryByRanges(this, ranges, opts.withCoordinates, callBack);
};


// helpers

function randomId() {
    return '' + (~~(Math.random() * 1000000000000)).toString(36) + (setIdCount++);
}


module.exports = exports = new Set();
