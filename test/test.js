var geohash = require('ngeohash');
var redis = require('redis');
var client = redis.createClient();
var proximity = require('../main.js').initialize(client),
    people, places;

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


exports['Exporting OK'] = function(test) {

    client.flushall();

    test.expect(4);

    test.equal(typeof proximity === 'object', true);
    test.equal(typeof proximity.initialize === 'function', true);
    test.equal(proximity.client.constructor.name, 'RedisClient');
    test.equal(proximity.zset, 'geo:locations');
    test.done();

};

exports['Location Null'] = function(test) {

    client.flushall();

    test.expect(2);

    proximity.location('Toronto', function(err, reply) {
        if (err) throw err;
        test.equal(reply.latitude, null);
        test.equal(reply.longitude, null);
        test.done();
    });
};


exports['Add Location'] = function(test) {

    client.flushall();

    test.expect(1);

    proximity.addLocation('Toronto', {
        latitude: 43.6667,
        longitude: -79.4167
    }, function(err, reply) {
        if (err) throw err;
        test.equal(reply, 1);
        test.done();
    });
};


exports['Add Locations'] = function(test) {

    var locationRange;
    var distance = 0;
    var count = 1;

    client.flushall();

    test.expect(2);

    locationSet = {};
    locationSet['center_0'] = testPoint;

    for (var i = 0; i < 100000; i++) {
        distance = i * (i / 100);
        locationRange = getMinMaxs(lat, lon, distance);
        locationSet['sw_' + distance] = {
            latitude: locationRange.latmin,
            longitude: locationRange.lonmin
        };
        locationSet['nw_' + distance] = {
            latitude: locationRange.latmax,
            longitude: locationRange.lonmin
        };
        locationSet['se_' + distance] = {
            latitude: locationRange.latmin,
            longitude: locationRange.lonmax
        };
        locationSet['ne_' + distance] = {
            latitude: locationRange.latmax,
            longitude: locationRange.lonmax
        };
        count += 4;
    }

    proximity.addLocations(locationSet, function(err, reply) {
        if (err) throw err;
        test.equal(err, null);
        test.equal(400001, reply);
        test.done();
    });
};


exports['Get Location'] = function(test) {

    test.expect(3);

    proximity.location('nw_99990000.25', function(err, point) {
        if (err) throw err;
        test.equal(err, null);
        test.equal(Math.round(point.latitude), 90);
        test.equal(Math.round(point.longitude), -180);
        test.done();
    });
};


exports['Get Locations'] = function(test) {

    var locationQuery = [];
    var locationArraySubset = [];
    var point;
    var i = 0;
    var latlon;

    for (var locationName in locationSet) {
        if (i++ % 101 === 0) {
            locationQuery.push(locationName)
        }
    }

    test.expect((locationQuery.length * 3) + 2);

    i = 0;

    proximity.locations(locationQuery, function(err, points) {

        if (err) throw err;
        test.equal(err, null);
        test.equal(Object.keys(points).length, locationQuery.length);

        for (var pointName in points) {
            latlon = geohash.decode_int(geohash.encode_int(locationSet[locationQuery[i]].latitude, locationSet[locationQuery[i]].longitude));
            point = points[pointName];
            test.equal(pointName, locationQuery[i]);
            test.equal(Math.round(point.latitude), Math.round(latlon.latitude));
            test.equal(Math.round(point.longitude), Math.round(latlon.longitude));
            i++;
        }

        test.done();
    });
};


exports['Locations Null'] = function(test) {

    test.expect(6);

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

    proximity.locations(locationQuery, function(err, points) {

        if (err) throw err;
        test.equal(err, null);
        test.equal(Object.keys(points).length, 10);
        test.equal(typeof points['non-existent'], 'object');
        test.equal(typeof points['sw_4682463.21'], 'object');
        test.equal(typeof points['nw_4737152.25'], 'object');
        test.equal(points['non-existent'].latitude, null);

        test.done();
    });
};


exports['Generate Cache'] = function(test) {

    var expected = [
        [1785293350895616, 1785297645862912],
        [1785319120699392, 1785323415666688],
        [1785327710633984, 1785332005601280],
        [1785478034489344, 1785486624423936],
        [1785503804293120, 1785520984162304]
    ];

    test.expect(expected.length * 2);

    var cachedQuery = proximity.getQueryCache(lat, lon, 50000);

    for (var i = 0; i < expected.length; i++) {
        test.equal(cachedQuery[i][0], expected[i][0]);
        test.equal(cachedQuery[i][1], expected[i][1]);
    }

    test.done();
};


exports['Performant Query'] = function(test) {

    var expected = [
        [1785293350895616, 1785297645862912],
        [1785319120699392, 1785323415666688],
        [1785327710633984, 1785332005601280],
        [1785478034489344, 1785486624423936],
        [1785503804293120, 1785520984162304]
    ];

    test.expect(1);

    var cachedQuery = proximity.getQueryCache(lat, lon, 50000);

    proximity.nearbyWithQueryCache(cachedQuery, function(err, replies) {
        test.equal(replies.length, 6835);
        test.done();
    });
};


exports['Basic Query'] = function(test) {

    test.expect(1);

    proximity.nearby(testPoint, 50000, function(err, replies) {
        if (err) throw err;
        test.equal(Object.keys(replies).length, 6835);
        test.done();
    });
};


