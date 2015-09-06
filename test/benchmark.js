var redis = require('redis');
var client = redis.createClient();

var geo = require('../main.js').initialize(client, {
    nativeGeo: false
});
var old = require('geo-proximity').initialize(client);

var Benchmark = require('benchmark');

var lat = 43.646838;
var lon = -79.403723;

var testPoint = {
    latitude: lat,
    longitude: lon
};

var locationRange;
var distance = 0;
var cycleCount = 0;

client.flushall();

var locationSet = {};

locationSet['center_0'] = testPoint;

for (var i = 0; i < 100000; i++) {
    distance = i * (i / 100);
    locationRange = getMinMaxs(lat, lon, distance);

    locationSet['sw_' + distance] = {
        latitude: locationRange.latmin % 90,
        longitude: locationRange.lonmin % 180
    };
    locationSet['nw_' + distance] = {
        latitude: locationRange.latmax % 90,
        longitude: locationRange.lonmin % 180
    };
    locationSet['se_' + distance] = {
        latitude: locationRange.latmin % 90,
        longitude: locationRange.lonmax % 180
    };
    locationSet['ne_' + distance] = {
        latitude: locationRange.latmax % 90,
        longitude: locationRange.lonmax % 180
    };
}


// BENCHMARKING

var suite = new Benchmark.Suite('GeoRedis Performance Test');

suite.on('start', function() {
    action = false;
    cycleCount = 0;
});

suite.on('cycle', function(event) {
    console.log('\n', String(event.target));
});

suite.on('complete', function() {
    var fastest = this.filter('fastest');
    var slowest = this.filter('slowest');

    var fastestSpeed = fastest[0].stats.mean;
    var slowestSpeed = slowest[0].stats.mean;

    // console.log(fastest.pluck('name')[0], 'is the Fastest at ', fastestSpeed, 'per cycle');
    // console.log(slowest.pluck('name')[0], 'is the Slowest at ', slowestSpeed, 'per cycle');

    // console.log(fastest.pluck('name')[0], 'is', slowestSpeed / fastestSpeed, 'times faster than', slowest.pluck('name')[0]);

});

suite.on('error', function(e) {
    console.log('Benchmark ERROR:', e);
});

suite.add({
    name: 'Old Nearby',
    defer: true,
    fn: function(deferred) {
        old.nearby(lat, lon, 50000, function(err, replies) {
            if (err) throw err;
            deferred.resolve();
        });
    },
    onStart: function() {
        cycleCount = 0;
        console.log('Starting:', this.name);
    },
    onCycle: function() {
        process.stdout.write('\r Cycle:' + cycleCount++);
    },
    onComplete: function() {}
});

suite.add({
    name: 'New Nearby',
    defer: true,
    fn: function(deferred) {
        geo.nearby(testPoint, 50000, function(err, replies) {
            if (err) throw err;
            deferred.resolve();
        });
    },
    onStart: function() {
        cycleCount = 0;
        console.log('Starting:', this.name);
    },
    onCycle: function() {
        process.stdout.write('\r Cycle:' + cycleCount++);
    },
    onComplete: function() {

    }
});

suite.add({
    name: 'Old Nearby with Coordinates',
    defer: true,
    fn: function(deferred) {
        old.nearby(lat, lon, 50000, {
            values: true
        }, function(err, replies) {
            if (err) throw err;
            deferred.resolve();
        });
    },
    onStart: function() {
        cycleCount = 0;
        console.log('Starting:', this.name);
    },
    onCycle: function() {
        process.stdout.write('\r Cycle:' + cycleCount++);
    },
    onComplete: function() {}
});

suite.add({
    name: 'New Nearby with Coordinates',
    defer: true,
    fn: function(deferred) {
        geo.nearby(testPoint, 50000, {
            withCoordinates: true
        }, function(err, replies) {
            if (err) throw err;
            deferred.resolve();
        });
    },
    onStart: function() {
        cycleCount = 0;
        console.log('Starting:', this.name);
    },
    onCycle: function() {
        process.stdout.write('\r Cycle:' + cycleCount++);
    },
    onComplete: function() {

    }
});


geo.addLocations(locationSet, function(err, reply) {

    if (err) throw err;
    suite.run({
        'async': false
    });
});


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
