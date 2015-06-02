var geohash = require('ngeohash');
var redis = require('redis');
var client = redis.createClient();
var proximity = require('../main.js').initialize(client),
    people, places;

var lat = 43.646838,
    lon = -79.403723;

var locationArray = [];

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

    proximity.location("Toronto", function(err, reply) {
        if (err) throw err;
        test.equal(reply.name, "Toronto");
        test.equal(reply.latitude, null);
        test.done();
    });
};


exports['Add Location'] = function(test) {

    client.flushall();

    test.expect(1);

    proximity.addLocation(43.6667, -79.4167, "Toronto", function(err, reply) {
        if (err) throw err;
        test.equal(reply, 1);
        test.done();
    });
};


exports['Add Locations'] = function(test) {

    client.flushall();

    test.expect(2);

    var locationRange;
    locationArray = [];
    var distance = 0;
    var count = 1;

    locationArray.push([lat, lon, "center_0"]);

    for (var i = 0; i < 100000; i++) {
        distance = i * (i / 100);
        locationRange = getMinMaxs(lat, lon, distance);
        locationArray.push([locationRange.latmin, locationRange.lonmin, "sw_" + distance]);
        locationArray.push([locationRange.latmax, locationRange.lonmin, "nw_" + distance]);
        locationArray.push([locationRange.latmin, locationRange.lonmax, "se_" + distance]);
        locationArray.push([locationRange.latmax, locationRange.lonmax, "ne_" + distance]);
        count += 4;
    }

    proximity.addLocations(locationArray, function(err, reply) {
        if (err) throw err;
        test.equal(err, null);
        test.equal(400001, reply);
        test.done();
    });
};


exports['Get Location'] = function(test) {

    test.expect(4);

    proximity.location('nw_99990000.25', function(err, point) {
        if (err) throw err;
        test.equal(err, null);
        test.equal(point.name, 'nw_99990000.25');
        test.equal(Math.round(point.latitude), 90);
        test.equal(Math.round(point.longitude), -180);
        test.done();
    });
};