exports['Remove Location'] = function(test) {

    test.expect(1);

    var oneToDelete = '';

    proximity.nearby(testPoint, 50000, function(err, replies) {

        if (err) throw err;

        oneToDelete = replies[replies.length - 1];

        proximity.removeLocation(oneToDelete, function(err, numberRemoved) {
            if (err) throw err;
            test.equal(numberRemoved, 1);
            test.done();
        });
    });
};


exports['Remove Locations'] = function(test) {

    test.expect(1);

    var arrayToDelete = [];

    proximity.nearby(testPoint, 50000, function(err, replies) {

        if (err) throw err;
        arrayToDelete = replies;

        proximity.removeLocations(arrayToDelete, function(err, numberRemoved) {
            if (err) throw err;
            test.equal(numberRemoved, 6834);

            test.done();
        });
    });
};


exports['Large Radius'] = function(test) {

    client.flushall();

    test.expect(1);

    proximity.addLocation('debugger', {
        latitude: 1,
        longitude: 2
    }, function(err, reply) {});
    proximity.addLocation('boostbob', {
        latitude: 2,
        longitude: 3
    }, function(err, reply) {});

    proximity.nearby({
        latitude: 2,
        longitude: 2
    }, 100000000, function(err, replies) {
        test.equal(replies[2], null);
        test.done();
    });
};


exports['Add Nearby Ranges'] = function(test) {

    client.flushall();

    test.expect(2);

    var locationRange;
    var distance = 0;
    var count = 1;

    locationSet = {};
    locationSet['center_0'] = testPoint;

    for (var i = 0; i < 100000; i++) {
        distance = i * (i / 100);
        locationRange = getMinMaxs(lat, lon, distance);

        locationSet['sw_' + distance] = {
            latitude: locationRange.latmin,
            longitude: locationRange.lonmin
        };
        locationSet['nw_' + distance] = {
            latitude: locationRange.latmax,
            longitude: locationRange.lonmin
        };
        locationSet['se_' + distance] = {
            latitude: locationRange.latmin,
            longitude: locationRange.lonmax
        };
        locationSet['ne_' + distance] = {
            latitude: locationRange.latmax,
            longitude: locationRange.lonmax
        };
        count += 4;
    }

    proximity.addLocations(locationSet, function(err, reply) {
        if (err) throw err;
        test.equal(err, null);
        test.equal(count, reply);
        test.done();
    });
};


var startRadius = 0.4;

exports['Radii Ranges'] = function(test) {

    test.expect(22);

    queryRadius(startRadius, test, function() {
        test.done();
    });
};

function queryRadius(radius, test, next) {

    proximity.nearby({
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

        test.equal((max > radius - (radius / 2) || max < radius + (radius / 2)), true);

        startRadius *= 2;

        if (startRadius < 1000000) {
            queryRadius(startRadius, test, next);
        } else {
            next();
        }
    });
}


exports['Multiple Sets'] = function(test) {

    test.expect(2);

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

    places = proximity.addSet();
    people = proximity.addSet('people');

    people.addLocations(peopleLocations, function(err, reply) {

        if (err) throw err;

        places.addLocations(placesLocations, function(err, reply) {

            if (err) throw err;

            people.nearby({
                latitude: 39.9523,
                longitude: -75.1638
            }, 5000, function(err, people) {
                if (err) throw err;

                test.equal(people[0], 'Shankar');

                places.nearby({
                    latitude: 39.9523,
                    longitude: -75.1638
                }, 5000, function(err, places) {
                    if (err) throw err;
                    test.equal(places[0], 'Philadelphia');
                    test.done();
                });
            });
        });
    });
};



exports['Multiple Sets With Values'] = function(test) {

    test.expect(6);

    people.nearby({
        latitude: 39.9523,
        longitude: -75.1638
    }, 5000000, {
        values: true
    }, function(err, people) {

        if (err) throw err;

        var cynthia = people['Cynthia'];
        var inlatRange = (cynthia.latitude > 37.4688 - 0.005 && cynthia.latitude < 37.4688 + 0.005) ? true : false;
        var inlonRange = (cynthia.longitude > -122.1411 - 0.005 && cynthia.longitude < -122.1411 + 0.005) ? true : false;

        test.equal(typeof cynthia, 'object');
        test.equal(inlatRange, true);
        test.equal(inlonRange, true);

        places.nearby({
            latitude: 39.9523,
            longitude: -75.1638
        }, 5000000, {
            values: true
        }, function(err, places) {

            if (err) throw err;

            var philadelphia = places['Philadelphia'];

            inlatRange = (philadelphia.latitude > 39.9523 - 0.005 && philadelphia.latitude < 39.9523 + 0.005) ? true : false;
            inlonRange = (philadelphia.longitude > -75.1638 - 0.005 && philadelphia.longitude < -75.1638 + 0.005) ? true : false;

            test.equal(typeof philadelphia, 'object');
            test.equal(inlatRange, true);
            test.equal(inlonRange, true);

            test.done();
        });
    });
};

exports['Deleting Set'] = function(test) {

    test.expect(2);

    proximity.deleteSet('people', function(err, res) {

        people.nearby({
            latitude: 39.9523,
            longitude: -75.1638
        }, 5000000, {
            values: true
        }, function(err, people) {
            test.equal(Object.keys(people).length, 0);
        });
    });

    places.delete(function(err, res) {

        places.nearby({
            latitude: 39.9523,
            longitude: -75.1638
        }, 5000000, {
            values: true
        }, function(err, places) {
            test.equal(Object.keys(places).length, 0);
            test.done();
        });
    });
};


exports['Quitting Client'] = function(test) {
    client.quit();
    test.done();
};


exports['tearDown'] = function(done) {
    done();
};



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
