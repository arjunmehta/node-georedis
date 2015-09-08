var geohash = require('ngeohash');
var redis = require('redis');
var client = redis.createClient();

var geo = require('../main.js').initialize(client);

var people;
var places;

var lat = 43.646838,
    lon = -79.403723;

var testPoint = {
    latitude: lat,
    longitude: lon
};

var locationSet = {};

var rangeIndex = [
    0.6, //52
    1, //50
    2.19, //48
    4.57, //46
    9.34, //44
    14.4, //42
    33.18, //40
    62.1, //38
    128.55, //36
    252.9, //34
    510.02, //32
    1015.8, //30
    2236.5, //28
    3866.9, //26
    8749.7, //24
    15664, //22
    33163.5, //20
    72226.3, //18
    150350, //16
    306600, //14
    474640, //12
    1099600, //10
    2349600, //8
    4849600, //6
    10018863 //4
];

var addArray = [];
var startRadius = 0.4;


exports['Exporting OK'] = function(t) {

    client.flushall();

    t.expect(4);

    t.equal(typeof geo === 'object', true);
    t.equal(typeof geo.initialize === 'function', true);
    t.equal(geo.clientInterface.client.constructor.name, 'RedisClient');
    t.equal(geo.zset, 'geo:locations');
    t.done();

};


exports['Location Null'] = function(t) {

    client.flushall();

    t.expect(1);

    geo.location('Toronto', function(err, reply) {
        if (err) throw err;
        t.equal(reply, null);
        t.done();
    });
};


exports['Add Location'] = function(t) {

    client.flushall();

    t.expect(1);


    geo.addLocation('Toronto', {
        latitude: 43.6667,
        longitude: -79.4167
    }, function(err, reply) {
        if (err) throw err;
        t.equal(reply, 1);
        t.done();
    });
};


exports['Add Locations'] = function(t) {

    var locationRange;
    var distance = 0;
    var count = 1;

    client.flushall();

    t.expect(2);

    locationSet = {};
    locationSet['center_0'] = testPoint;

    for (var i = 0; i < 50000; i++) {
        distance = i * (i / 100);
        locationRange = getMinMaxs(lat, lon, distance);

        locationSet['sw_' + distance] = {
            latitude: locationRange.latmin % 85,
            longitude: locationRange.lonmin % 180
        };
        locationSet['nw_' + distance] = {
            latitude: locationRange.latmax % 85,
            longitude: locationRange.lonmin % 180
        };
        locationSet['se_' + distance] = {
            latitude: locationRange.latmin % 85,
            longitude: locationRange.lonmax % 180
        };
        locationSet['ne_' + distance] = {
            latitude: locationRange.latmax % 85,
            longitude: locationRange.lonmax % 180
        };

        count += 4;
    }

    // console.log('adding Location Set', locationSet);

    geo.addLocations(locationSet, function(err, reply) {
        if (err) throw err;
        t.equal(err, null);
        t.equal(count, reply);
        t.done();
    });
};


exports['Get Distance'] = function(t) {

    t.expect(2);

    geo.distance('sw_616696.09', 'center_0', function(err, distance) {
        if (err) throw err;
        t.equal(~~distance, ~~(790439.42387480533));
    });

    geo.distance('sw_616696.09', 'center_0', {
        units: 'ft'
    }, function(err, distance) {
        if (err) throw err;
        t.equal(~~distance, ~~(2593305));
        t.done();
    });
};


exports['Get Location'] = function(t) {

    t.expect(3);

    geo.location('sw_616696.09', function(err, point) {

        if (err) throw err;
        t.equal(err, null);
        t.equal(Math.round(point.latitude * 100), Math.round(locationSet['sw_616696.09'].latitude * 100));
        t.equal(Math.round(point.longitude * 100), Math.round(locationSet['sw_616696.09'].longitude * 100));
        t.done();
    });
};


exports['Get Locations'] = function(t) {

    var locationQuery = [];
    var locationArraySubset = [];
    var point;
    var i = 0;
    var latlon;

    for (var locationName in locationSet) {
        if (i++ % 100 === 0) {
            locationQuery.push(locationName)
        }
    }

    t.expect((locationQuery.length * 3) + 2);

    i = 0;

    geo.locations(locationQuery, function(err, points) {

        if (err) throw err;
        t.equal(err, null);
        t.equal(Object.keys(points).length, locationQuery.length);

        for (var pointName in points) {
            latlon = geohash.decode_int(geohash.encode_int(locationSet[locationQuery[i]].latitude, locationSet[locationQuery[i]].longitude));
            point = points[pointName];
            t.equal(pointName, locationQuery[i]);
            t.equal(Math.round(point.latitude), Math.round(latlon.latitude));
            t.equal(Math.round(point.longitude), Math.round(latlon.longitude));
            i++;
        }

        t.done();
    });
};