exports['Get Locations'] = function(test) {

    var locationQuery = [],
        locationArraySubset = [],
        point, i, latlon;

    for (i = 0; i < locationArray.length; i += 101) {
        locationArraySubset.push(locationArray[i]);
    }

    for (i = 0; i < locationArraySubset.length; i++) {
        locationQuery.push(locationArraySubset[i][2]);
    }

    test.expect((locationArraySubset.length * 3) + 2);

    proximity.locations(locationQuery, function(err, points) {

        if (err) throw err;
        test.equal(err, null);
        test.equal(points.length, locationArraySubset.length);

        for (i = 0; i < points.length; i++) {
            latlon = geohash.decode_int(geohash.encode_int(locationArraySubset[i][0], locationArraySubset[i][1]));
            point = points[i];
            test.equal(point.name, locationArraySubset[i][2]);
            test.equal(Math.round(point.latitude), Math.round(latlon.latitude));
            test.equal(Math.round(point.longitude), Math.round(latlon.longitude));
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
        test.equal(points.length, 10);
        test.equal(points[3].latitude, null);
        test.equal(points[3].name, 'non-existent');
        test.equal(typeof points[0], 'object');
        test.equal(typeof points[4], 'object');

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

    proximity.nearby(lat, lon, 50000, function(err, replies) {
        if (err) throw err;
        test.equal(replies.length, 6835);
        test.done();
    });
};


exports['Remove Location'] = function(test) {

    test.expect(1);

    var oneToDelete = "";

    proximity.nearby(lat, lon, 50000, function(err, replies) {

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

    proximity.nearby(lat, lon, 50000, function(err, replies) {

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

    proximity.addLocation(1, 2, "debugger", function(err, reply) {});
    proximity.addLocation(2, 3, "boostbob", function(err, reply) {});

    proximity.nearby(2, 2, 100000000, function(err, replies) {
        test.equal(replies[2], null);
        test.done();
    });
};


exports['Add Nearby Ranges'] = function(test) {

    client.flushall();

    test.expect(2);

    var locationRange;
    locationArray = [];
    var distance = 0;
    var count = 1;

    locationArray.push([lat, lon, "center_0"]);

    for (var i = 0; i < 100000; i++) {
        distance = i * (i / 100);
        locationRange = getMinMaxs(lat, lon, distance);
        locationArray.push([locationRange.latmin, locationRange.lonmin, "sw_" + distance]);
        locationArray.push([locationRange.latmax, locationRange.lonmin, "nw_" + distance]);
        locationArray.push([locationRange.latmin, locationRange.lonmax, "se_" + distance]);
        locationArray.push([locationRange.latmax, locationRange.lonmax, "ne_" + distance]);
        count += 4;
    }

    proximity.addLocations(locationArray, function(err, reply) {
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

    proximity.nearby(lat, lon, radius, function(err, replies) {

        if (err) throw err;

        var max = 0;
        var maxname = "";

        for (var i = 0; i < replies.length; i++) {
            var split = replies[i].split("_");
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

    var peopleLocations = [
        [43.6667, -79.4167, "John"],
        [39.9523, -75.1638, "Shankar"],
        [37.4688, -122.1411, "Cynthia"],
        [37.7691, -122.4449, "Chen"]
    ];

    var placesLocations = [
        [43.6667, -79.4167, "Toronto"],
        [39.9523, -75.1638, "Philadelphia"],
        [37.4688, -122.1411, "Palo Alto"],
        [37.7691, -122.4449, "San Francisco"],
        [47.5500, -52.6667, "St. John's"]
    ];

    places = proximity.addSet();
    people = proximity.addSet('people');

    people.addLocations(peopleLocations, function(err, reply) {

        if (err) throw err;

        places.addLocations(placesLocations, function(err, reply) {

            if (err) throw err;

            people.nearby(39.9523, -75.1638, 5000, function(err, people) {
                if (err) throw err;

                test.equal(people[0], "Shankar");
                places.nearby(39.9523, -75.1638, 5000, function(err, places) {

                    if (err) throw err;
                    test.equal(places[0], "Philadelphia");
                    test.done();
                });
            });
        });
    });
};



exports['Multiple Sets With Values'] = function(test) {

    test.expect(6);

    people.nearby(39.9523, -75.1638, 5000000, {
        values: true
    }, function(err, people) {

        if (err) throw err;

        var cynthia = people[1];
        var inlatRange = (cynthia[1] > 37.4688 - 0.005 && cynthia[1] < 37.4688 + 0.005) ? true : false;
        var inlonRange = (cynthia[2] > -122.1411 - 0.005 && cynthia[2] < -122.1411 + 0.005) ? true : false;

        test.equal(cynthia[0], "Cynthia");
        test.equal(inlatRange, true);
        test.equal(inlonRange, true);

        places.nearby(39.9523, -75.1638, 5000000, {
            values: true
        }, function(err, places) {

            if (err) throw err;

            var philadelphia = places[3];

            inlatRange = (philadelphia[1] > 39.9523 - 0.005 && philadelphia[1] < 39.9523 + 0.005) ? true : false;
            inlonRange = (philadelphia[2] > -75.1638 - 0.005 && philadelphia[2] < -75.1638 + 0.005) ? true : false;

            test.equal(philadelphia[0], "Philadelphia");
            test.equal(inlatRange, true);
            test.equal(inlonRange, true);

            test.done();
        });
    });
};

exports['Deleting Set'] = function(test) {

    test.expect(2);

    proximity.deleteSet('people', function(err, res) {

        people.nearby(39.9523, -75.1638, 5000000, {
            values: true
        }, function(err, people) {
            test.equal(people.length, 0);
        });
    });

    places.delete(function(err, res) {

        places.nearby(39.9523, -75.1638, 5000000, {
            values: true
        }, function(err, places) {
            test.equal(places.length, 0);
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
