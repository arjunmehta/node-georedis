var geohash = require('ngeohash');
var geolib = require('geolib');

var helper = require('./util/helper');

var query = require('./query');
var range = require('./range');

var convertUnitsFromMeters = helper.convertUnitsFromMeters;
var convertUnitsToMeters = helper.convertUnitsToMeters;
var buildObjectFromKeyedArray = helper.buildObjectFromKeyedArray;
var buildObjectFromStringArray = helper.buildObjectFromStringArray;


// emulated interface constructor

function EmulatedInterface(client) {
    this.client = client;
}


// Native Geo Commands

EmulatedInterface.prototype.geoadd = function(locationName, point, zSetName, callBack) {
    this.client.zadd(zSetName, geohash.encode_int(point.latitude, point.longitude, 52), locationName, callBack);
};

EmulatedInterface.prototype.geoadd_multi = function(locationSet, zSetName, callBack) {
    var argArray = [zSetName];
    var locationName;
    var location;

    for (locationName in locationSet) {
        location = locationSet[locationName];
        argArray.push(geohash.encode_int(location.latitude, location.longitude, 52), locationName);
    }

    this.client.zadd(argArray, callBack);
};

EmulatedInterface.prototype.geodist = function(locationA, locationB, units, zSetName, callBack) {

    var multi = this.client.multi();
    var pointA;
    var pointB;
    var distance;

    multi.zscore(zSetName, locationA);
    multi.zscore(zSetName, locationB);

    multi.exec(function(err, replies) {

        if (err) {
            callBack(err, null);
        } else {

            pointA = geohashDecode(replies[0]);
            pointB = geohashDecode(replies[1]);

            distance = geolib.getDistance(pointA, pointB, 1);
            distance = convertUnitsFromMeters(units, distance);

            callBack(null, distance);
        }
    });
};

EmulatedInterface.prototype.geohash = function(member, zSetName, callBack) {

    var point;
    var hash;

    this.client.zscore(zSetName, member, function(err, result) {
        if (err) {
            callBack(err, null);
        } else {
            if (result !== null) {
                point = geohashDecode(result);
                hash = geohash.encode(point.latitude, point.longitude);
            } else {
                hash = null;
            }
            callBack(null, hash);
        }
    });
};

EmulatedInterface.prototype.geohashes = function(members, zSetName, callBack) {

    var locationSet = {};
    var point;
    var i;
    var multi = this.client.multi();

    for (i = 0; i < members.length; i++) {
        multi.zscore(zSetName, members[i]);
    }

    multi.exec(function(err, replies) {

        if (err) {
            callBack(err, null);
        } else {

            for (i = 0; i < replies.length; i++) {
                if (replies[i] !== null) {
                    point = geohashDecode(replies[i]);
                    locationSet[members[i]] = geohash.encode(point.latitude, point.longitude);
                } else {
                    locationSet[members[i]] = null;
                }
            }

            callBack(null, locationSet);
        }
    });
};

EmulatedInterface.prototype.geopos = function(member, zSetName, callBack) {

    var location;

    this.client.zscore(zSetName, member, function(err, result) {
        if (err) {
            callBack(err, null);
        } else {
            if (result !== null) {
                location = geohashDecode(result);
            } else {
                location = null;
            }
            callBack(null, location);
        }
    });
};

EmulatedInterface.prototype.geopos_multi = function(members, zSetName, callBack) {

    var locationSet = {};
    var i;
    var multi = this.client.multi();

    for (i = 0; i < members.length; i++) {
        multi.zscore(zSetName, members[i]);
    }

    multi.exec(function(err, replies) {

        if (err) {
            callBack(err, null);
        } else {

            for (i = 0; i < replies.length; i++) {
                if (replies[i] !== null) {
                    locationSet[members[i]] = geohashDecode(replies[i]);
                } else {
                    locationSet[members[i]] = null;
                }
            }

            callBack(null, locationSet);
        }
    });
};

EmulatedInterface.prototype.georadius = function(point, radius, options, zSetName, callBack) {
    options.accurate = true;
    this.nearby(point, radius, options, zSetName, callBack);
};

EmulatedInterface.prototype.georadiusbymember = function(member, radius, options, zSetName, callBack) {
    options.accurate = true;
    this.nearbymember(member, radius, options, zSetName, callBack);
};

