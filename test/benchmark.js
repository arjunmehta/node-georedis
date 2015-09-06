var Benchmark = require('benchmark');
var suite = new Benchmark.Suite('GeoRedis Performance Test');

var redis = require('redis');
var client = redis.createClient();

var geo = require('../main.js').initialize(client, {
    nativeGeo: true,
    zset: 'geo:native'
});

var geoEmulated = geo.addSet().initialize(client, {
    nativeGeo: false,
    zset: 'geo:emulated'
});

var old = require('geo-proximity').initialize(client, {
    zset: 'geo:old'
});

var lat = 43.646838;
var lon = -79.403723;
var testPoint = {
    latitude: lat,
    longitude: lon
};
var locationRange;
var distance = 0;
var cycleCount = 0;
var locationSet = {};
var locationsArray = [];

var i;
var locationName;


// Set Up

client.del('geo:native');
client.del('geo:emulated');
client.del('geo:old');

locationSet.center_0 = testPoint;

for (i = 0; i < 50000; i++) {
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
}

for (locationName in locationSet) {
    locationsArray.push([locationSet[locationName].latitude, locationSet[locationName].longitude, locationName]);
}


// BENCHMARKING

suite.on('start', function() {
    cycleCount = 0;
});

suite.on('cycle', function(event) {
    console.log('\n', String(event.target), '\n');
});

suite.on('complete', function() {
    // var fastest = this.filter('fastest');
    // var slowest = this.filter('slowest');
    // var fastestSpeed = fastest[0].stats.mean;
    // var slowestSpeed = slowest[0].stats.mean;
    // console.log(fastest.pluck('name')[0], 'is the Fastest at ', fastestSpeed, 'per cycle');
    // console.log(slowest.pluck('name')[0], 'is the Slowest at ', slowestSpeed, 'per cycle');
    // console.log(fastest.pluck('name')[0], 'is', slowestSpeed / fastestSpeed, 'times faster than', slowest.pluck('name')[0]);

    process.exit(0);
});

suite.on('error', function(e) {
    console.log('Benchmark ERROR:', e);
});


// BENCHMARKS

//  Sorting and Precision, 500km

