var redis   = require('redis');
var fs = require('fs');
var csv = require('csv');

var geohash = require('ngeohash');
var distance = require('./node-geohash-distance.js');

var client = redis.createClient();

var hash = "";
var j, 
    sign = 1,
    lat = 43.646838,
    lon = -79.403723;

distance.initialize(client, "myzset");