EmulatedInterface.prototype.nearby = function(point, distance, options, zSetName, callBack) {

    var ranges;
    var count = options.count;
    var units = options.units || 'm';
    var accurate = options.accurate;
    var withValues = (accurate || options.withDistances || options.withCoordinates || options.withHashes || options.order) ? true : false;

    distance = convertUnitsToMeters(units, distance);

    ranges = range(point.latitude, point.longitude, distance, accurate);

    query(this.client, zSetName, ranges, withValues, function(err, locations) {

        if (!err) {
            if (withValues === true) {
                locations = processLocations(locations, point, distance, options, callBack);
            } else {

                if (typeof count === 'number') {
                    locations = locations.slice(0, count);
                }

                Object.defineProperty(locations, 'locationSet', {
                    get: function() {
                        return buildObjectFromStringArray(this);
                    }
                });
            }

            callBack(null, locations);
        } else {
            callBack(err, null);
        }
    });
};

EmulatedInterface.prototype.nearbymember = function(locationName, distance, options, zSetName, callBack) {

    var self = this;

    this.geopos([locationName], zSetName, function(err, location) {
        if (!err) {
            if (location === null) {
                callBack(new Error('ERR could not decode requested zset member'), null);
            } else {
                self.nearby(location, distance, options, zSetName, callBack);
            }
        } else {
            callBack(err, null);
        }
    });
};


// Native Ordered Set Commands

EmulatedInterface.prototype.del = function(zSetName, callBack) {
    this.client.del(zSetName, callBack);
};

EmulatedInterface.prototype.zrem = function(locations, zSetName, callBack) {
    var argsArray = [zSetName].concat(locations);
    this.client.zrem(argsArray, callBack);
};


function processLocations(locationSetOriginal, point, queryDistance, options, callBack) {

    var locations = [];

    var units = options.units || 'm';
    var withDistances = options.withDistances;
    var withCoordinates = options.withCoordinates;
    var withHashes = options.withHashes;
    var order = options.order;
    var count = options.count;
    var accurate = options.accurate;

    var locationName;
    var location;
    var distance;

    if (order) {

        locations = orderResults(locationSetOriginal, point, queryDistance, withDistances, withCoordinates, withHashes, order, accurate, units);

    } else {

        for (locationName in locationSetOriginal) {

            location = locationSetOriginal[locationName];

            if (accurate === true) {
                
                distance = geolib.getDistance(point, location, 1);
                if (distance > queryDistance) {
                    continue;
                }
                location.distance = convertUnitsFromMeters(units, distance);

            } else if (withDistances === true) {
                distance = geolib.getDistance(point, location, 1);
                location.distance = convertUnitsFromMeters(units, distance);
            }

            if (withHashes === true) {
                location.hash = geohash.encode_int(location.latitude, location.longitude, 52);
            }

            location.key = locationName;
            locations.push(location);
        }
    }

    if (typeof count === 'number') {
        locations = locations.slice(0, count);
    }

    Object.defineProperty(locations, 'locationSet', {
        get: function() {
            return buildObjectFromKeyedArray(this);
        }
    });

    return locations;
}


function orderResults(locationSetOriginal, point, queryDistance, withDistances, withCoordinates, withHashes, order, accurate, units) {

    var orderedLocations = geolib.orderByDistance(point, locationSetOriginal);
    var location;
    var i;

    if (accurate) {
        for (i = orderedLocations.length - 1; i > -1; i--) {
            if (orderedLocations[i].distance > queryDistance) {
                orderedLocations = orderedLocations.slice(0, i);
                break;
            }
        }
    }

    if (withHashes) {
        for (i = 0; i < orderedLocations.length; i++) {
            location = orderedLocations[i];
            location.hash = geohash.encode_int(location.latitude, location.longitude, 52);
        }
    }

    if (units !== 'm') {
        for (i = 0; i < orderedLocations.length; i++) {
            location = orderedLocations[i];
            location.distance = convertUnitsFromMeters(units, location.distance);
        }
    }

    if (order === 'DESC') {
        orderedLocations = orderedLocations.reverse();
    }

    return orderedLocations;
}

function geohashDecode(hash) {

    var decoded;
    var latlon;

    if (hash !== null) {

        latlon = geohash.decode_int(hash, 52);

        decoded = {
            latitude: latlon.latitude,
            longitude: latlon.longitude
        };

    } else {

        decoded = {
            latitude: null,
            longitude: null
        };
    }

    return decoded;
}


module.exports = EmulatedInterface;
