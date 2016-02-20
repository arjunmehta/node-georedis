var NativeInterface = require('./lib/interfaceNative');
var EmulatedInterface = require('./lib/interfaceEmulated');

var randomId = require('./lib/util/helper').randomId;

var nativeCommands = ['info', 'geoadd', 'geohash', 'geopos', 'geodist', 'georadius', 'georadiusbymember'];


// main constructor

function Set(options) {
    options = options || {};
    this.zset = options.zset || 'geo:locations';
    this.clientInterface = options.clientInterface;
}


// initialization

Set.prototype.initialize = function(redisClient, options) {
    options = options || {};

    this.clientInterface = new EmulatedInterface(redisClient);
    this.zset = options.zset ? options.zset : 'geo:locations';

    checkNativeInterface(this, redisClient, options.nativeGeo);

    return this;
};


// managing sets

Set.prototype.addSet = function(setName) {
    return new Set({
        zset: this.zset + ':' + (setName || 'subset_' + randomId()),
        clientInterface: this.clientInterface
    });
};

Set.prototype.deleteSet = function(setName, callBack) {
    this.clientInterface.del(this.zset + ':' + setName, callBack);
};

Set.prototype.delete = function(callBack) {
    this.clientInterface.del(this.zset, callBack);
};


// adding locations

Set.prototype.addLocation = function(locationName, point, callBack) {
    this.clientInterface.geoadd(locationName, point, this.zset, callBack);
};

Set.prototype.addLocations = function(locationSet, callBack) {
    this.clientInterface.geoadd_multi(locationSet, this.zset, callBack);
};


// Calculations

Set.prototype.distance = function(locationNameA, locationNameB, options, callBack) {

    if (typeof options === 'function') {
        callBack = options;
        options = {};
    } else {
        options = options || {};
    }

    this.clientInterface.geodist(locationNameA, locationNameB, options.units, this.zset, callBack);
};


// updating locations (same methods as add, existing locations get updated)

Set.prototype.updateLocation = Set.prototype.addLocation;

Set.prototype.updateLocations = Set.prototype.addLocations;


// removing locations

Set.prototype.removeLocation = function(locationName, callBack) {
    this.clientInterface.zrem([locationName], this.zset, callBack);
};

Set.prototype.removeLocations = function(locationNameArray, callBack) {
    this.clientInterface.zrem(locationNameArray, this.zset, callBack);
};


// querying location positions

Set.prototype.location = function(locationName, callBack) {
    this.clientInterface.geopos([locationName], this.zset, callBack);
};

Set.prototype.locations = function(locationNameArray, callBack) {
    this.clientInterface.geopos_multi(locationNameArray, this.zset, callBack);
};


// querying location geohashes

Set.prototype.getGeohash = function(locationName, callBack) {
    this.clientInterface.geohash([locationName], this.zset, callBack);
};

Set.prototype.getGeohashes = function(locationNameArray, callBack) {
    this.clientInterface.geohashes(locationNameArray, this.zset, callBack);
};


// querying nearby locations

Set.prototype.radius = function(location, radius, options, callBack) {

    if (typeof options === 'function') {
        callBack = options;
        options = {};
    } else {
        options = options || {};
    }

    if (typeof location === 'string') {
        this.clientInterface.georadiusbymember(location, radius, options, this.zset, callBack);
    } else {
        this.clientInterface.georadius(location, radius, options, this.zset, callBack);
    }

};

Set.prototype.nearby = function(location, distance, options, callBack) {

    if (typeof options === 'function') {
        callBack = options;
        options = {};
    } else {
        options = options || {};
    }

    if (typeof location === 'string') {
        this.clientInterface.nearbymember(location, distance, options, this.zset, callBack);
    } else {
        this.clientInterface.nearby(location, distance, options, this.zset, callBack);
    }
};


// helpers

function checkNativeInterface(set, client, nativeGeo) {

    if (client.send_command) {

        if (nativeGeo === undefined) {

            try {
                client.send_command('command', nativeCommands, function(err, response) {

                    if (!err) {
                        if (Array.isArray(response) && Array.isArray(response[0]) && response[0][0] === 'geoadd') {
                            set.clientInterface = new NativeInterface(client);
                        }
                    }
                });
            } catch (err) {
                // silent handling of error if there is one.
            }

        } else if (nativeGeo === true) {
            set.clientInterface = new NativeInterface(client);
        }
    }
}


module.exports = exports = new Set();
