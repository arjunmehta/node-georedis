var redis = require('fakeredis');
var testComponents = require('./testComponents');
var client = redis.createClient();

var geo = require('../main.js').initialize(client, {
  zset: 'geo:emulated',
  nativeGeo: false
});

testComponents.setGeo(geo, client, 'geo:emulated', 'RedisClient');

exports['Exporting OK'] = testComponents['Exporting OK'];

exports['Location Null'] = testComponents['Location Null'];
exports['Add Location'] = testComponents['Add Location'];
exports['Add Locations'] = testComponents['Add Locations'];
exports['Get Location'] = testComponents['Get Location'];
exports['Get Locations'] = testComponents['Get Locations'];
exports['Get Distance'] = testComponents['Get Distance'];
exports['Locations Null'] = testComponents['Locations Null'];

exports['Basic Query'] = testComponents['Basic Query'];
exports['Basic Query by Member'] = testComponents['Basic Query by Member'];
exports['Basic Query by Null Member'] = testComponents['Basic Query by Null Member'];
exports['Basic Query with Count'] = testComponents['Basic Query with Count'];
exports['Basic Query in Order'] = testComponents['Basic Query in Order'];
exports['Basic Query with Coordinates'] = testComponents['Basic Query with Coordinates'];
exports['Basic Query with Coordinates and Count'] = testComponents['Basic Query with Coordinates and Count'];
exports['Basic Query with Hashes'] = testComponents['Basic Query with Hashes'];
exports['Basic Query with Coordinates and Precision'] = testComponents['Basic Query with Coordinates and Precision'];

exports['Remove Location'] = testComponents['Remove Location'];
exports['Remove Locations'] = testComponents['Remove Locations'];

exports['Large Radius'] = testComponents['Large Radius'];
exports['Add Nearby Ranges'] = testComponents['Add Nearby Ranges'];
exports['Radii Ranges'] = testComponents['Radii Ranges'];

exports['Multiple Sets'] = testComponents['Multiple Sets'];
exports['Multiple Sets With Values'] = testComponents['Multiple Sets With Values'];

exports['Deleting Set'] = testComponents['Deleting Set'];
exports['Quitting Client'] = testComponents['Quitting Client'];
exports['tearDown'] = testComponents['tearDown'];


return exports;
