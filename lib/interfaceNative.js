var helper = require('./util/helper');

var buildObjectFromKeyedArray = helper.buildObjectFromKeyedArray;
var buildObjectFromStringArray = helper.buildObjectFromStringArray;


// native interface constructor

function NativeInterface(client) {
    this.client = client;
    console.log('GeoRedis using NATIVE interface.');
}


// Native Geo Commands

NativeInterface.prototype.geoadd = function(locationName, point, zSetName, callBack) {
    this.client.send_command('geoadd', [zSetName, point.longitude, point.latitude, locationName], callBack);
};

NativeInterface.prototype.geoadd_multi = function(locationSet, zSetName, callBack) {

    var argArray = [zSetName];
    var locationName;
    var location;

    for (locationName in locationSet) {
        location = locationSet[locationName];
        argArray.push(location.longitude, location.latitude, locationName);
    }

    this.client.send_command('geoadd', argArray, callBack);
};

NativeInterface.prototype.geodist = function(locationA, locationB, units, zSetName, callBack) {
    this.client.send_command('geodist', [zSetName, locationA, locationB, units || 'm'], function(err, results) {
        if (err) {
            callBack(err, null);
        } else {
            callBack(null, results);
        }
    });
};

NativeInterface.prototype.geohash = function(member, zSetName, callBack) {

    var argArray = [zSetName].concat([member]);

    this.client.send_command('geohash', argArray, function(err, results) {
        if (err) {
            callBack(err, null);
        } else {
            callBack(null, results[0]);
        }
    });
};

NativeInterface.prototype.geohash_multi = function(members, zSetName, callBack) {

    var argArray = [zSetName].concat(members);
    var locationSet = {};
    var i;

    this.client.send_command('geohash', argArray, function(err, results) {
        if (err) {
            callBack(err, null);
        } else {
            for (i = 0; i < results.length; i++) {
                locationSet[members[i]] = {
                    hash: results[i]
                };
            }
            callBack(null, locationSet);
        }
    });
};

NativeInterface.prototype.geopos = function(member, zSetName, callBack) {

    var argArray = [zSetName].concat([member]);
    var location;

    this.client.send_command('geopos', argArray, function(err, results) {
        if (err) {
            callBack(err, null);
        } else {
            if (results[0] !== null) {
                location = {
                    latitude: results[0][1],
                    longitude: results[0][0]
                };
            } else {
                location = null;
            }
            callBack(null, location);
        }
    });
};

NativeInterface.prototype.geopos_multi = function(members, zSetName, callBack) {

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

NativeInterface.prototype.georadius = function(point, radius, options, zSetName, callBack) {
    var argArray = [zSetName].push(point.longitude, point.latitude);
    georadiusGeneric(this.client, 'georadius', argArray, radius, options, callBack);
};

NativeInterface.prototype.georadiusbymember = function(member, radius, options, zSetName, callBack) {
    var argArray = [zSetName].push(member);
    georadiusGeneric(this.client, 'georadiusbymember', argArray, radius, options, callBack);
};

function georadiusGeneric(client, type, argArray, radius, options, callBack) {

    var units = options.units || 'm';
    var withDistances = options.withDistances;
    var withCoordinates = options.withCoordinates;
    var withHashes = options.withHashes;
    var order = options.order;
    var count = options.count;

    argArray.push(radius, units);

    if (withDistances === true) {
        argArray.push('WITHDIST');
    }

    if (withHashes === true) {
        argArray.push('WITHHASH');
    }

    if (withCoordinates === true) {
        argArray.push('WITHCOORD');
    }

    if (order) {
        argArray.push(order === true ? 'ASC' : order);
    }

    if (count) {
        argArray.push('COUNT', count);
    }

    client.send_command(type, argArray, function(err, locations) {

        if (err) {
            callBack(err, null);
        } else {
            if (withCoordinates || withDistances || withHashes) {
                locations = processLocations(locations, withCoordinates, withDistances, withHashes, units);
            } else {
                Object.defineProperty(locations, 'locationSet', {
                    get: function() {
                        buildObjectFromStringArray(this);
                    }
                });
            }

            callBack(null, locations);
        }
    });
}


NativeInterface.prototype.nearby = NativeInterface.prototype.georadius;
NativeInterface.prototype.nearbymember = NativeInterface.prototype.georadiusbymember;


// Native Ordered Set Commands

NativeInterface.prototype.del = function(zSetName, callBack) {
    this.client.del(zSetName, callBack);
};

NativeInterface.prototype.zrem = function(locations, zSetName, callBack) {
    this.client.zrem(zSetName, locations, callBack);
};


function processLocations(results, withCoordinates, withDistances, withHashes, units) {

    var locations = [];
    var location;
    var i;
    var j;

    for (i = 0; i < results.length; i++) {

        j = 1;

        location = {
            key: results[i][0]
        };

        if (withDistances === true) {
            location.distance = results[i][j];
            j++;
        }

        if (withHashes === true) {
            location.hash = results[i][j];
            j++;
        }

        if (withCoordinates === true) {
            location.latitude = results[i][j][1];
            location.longitude = results[i][j][0];
        }

        locations.push(location);
    }

    Object.defineProperty(locations, 'locationSet', {
        get: function() {
            buildObjectFromKeyedArray(this);
        }
    });

    return locations;
}


module.exports = NativeInterface;
