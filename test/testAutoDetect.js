var geohash = require('ngeohash');

var redis = require('redis');
var testComponents = require('./testComponents');
var client = redis.createClient();

var geo = require('../main.js').initialize(client);

var locationSet = {};
var lat = 43.646838;
var lon = -79.403723;
var startRadius = 0.4;

var testPoint = {
  latitude: lat,
  longitude: lon
};

var setLength;

testComponents.setGeo(geo, client, 'geo:locations', 'RedisClient');

exports['Test Add and Get'] = function(t) {
  var locationRange;
  var distance = 0;
  var count = 1;

  var locationQuery = [];
  var point;
  var i = 0;
  var latlon;

  client.del('geo:locations');

  locationSet = {};
  locationSet['center_0'] = testPoint;

  for (var i = 0; i < 5000; i++) {
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

  geo.addLocations(locationSet, function(err, reply) {
    t.equal(err, null);
    t.equal(count, reply);
  });

  for (var locationName in locationSet) {
    if (i++ % 100 === 0) {
      locationQuery.push(locationName);
    }
  }

  t.expect((locationQuery.length * 3) + 4);

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

exports['Add Location'] = function(t) {
  resetGeo();
  testComponents['Add Location'](t);
};

exports['Add Locations'] = function(t) {
  resetGeo();
  testComponents['Add Locations'](t);
};

exports['Get Locations'] = function(t) {
  resetGeo();
  testComponents['Get Locations'](t);
};

exports['Get Location'] = function(t) {
  resetGeo();
  testComponents['Get Location'](t);
};

exports['Get Distance'] = function(t) {
  resetGeo();
  testComponents['Get Distance'](t);
};

exports['Locations Null'] = function(t) {
  resetGeo();
  testComponents['Locations Null'](t);
};

exports['Basic Query'] = function(t) {
  resetGeo();
  testComponents['Basic Query'](t);
};

exports['Basic Query by Member'] = function(t) {
  resetGeo();
  testComponents['Basic Query by Member'](t);
};

exports['Basic Query by Null Member'] = function(t) {
  resetGeo();
  testComponents['Basic Query by Null Member'](t);
};

exports['Basic Query with Count'] = function(t) {
  resetGeo();
  testComponents['Basic Query with Count'](t);
};

exports['Basic Query in Order'] = function(t) {
  resetGeo();
  testComponents['Basic Query in Order'](t);
};

exports['Basic Query with Coordinates'] = function(t) {
  resetGeo();
  testComponents['Basic Query with Coordinates'](t);
};

exports['Basic Query with Coordinates and Count'] = function(t) {
  resetGeo();
  testComponents['Basic Query with Coordinates and Count'](t);
};

exports['Basic Query with Hashes'] = function(t) {
  resetGeo();
  testComponents['Basic Query with Hashes'](t);
};

exports['Basic Query with Coordinates and Precision'] = function(t) {
  resetGeo();
  testComponents['Basic Query with Coordinates and Precision'](t);

};

exports['Remove Location'] = function(t) {
  resetGeo();
  testComponents['Remove Location'](t);
};

exports['Remove Locations'] = function(t) {
  resetGeo();
  testComponents['Remove Locations'](t);
};

exports['Large Radius'] = function(t) {
  resetGeo();
  testComponents['Large Radius'](t);
};

exports['Add Nearby Ranges'] = function(t) {
  resetGeo();
  testComponents['Add Nearby Ranges'](t);
};

exports['Radii Ranges'] = function(t) {
  resetGeo();
  testComponents['Radii Ranges'](t);
};

exports['Multiple Sets'] = function(t) {
  resetGeo();
  testComponents['Multiple Sets'](t);
};

exports['Multiple Sets With Values'] = function(t) {
  resetGeo();
  testComponents['Multiple Sets With Values'](t);
};

exports['Deleting Set'] = testComponents['Deleting Set'];
exports['Quitting Client'] = testComponents['Quitting Client'];
exports['tearDown'] = testComponents['tearDown'];

// helpers

function resetGeo() {
  geo = require('../main.js').initialize(client);
  testComponents.setGeo(geo, client, 'geo:locations', 'RedisClient');
}


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


function isBetween(val, low, high) {
  return (low <= val && high >= val);
}


return exports;