exports['Locations Null'] = function(t) {

    t.expect(6);

    var locationQuery = [
        'sw_4682463.21',
        'nw_4693288.96',
        'se_4704127.21',
        'non-existent',
        'ne_4714977.96',
        'sw_4726276',
        'nw_4737152.25',
        'se_4748041',
        'ne_4758942.25',
        'sw_4770292.81'
    ];

    geo.locations(locationQuery, function(err, points) {

        if (err) throw err;
        t.equal(err, null);
        t.equal(Object.keys(points).length, 10);
        t.equal(typeof points['non-existent'], 'object');
        t.equal(typeof points['sw_4682463.21'], 'object');
        t.equal(typeof points['nw_4737152.25'], 'object');
        t.equal(points['non-existent'], null);

        t.done();
    });
};


// exports['Generate Cache'] = function(t) {

//     var expected = [
//         [1785293350895616, 1785297645862912],
//         [1785319120699392, 1785323415666688],
//         [1785327710633984, 1785332005601280],
//         [1785478034489344, 1785486624423936],
//         [1785503804293120, 1785520984162304]
//     ];

//     t.expect(expected.length * 2);

//     var cachedQuery = geo.getQueryCache(lat, lon, 50000);

//     for (var i = 0; i < expected.length; i++) {
//         t.equal(cachedQuery[i][0], expected[i][0]);
//         t.equal(cachedQuery[i][1], expected[i][1]);
//     }

//     t.done();
// };


// exports['Performant Query'] = function(t) {

//     var expected = [
//         [1785293350895616, 1785297645862912],
//         [1785319120699392, 1785323415666688],
//         [1785327710633984, 1785332005601280],
//         [1785478034489344, 1785486624423936],
//         [1785503804293120, 1785520984162304]
//     ];

//     t.expect(1);

//     var cachedQuery = geo.getQueryCache(lat, lon, 50000);

//     geo.nearbyWithQueryCache(cachedQuery, function(err, replies) {
//         t.equal(replies.length, 6902);
//         t.done();
//     });
// };


exports['Basic Query'] = function(t) {

    t.expect(5);

    geo.nearby(testPoint, 50000, function(err, replies) {

        if (err) throw err;
        t.equal(typeof replies, 'object');
        t.equal(Array.isArray(replies), true);
        t.equal(replies.length, 8060);
        t.equal(typeof replies[0], 'string');
        t.equal(typeof replies.locationSet, 'object');
        t.done();
    });
};


exports['Basic Query by Member'] = function(t) {

    t.expect(5);

    geo.nearby('center_0', 50000, function(err, replies) {

        if (err) throw err;
        t.equal(typeof replies, 'object');
        t.equal(Array.isArray(replies), true);
        t.equal(replies.length, 8060);
        t.equal(typeof replies[0], 'string');
        t.equal(typeof replies.locationSet, 'object');
        t.done();
    });
};


exports['Basic Query by Null Member'] = function(t) {

    t.expect(4);

    geo.nearby('non-existent', 50000, function(err, replies) {
        t.equal(err.message, 'ERR could not decode requested zset member');
        t.equal((err === null), false);
        t.equal(Array.isArray(replies), false);
        t.equal(replies, null);
        t.done();
    });
};


exports['Basic Query in Order'] = function(t) {

    t.expect(5);

    geo.nearby(testPoint, 50000, {
        order: true
    }, function(err, replies) {

        if (err) throw err;
        t.equal(typeof replies, 'object');
        t.equal(Array.isArray(replies), true);
        t.equal(replies.length, 8060);
        t.equal(typeof replies[0], 'string');
        t.equal(typeof replies.locationSet, 'object');
        t.done();
    });
};


exports['Basic Query with Coordinates'] = function(t) {
    var options = {
        withCoordinates: true
    };

    t.expect(9);

    geo.nearby(testPoint, 50000, options, function(err, replies) {

        if (err) throw err;

        t.equal(typeof replies, 'object');
        t.equal(Array.isArray(replies), true);
        t.equal(replies.length, 8060);
        t.equal(typeof replies[0], 'object');
        t.equal(typeof replies[0].distance, 'undefined');
        t.equal(typeof replies[0].hash, 'undefined');
        t.equal(typeof replies[0].latitude, 'number');
        t.equal(typeof replies[0].longitude, 'number');
        t.equal(typeof replies.locationSet, 'object');

        t.done();
    });
};


