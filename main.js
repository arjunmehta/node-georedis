/**
 * Copyright (c) 2014, Arjun Mehta.
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy,
 * modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

var geohash = require('ngeohash');
var redis_clientZSetName = "geohashzset";
var redis_client;

var initialize = function(client, zSetName){
  redis_clientZSetName = zSetName || "geohashzset";
  redis_client = client;
};


/**
 * Range-Radius Index
 *
 * This index is a list of ranges that correspond to the accuracy associated with
 * a particular bitDepth in reverse order from 52 bits. ie. rangeIndex[0] represents
 * 52 bits and an accuracy of a 0.5971m radius, while rangeIndex[7] represents 38 bits (52-(7*2))
 * and 76.4378m radius accuracy etc.
 * 
 */
var rangeIndex = [  0.5971,
                    1.1943,
                    2.3889,
                    4.7774,
                    9.5547,
                    19.1095,
                    38.2189,
                    76.4378,
                    152.8757,
                    305.751,
                    611.5028,
                    1223.0056,
                    2446.0112,
                    4892.0224 ,
                    9784.0449,
                    19568.0898,
                    39136.1797,
                    78272.35938,
                    156544.7188,
                    313089.4375,
                    626178.875,
                    1252357.75,
                    2504715.5,
                    5009431,
                    10018863
                    ];


/**
 * Get Radius Bit Depth
 *
 * Returns a geohash integer bitDepth associated with a specific radius value in meters.
 *
 * @param {Number} radius
 * @returns {Number|null} bitDepth
 */
var rangeDepth = function(radius){
  for(var i=0; i < rangeIndex.length; i++){
    if(radius < rangeIndex[i]){
      return 52-(i*2);
    }
  }
  return 2;
};

/**
 * Nearby Hash Ranges by Resolution
 *
 * Returns a set of optimum ranges at bitDepth that contain all geohashes within range of the passed in coordinate values at the radiusBitDepth.
 *
 * @param {Number} lat
 * @param {Number} lon
 * @param {Number} radiusBitDepth (determines the range)
 * @param {Number} bitDepth (bit depth of final hash values)
 * @returns {Hash Integer Ranges} Array
 */
var getQueryRangesFromBitDepth = function(lat, lon, radiusBitDepth, bitDepth){

  bitDepth = bitDepth || 52;
  radiusBitDepth = radiusBitDepth || 48;

  var bitDiff = bitDepth - radiusBitDepth;
  if(bitDiff < 0){
    throw "bitDepth must be high enough to calculate range within radius";
  }

  var i;
  var ranges = [],
      range;

  var lowerRange = 0,
      upperRange = 0;

  var hash = geohash.encode_int(lat, lon, radiusBitDepth);
  var neighbors = geohash.neighbors_int(hash, radiusBitDepth);
  
  neighbors.push(hash);
  neighbors.sort();

  for(i=0; i<neighbors.length; i++){
    lowerRange = neighbors[i];
    upperRange = lowerRange + 1;    
    while(neighbors[i+1] === upperRange){
      neighbors.shift();
      upperRange = neighbors[i]+1;
    }    
    ranges.push([lowerRange, upperRange]);
  }
  
  for(i=0; i<ranges.length; i++){
    range = ranges[i];
    range[0] = leftShift(range[0], bitDiff);
    range[1] = leftShift(range[1], bitDiff);
  }

  return ranges;
};

function leftShift(integer, shft){
  return integer * Math.pow(2, shft);
}

/**
 * Nearby Hash Ranges by Radius
 *
 * Returns a set of optimum ranges at bitDepth that contain all geohashes within the radius of the passed in coordinate values.
 *
 * @param {Number} lat
 * @param {Number} lon
 * @param {Number} radius (in meters)
 * @param {Number} bitDepth (bit depth of final hash values)
 * @returns {Hash Integer Ranges} Array
 */
var getQueryRangesFromRadius = function(lat, lon, radius, bitDepth){

  bitDepth = bitDepth || 52;
  var radiusBitDepth = rangeDepth(radius);
  console.log("RADIUS BIT DEPTH:", radiusBitDepth);

  return getQueryRangesFromBitDepth(lat, lon, radiusBitDepth, bitDepth);
};

/**
 * Nearby Search (Asynchronous)
 *
 * @param {Hash Integer Ranges} ranges
 * @param {Object} options (client: {RedisClient}, zset: {Redis zSet name})
 * @param {Function} callBack
 */
