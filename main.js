var NativeInterface = require('./lib/interfaceNative');
var EmulatedInterface = require('./lib/interfaceEmulated');

var randomId = require('./lib/util/helper').randomId;

var nativeCommands = ['info', 'geoadd', 'geohash', 'geopos', 'geodist', 'georadius', 'georadiusbymember'];


// main constructor

function GeoSet(options) {
  options = options || {};
  this.zset = options.zset || 'geo:locations';
  this.clientInterface = options.clientInterface;
}


// initialization

GeoSet.prototype.initialize = function(redisClient, options) {
  options = options || {};

  this.clientInterface = new EmulatedInterface(redisClient);
  this.zset = options.zset ? options.zset : 'geo:locations';

  checkNativeInterface(this, redisClient, options.nativeGeo);

  return this;
};


// managing sets

GeoSet.prototype.addSet = function(setName) {
  return new GeoSet({
    zset: this.zset + ':' + (setName || 'subset_' + randomId()),
    clientInterface: this.clientInterface
  });
};

GeoSet.prototype.deleteSet = function(setName, callBack) {
  this.clientInterface.del(this.zset + ':' + setName, callBack);
};

GeoSet.prototype.delete = function(callBack) {
  this.clientInterface.del(this.zset, callBack);
};


// adding locations

GeoSet.prototype.addLocation = function(locationName, point, callBack) {
  this.clientInterface.geoadd(locationName, point, this.zset, callBack);
};

GeoSet.prototype.addLocations = function(locationSet, callBack) {
  this.clientInterface.geoadd_multi(locationSet, this.zset, callBack);
};


// Calculations

GeoSet.prototype.distance = function(locationNameA, locationNameB, options, callBack) {
  if (typeof options === 'function') {
    callBack = options;
    options = {};
  } else {
    options = options || {};
  }

  this.clientInterface.geodist(locationNameA, locationNameB, options.units, this.zset, callBack);
};


// updating locations (same methods as add, existing locations get updated)

GeoSet.prototype.updateLocation = GeoSet.prototype.addLocation;

GeoSet.prototype.updateLocations = GeoSet.prototype.addLocations;


// removing locations

GeoSet.prototype.removeLocation = function(locationName, callBack) {
  this.clientInterface.zrem([locationName], this.zset, callBack);
};

GeoSet.prototype.removeLocations = function(locationNameArray, callBack) {
  this.clientInterface.zrem(locationNameArray, this.zset, callBack);
};


// querying location positions

GeoSet.prototype.location = function(locationName, callBack) {
  this.clientInterface.geopos([locationName], this.zset, callBack);
};

GeoSet.prototype.locations = function(locationNameArray, callBack) {
  this.clientInterface.geopos_multi(locationNameArray, this.zset, callBack);
};


// querying location geohashes

GeoSet.prototype.getGeohash = function(locationName, callBack) {
  this.clientInterface.geohash([locationName], this.zset, callBack);
};

GeoSet.prototype.getGeohashes = function(locationNameArray, callBack) {
  this.clientInterface.geohashes(locationNameArray, this.zset, callBack);
};


// querying nearby locations

GeoSet.prototype.radius = function(location, radius, options, callBack) {
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

GeoSet.prototype.nearby = function(location, distance, options, callBack) {
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


module.exports = exports = new GeoSet();