exports['Basic Query in Order with Coordinates'] = function(t) {

    t.expect(9);

    geo.nearby(testPoint, 50000, {
        order: true,
        withCoordinates: true
    }, function(err, replies) {

        if (err) throw err;
        t.equal(typeof replies, 'object');
        t.equal(Array.isArray(replies), true);
        t.equal(replies.length, 8060);
        t.equal(typeof replies[0], 'object');
        t.equal(typeof replies[0].distance, 'undefined');
        t.equal(typeof replies[0].hash, 'undefined');
        t.equal(typeof replies[0].latitude, 'number');
        t.equal(typeof replies[0].longitude, 'number');
        t.equal(typeof replies.locationSet, 'object');
        t.done();
    });
};


exports['Basic Query with Hashes'] = function(t) {
    var options = {
        withHashes: true
    };

    t.expect(9);

    geo.nearby(testPoint, 50000, options, function(err, replies) {

        if (err) throw err;

        t.equal(typeof replies, 'object');
        t.equal(Array.isArray(replies), true);
        t.equal(replies.length, 8060);
        t.equal(typeof replies[0], 'object');
        t.equal(typeof replies[0].distance, 'undefined');
        t.equal(typeof replies[0].hash, 'number');
        t.equal(typeof replies[0].latitude, 'undefined');
        t.equal(typeof replies[0].longitude, 'undefined');
        t.equal(typeof replies.locationSet, 'object');

        t.done();
    });
};


exports['Basic Query with Coordinates and Precision'] = function(t) {
    var options = {
        withCoordinates: true,
        withDistances: true,
        accurate: true
    };

    t.expect(9 + 8060);

    geo.nearby(testPoint, 50000, options, function(err, replies) {

        if (err) throw err;

        for (var i = 0; i < replies.length; i++) {
            t.equal((replies[i].distance <= 50000), true);
        }

        t.equal(typeof replies, 'object');
        t.equal(Array.isArray(replies), true);
        t.equal(replies.length, 8060);
        t.equal(typeof replies[0], 'object');
        t.equal(typeof replies[0].distance, 'number');
        t.equal(typeof replies[0].latitude, 'number');
        t.equal(typeof replies[0].longitude, 'number');
        t.equal(typeof replies[0].hash, 'undefined');
        t.equal(typeof replies.locationSet, 'object');
        t.done();
    });
};


exports['Remove Location'] = function(t) {

    t.expect(1);

    var oneToDelete = '';

    geo.nearby(testPoint, 50000, function(err, replies) {

        if (err) throw err;

        oneToDelete = replies[replies.length - 1];

        geo.removeLocation(oneToDelete, function(err, numberRemoved) {

            if (err) throw err;
            t.equal(numberRemoved, 1);
            t.done();
        });
    });
};


exports['Remove Locations'] = function(t) {

    t.expect(1);

    var arrayToDelete = [];

    geo.nearby(testPoint, 50000, function(err, replies) {

        if (err) throw err;

        arrayToDelete = replies;

        geo.removeLocations(arrayToDelete, function(err, numberRemoved) {

            if (err) throw err;
            t.equal(numberRemoved, 8059);
            t.done();
        });
    });
};


exports['Large Radius'] = function(t) {

    client.flushall();

    t.expect(1);

    geo.addLocation('debugger', {
        latitude: 1,
        longitude: 2
    }, function(err, reply) {});
    geo.addLocation('boostbob', {
        latitude: 2,
        longitude: 3
    }, function(err, reply) {});


    geo.nearby({
        latitude: 2,
        longitude: 2
    }, 100000000, function(err, replies) {


        t.equal(replies[2], null);
        t.done();
    });
};


exports['Add Nearby Ranges'] = function(t) {

    var locationRange;
    var distance = 0;
    var count = 1;

    client.flushall();

    t.expect(2);

    locationSet = {};
    locationSet['center_0'] = testPoint;

    for (var i = 0; i < 50000; i++) {
        distance = i * (i / 100);
        locationRange = getMinMaxs(lat, lon, distance);

        locationSet['sw_' + distance] = {
            latitude: locationRange.latmin % 85,
            longitude: locationRange.lonmin % 180
        };
        locationSet['nw_' + distance] = {
            latitude: locationRange.latmax % 85,
            longitude: locationRange.lonmin % 180
        };
        locationSet['se_' + distance] = {
            latitude: locationRange.latmin % 85,
            longitude: locationRange.lonmax % 180
        };
        locationSet['ne_' + distance] = {
            latitude: locationRange.latmax % 85,
            longitude: locationRange.lonmax % 180
        };

        count += 4;
    }

    // console.log('adding Location Set', locationSet);

    geo.addLocations(locationSet, function(err, reply) {

        if (err) throw err;
        t.equal(err, null);
        t.equal(count, reply);
        t.done();
    });
};


exports['Radii Ranges'] = function(t) {

    t.expect(22);

    queryRadius(startRadius, t, function() {
        t.done();
    });
};