var queryByRanges = function(ranges, options, callBack){

  if(typeof options === "function" && callBack === undefined){
    callBack = options;
    options = {};
  }

  var client = redis_client || options.client;
  var zset = redis_clientZSetName || options.zset;

  var i,
      range = [],
      rangeLength = ranges.length;

  var multi = client.multi();

  for(i=0; i<rangeLength; i++){
    range = ranges[i];
    multi.ZRANGEBYSCORE(zset, range[0], range[1]);
  }

  multi.exec(function(err, replies){
    var concatedReplies = [];
    for(i=0; i< replies.length; i++){
      concatedReplies = concatedReplies.concat(replies[i]);
    }
    if(callBack && typeof callBack === "function") callBack(err, concatedReplies);
  });
};

/**
 * Redise Proximity Search (Asynchronous)
 *
 * @param {Number} lat
 * @param {Number} lon
 * @param {Number} bitDepth (defaults to 52)
 * @param {Object} options (ranges: {Array}, radius: {Number}, radiusBitDepth: {Number}, bitDepth: {Number}, client: {RedisClient}, zset: {Redis zSet name})
 * @param {Function} callBack
 */
var queryByProximity = function(lat, lon, radius, options, callBack){

  if(typeof options === "function" && callBack === undefined){
    callBack = options;
    options = {};
  }

  var radiusBitDepth = 24;
  var bitDepth = options.bitDepth || 52;
  var ranges;

  if(options.ranges === undefined){
    radiusBitDepth = (options.radiusBitDepth !== undefined) ? (options.radiusBitDepth || 48) : rangeDepth(radius);
    ranges = getQueryRangesFromBitDepth(lat, lon, radiusBitDepth, bitDepth);
  }
  else{
    ranges = options.ranges;
  }
  
  queryByRanges(ranges, options, callBack);
};


/**
 * Add New Redis Coordinate (Asynchronous)
 *
 * @param {RedisClient} client
 * @param {Number} lat
 * @param {Number} lon
 * @param {String|Number} key_name
 * @param {Number} bit_Depth (defaults to 52)
 * @param {Function} callBack
 */
var addNewCoordinate = function(lat, lon, key_name, options, callBack){

  if(typeof options === "function" && callBack === undefined){
    callBack = options;
    options = {};
  }

  var bitDepth = options.bitDepth || 52;
  var client = redis_client || options.client;
  var zset = redis_clientZSetName || options.zset;

  client.zadd(zset, geohash.encode_int(lat, lon, bitDepth), key_name, callBack);
};


/**
 * UNDOCUMENTED A control for basic latitude/longitude box intersect query. Inefficient using redis (Asynchronous)
 *
 * @param {RedisClient} client
 * @param {Number} lat
 * @param {Number} lon
 * @param {String|Number} key_name
 * @param {Number} bit_Depth (defaults to 52)
 * @param {Function} callBack
 */
var queryCoordinatesInRange = function(client, lat, lon, radius, callBack){

  var ranges = getMinMaxs(lat, lon, radius);

  var multi = client.multi();
      multi.ZRANGEBYSCORE("index:lat", ranges.latmin, ranges.latmax);
      multi.ZRANGEBYSCORE("index:lon", ranges.lonmin, ranges.lonmax);

      multi.exec(function(err, replies){

        var replyLength = 0;
        for(var i=0; i<replies.length; i++){
          replyLength += replies[i].length;
        }
        // console.log("FOR REPLY LENGTH:",replyLength);

        var lats = arrayToObject(replies[0]);
        var lons = arrayToObject(replies[1]);

        var intersection = (replies[0].length < replies[1].length) ? intersect(lats, lons) : intersect(lons, lats);

        if(callBack && typeof callBack == "function") callBack(err, intersection);
      });
};

// HELPER FUNCTIONS

function getMinMaxs(lat, lon, radius){

  var latr = radius/111111;
  var lonr = radius/(111111 *  Math.abs(Math.cos(lat)));

  var latmin = lat - latr;
  var latmax = lat + latr;
  var lonmin = lon - lonr;
  var lonmax = lon + lonr;

  return {latmin: latmin, latmax: latmax, lonmin: lonmin, lonmax: lonmax};
}

function arrayToObject(a){
  var o = {};
  for(var i=0; i<a.length; i++){
    o[a[i]] = {};
  }
  return o;
}

function intersect(a, b){
  var intersection = {};
  var key;
  for(key in a){
    if(b[key] !== undefined){
      intersection[key] = {};
    }
  }
  return intersection;
}



var geohashDistance = {
  'initialize': initialize,
  'getQueryRangesFromBitDepth':getQueryRangesFromBitDepth,
  'getQueryRangesFromRadius':getQueryRangesFromRadius,
  'queryByRanges': queryByRanges,
  'query': queryByProximity,
  'addNewCoordinate': addNewCoordinate,
  'queryCoordinatesInRange': queryCoordinatesInRange
};


module.exports = geohashDistance;