suite.add({
    name: 'NEW NATIVE: Nearby and Sort and Precise - 500km',
    defer: true,
    fn: function(deferred) {
        geo.nearby(testPoint, 500000, {
            order: true,
            accurate: true
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

suite.add({
    name: 'NEW EMULATED: Nearby and Sort and Precise - 500km',
    defer: true,
    fn: function(deferred) {
        geoEmulated.nearby(testPoint, 500000, {
            order: true,
            accurate: true
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


//  Sorting and Precision and Count, 50km

suite.add({
    name: 'NEW NATIVE: Nearby and Sort, Precise and Count - 50km',
    defer: true,
    fn: function(deferred) {
        geo.nearby(testPoint, 50000, {
            order: true,
            accurate: true,
            count: 10
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

suite.add({
    name: 'NEW EMULATED: Nearby and Sort, Precise and Count - 50km',
    defer: true,
    fn: function(deferred) {
        geoEmulated.nearby(testPoint, 50000, {
            order: true,
            accurate: true,
            count: 10
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


//  Sorting and Precision, 500m

suite.add({
    name: 'NEW NATIVE: Nearby and Sort and Precise - 500m',
    defer: true,
    fn: function(deferred) {
        geo.nearby(testPoint, 500, {
            order: true,
            accurate: true
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

suite.add({
    name: 'NEW EMULATED: Nearby and Sort and Precise - 500m',
    defer: true,
    fn: function(deferred) {
        geoEmulated.nearby(testPoint, 500, {
            order: true,
            accurate: true
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


//  Sorting and Precision with Distance and Coordinates, 500m

suite.add({
    name: 'NEW NATIVE: Nearby and Sort and Precise, with Distance, Coordinates - 500m',
    defer: true,
    fn: function(deferred) {
        geo.nearby(testPoint, 500, {
            order: true,
            accurate: true,
            withDistances: true,
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

suite.add({
    name: 'NEW EMULATED: Nearby and Sort and Precise, with Distance, Coordinates - 500m',
    defer: true,
    fn: function(deferred) {
        geoEmulated.nearby(testPoint, 500, {
            order: true,
            accurate: true,
            withDistances: true,
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


//  Sorting and Precision with Distance and Coordinates, 5m

suite.add({
    name: 'NEW NATIVE: Nearby and Sort and Precise, with Distance, Coordinates - 5m',
    defer: true,
    fn: function(deferred) {
        geo.nearby(testPoint, 5, {
            order: true,
            accurate: true,
            withDistances: true,
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

suite.add({
    name: 'NEW EMULATED: Nearby and Sort and Precise, with Distance, Coordinates - 5m',
    defer: true,
    fn: function(deferred) {
        geoEmulated.nearby(testPoint, 5, {
            order: true,
            accurate: true,
            withDistances: true,
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


// 500km

suite.add({
    name: 'OLD GEO-PROXIMITY: Nearby - 500km',
    defer: true,
    fn: function(deferred) {
        old.nearby(lat, lon, 500000, function(err, replies) {
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
    name: 'NEW NATIVE: Nearby - 500km',
    defer: true,
    fn: function(deferred) {
        geo.nearby(testPoint, 500000, function(err, replies) {
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
    name: 'NEW EMULATED: Nearby - 500km',
    defer: true,
    fn: function(deferred) {
        geoEmulated.nearby(testPoint, 500000, function(err, replies) {
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


// 50 km

suite.add({
    name: 'OLD GEO-PROXIMITY: Nearby - 50km',
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
    name: 'NEW NATIVE: Nearby - 50km',
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
    name: 'NEW EMULATED: Nearby - 50km',
    defer: true,
    fn: function(deferred) {
        geoEmulated.nearby(testPoint, 50000, function(err, replies) {
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


// 5 km

suite.add({
    name: 'OLD GEO-PROXIMITY: Nearby - 5km',
    defer: true,
    fn: function(deferred) {
        old.nearby(lat, lon, 5000, function(err, replies) {
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
    name: 'NEW NATIVE: Nearby - 5km',
    defer: true,
    fn: function(deferred) {
        geo.nearby(testPoint, 5000, function(err, replies) {
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
    name: 'NEW EMULATED: Nearby - 5km',
    defer: true,
    fn: function(deferred) {
        geoEmulated.nearby(testPoint, 5000, function(err, replies) {
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


// .5 km

suite.add({
    name: 'OLD GEO-PROXIMITY: Nearby - 500m',
    defer: true,
    fn: function(deferred) {
        old.nearby(lat, lon, 500, function(err, replies) {
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
    name: 'NEW NATIVE: Nearby - 500m',
    defer: true,
    fn: function(deferred) {
        geo.nearby(testPoint, 500, function(err, replies) {
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
    name: 'NEW EMULATED: Nearby - 500m',
    defer: true,
    fn: function(deferred) {
        geoEmulated.nearby(testPoint, 500, function(err, replies) {
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


// 50 km w/ Coordinates

suite.add({
    name: 'OLD GEO-PROXIMITY: Nearby with Coordinates - 50km',
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
    name: 'NEW NATIVE: Nearby with Coordinates - 50km',
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

suite.add({
    name: 'NEW EMULATED: Nearby with Coordinates - 50km',
    defer: true,
    fn: function(deferred) {
        geoEmulated.nearby(testPoint, 50000, {
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


// Setup and Run

geo.addLocations(locationSet, function(err, reply) {

    if (err) throw err;

    geoEmulated.addLocations(locationSet, function(erra, replya) {

        if (erra) throw erra;

        old.addLocations(locationsArray, function(errb, replyb) {

            if (errb) throw errb;

            suite.run({
                'async': false
            });
        });
    });
});


function getMinMaxs(latitude, longitude, radius) {

    var latr = radius / 111111;
    var lonr = radius / (111111 * Math.abs(Math.cos(latitude)));

    var latmin = latitude - latr;
    var latmax = latitude + latr;
    var lonmin = longitude - lonr;
    var lonmax = longitude + lonr;

    return {
        latmin: latmin,
        latmax: latmax,
        lonmin: lonmin,
        lonmax: lonmax
    };
}