function queryRadius(radius, t, next) {

    geo.nearby({
        latitude: lat,
        longitude: lon
    }, radius, function(err, replies) {

        if (err) throw err;

        var max = 0;
        var maxname = '';

        for (var i = 0; i < replies.length; i++) {
            var split = replies[i].split('_');
            if (Number(split[1]) > max) {
                max = Number(split[1]);
                maxname = replies[i];
            }
        }

        t.equal((max > radius - (radius / 2) || max < radius + (radius / 2)), true);

        startRadius *= 2;

        if (startRadius < 1000000) {
            queryRadius(startRadius, t, next);
        } else {
            next();
        }
    });
}


exports['Multiple Sets'] = function(t) {

    t.expect(2);

    var peopleLocations = {
        'John': {
            latitude: 43.6667,
            longitude: -79.4167
        },
        'Shankar': {
            latitude: 39.9523,
            longitude: -75.1638
        },
        'Cynthia': {
            latitude: 37.4688,
            longitude: -122.1411
        },
        'Chen': {
            latitude: 37.7691,
            longitude: -122.4449
        }
    };

    var placesLocations = {
        'Toronto': {
            latitude: 43.6667,
            longitude: -79.4167
        },
        'Philadelphia': {
            latitude: 39.9523,
            longitude: -75.1638
        },
        'Palo Alto': {
            latitude: 37.4688,
            longitude: -122.1411
        },
        'San Francisco': {
            latitude: 37.7691,
            longitude: -122.4449
        },
        'St. John\'s': {
            latitude: 47.5500,
            longitude: -52.6667
        }
    };

    places = geo.addSet();
    people = geo.addSet('people');

    people.addLocations(peopleLocations, function(err, reply) {

        if (err) throw err;

        places.addLocations(placesLocations, function(err, reply) {

            if (err) throw err;

            people.nearby({
                latitude: 39.9523,
                longitude: -75.1638
            }, 5000, function(err, people) {
                if (err) throw err;

                t.equal(people[0], 'Shankar');

                places.nearby({
                    latitude: 39.9523,
                    longitude: -75.1638
                }, 5000, function(err, places) {
                    if (err) throw err;
                    t.equal(places[0], 'Philadelphia');
                    t.done();
                });
            });
        });
    });
};


exports['Multiple Sets With Values'] = function(t) {

    t.expect(6);

    people.nearby({
        latitude: 39.9523,
        longitude: -75.1638
    }, 5000000, {
        withCoordinates: true
    }, function(err, people) {
        if (err) throw err;

        people = people.locationSet;

        var cynthia = people['Cynthia'];
        var inlatRange = (cynthia.latitude > 37.4688 - 0.005 && cynthia.latitude < 37.4688 + 0.005) ? true : false;
        var inlonRange = (cynthia.longitude > -122.1411 - 0.005 && cynthia.longitude < -122.1411 + 0.005) ? true : false;

        t.equal(typeof cynthia, 'object');
        t.equal(inlatRange, true);
        t.equal(inlonRange, true);

        places.nearby({
            latitude: 39.9523,
            longitude: -75.1638
        }, 5000000, {
            withCoordinates: true
        }, function(err, places) {
            if (err) throw err;

            places = places.locationSet;

            var philadelphia = places['Philadelphia'];

            inlatRange = (philadelphia.latitude > 39.9523 - 0.005 && philadelphia.latitude < 39.9523 + 0.005) ? true : false;
            inlonRange = (philadelphia.longitude > -75.1638 - 0.005 && philadelphia.longitude < -75.1638 + 0.005) ? true : false;

            t.equal(typeof philadelphia, 'object');
            t.equal(inlatRange, true);
            t.equal(inlonRange, true);

            t.done();
        });
    });
};


exports['Deleting Set'] = function(t) {

    t.expect(2);

    geo.deleteSet('people', function(err, res) {


        people.nearby({
            latitude: 39.9523,
            longitude: -75.1638
        }, 5000000, {
            withCoordinates: true
        }, function(err, people) {
            t.equal(people.length, 0);
        });
    });

    places.delete(function(err, res) {

        places.nearby({
            latitude: 39.9523,
            longitude: -75.1638
        }, 5000000, {
            withCoordinates: true
        }, function(err, places) {
            t.equal(places.length, 0);
            t.done();
        });
    });
};


exports['Quitting Client'] = function(t) {
    client.quit();
    t.done();
};


exports['tearDown'] = function(done) {
    done();
};


// Helpers

function getMinMaxs(lat, lon, radius) {

    var latr = radius / 111111;
    var lonr = radius / (111111 * Math.abs(Math.cos(lat)));

    var latmin = lat - latr;
    var latmax = lat + latr;
    var lonmin = lon - lonr;
    var lonmax = lon + lonr;

    return {
        latmin: latmin,
        latmax: latmax,
        lonmin: lonmin,
        lonmax: lonmax
    };
}


return exports;
