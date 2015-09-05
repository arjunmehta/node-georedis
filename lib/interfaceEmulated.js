var geohash = require('ngeohash');
var geolib = require('geolib');

var query = require('./query');
var range = require('./range');

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
            distance = convertFromMeters(units, distance);

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

EmulatedInterface.prototype.geopos = function(members, zSetName, callBack) {

    var argArray = [zSetName].concat(members);
    var locationSet = {};
    var i;

    this.client.send_command('geopos', argArray, function(err, results) {
        if (err) {
            callBack(err, null);
        } else {
            for (i = 0; i < results.length; i++) {
                if (results[i] !== null) {
                    locationSet[members[i]] = {
                        latitude: results[i][1],
                        longitude: results[i][0]
                    };
                } else {
                    locationSet[members[i]] = null;
                }
            }
            callBack(null, locationSet);
        }
    });
};

EmulatedInterface.prototype.geopos_multi = function(members, zSetName, callBack) {

    var argArray = [zSetName].concat(members);
    var locationSet = {};
    var i;

    this.client.send_command('geopos', argArray, function(err, results) {
        if (err) {
            callBack(err, null);
        } else {
            for (i = 0; i < results.length; i++) {
                if (results[i] !== null) {
                    locationSet[members[i]] = {
                        latitude: results[i][1],
                        longitude: results[i][0]
                    };
                } else {
                    locationSet[members[i]] = null;
                }
            }
            callBack(null, locationSet);
        }
    });
};

EmulatedInterface.prototype.georadius = function(point, radius, options, zSetName, callBack) {
    options.precise = true;
    this.nearby(point, radius, options, zSetName, callBack);
};

EmulatedInterface.prototype.georadiusbymember = function(member, radius, options, zSetName, callBack) {
    options.precise = true;
    this.nearbymember(member, radius, options, zSetName, callBack);
};

EmulatedInterface.prototype.nearby = function(point, distance, options, zSetName, callBack) {

    var ranges;
    var withValues = false;
    var units = options.units || 'm';
    var optionsLength = Object.keys(options).length;

    distance = convertUnitsToMeters(units, distance);

    if ((options.units && optionsLength > 1) || optionsLength > 0) {
        withValues = true;
    }

    ranges = range(point.latitude, point.longitude, distance);

    query(this.client, zSetName, ranges, withValues, function(err, locations) {

        var locationSet = {};

        if (!err) {
            if (withValues === true) {
                locationSet = processLocations(locations, point, distance, options, callBack);
                callBack(null, locationSet);
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
            self.nearby(location, distance, options, zSetName, callBack);
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
    this.client.zrem(zSetName, locations, callBack);
};


function processLocations(locationSetOriginal, point, queryDistance, options, callBack) {

    var locations = [];

    var units = options.units || 'm';
    var withDistances = options.withDistances;
    var withCoordinates = options.withCoordinates;
    var withHashes = options.withHashes;
    var order = options.order;
    var precise = options.precise;

    var locationName;
    var location;
    var distance;

    if (order) {
        locations = orderResults(locationSetOriginal, point, queryDistance, withDistances, withCoordinates, withHashes, order, precise, units);
    } else {

        for (locationName in locationSetOriginal) {

            location = locationSetOriginal[locationName];
            distance = geolib.getDistance(point, location, 1);

            if (precise !== true || distance <= queryDistance) {

                location.key = locationName;
                location.distance = convertFromMeters(units, distance);

                if (withHashes === true) {
                    location.hash = geohash.encode(location.latitude, location.longitude);
                }

                locations.push(location);
            }
        }
    }

    Object.defineProperty(locations, 'locationSet', {
        get: function() {
            buildLocationSetFromArray(this);
        }
    });

    return locations;
}

function orderResults(locationSetOriginal, point, queryDistance, withDistances, withCoordinates, withHashes, order, precise, units) {

    var orderedLocations = geolib.orderByDistance(point, locationSetOriginal);
    var location;
    var i;

    if (precise) {
        for (i = orderedLocations.length - 1; i > -1; i--) {
            location = orderedLocations[i];
            if (location.distance > queryDistance) {
                orderedLocations = orderedLocations.slice(i);
                break;
            }
        }
    }

    if (withHashes) {
        for (i = 0; i < orderedLocations.length; i++) {
            location = orderedLocations[i];
            location.hash = geohash.encode(location.latitude, location.longitude);
        }
    }

    if (order === 'DESC') {
        orderedLocations = orderedLocations.reverse();
    }

    return orderedLocations;
}


function buildLocationSetFromArray(arr) {

    var locationSet = {};
    var location;
    var i;

    for (i = 0; i < arr.length; i++) {
        location = arr[i];
        locationSet[location.key] = location;
    }

    return locationSet;
}

function convertUnitsToMeters(units, distance) {

    switch (units) {
        case 'km':
            distance = distance * 1000;
            break;
        case 'cm':
            distance = distance / 100;
            break;
        case 'mm':
            distance = distance / 1000;
            break;
        case 'ft':
            distance = distance / 3.28084;
            break;
        case 'mi':
            distance = distance * 1609.34;
            break;
        default:
            break;
    }
    return distance;
}

function convertFromMeters(units, distance) {

    switch (units) {
        case 'km':
            distance = distance / 1000;
            break;
        case 'cm':
            distance = distance * 100;
            break;
        case 'mm':
            distance = distance * 1000;
            break;
        case 'ft':
            distance = distance * 3.28084;
            break;
        case 'mi':
            distance = distance / 1609.34;
            break;
        default:
            break;
    }
    return distance;
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
