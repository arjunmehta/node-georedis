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

var redis_clientZSetName;
var redis_client;

var initialize = function(client, zSetName){
  redis_clientZSetName = zSetName;
  redis_client = client;

  return this;
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
var rangeIndex = [  0.6,            //52
                    1,              //50
                    2.19,           //48
                    4.57,           //46
                    9.34,           //44
                    14.4,           //42  
                    33.18,          //40  
                    62.1,           //38  
                    128.55,         //36    
                    252.9,          //34    
                    510.02,         //32
                    1015.8,         //30
                    2236.5,         //28
                    3866.9,         //26
                    8749.7,         //24      
                    15664,          //22      
                    33163.5,        //20      
                    72226.3,        //18        
                    150350,         //16        
                    306600,         //14        
                    474640,         //12      
                    1099600,        //10      
                    2349600,        //8      
                    4849600,        //6    
                    10018863        //4
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
  for(var i=0; i < rangeIndex.length-1; i++){
    if(radius - rangeIndex[i] < rangeIndex[i+1] - radius){
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
  // console.log("RADIUS BIT DEPTH:", radiusBitDepth);

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

  var client = options.client !== undefined ? options.client : redis_client;
  var zset = options.zset !== undefined ? options.zset : redis_clientZSetName;

  var i,
      range = [];

  var multi = client.multi();

  for(i=0; i<ranges.length; i++){
    range = ranges[i];
    multi.ZRANGEBYSCORE(zset, range[0], range[1]);
  }

  multi.exec(function(err, replies){
    var concatedReplies = [];
    for(i=0; i< replies.length; i++){
      concatedReplies = concatedReplies.concat(replies[i]);
    }
    if(typeof callBack === "function") callBack(err, concatedReplies);
  });
};


/**
 * Redis Proximity Search (Asynchronous)
 *
 * @param {Number} lat
 * @param {Number} lon
 * @param {Number} radius (defaults to 5000)
 * @param {Object} options (ranges: {Array}, radiusBitDepth: {Number}, bitDepth: {Number}, client: {RedisClient}, zset: {Redis zSet name})
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
    radiusBitDepth = options.radiusBitDepth !== undefined ? options.radiusBitDepth : rangeDepth(radius);
    ranges = getQueryRangesFromBitDepth(lat, lon, radiusBitDepth, bitDepth);
  }
  else{
    ranges = options.ranges;
  }
  
  queryByRanges(ranges, options, callBack);
};


/**
 * Redis Query by Bit Depth (Asynchronous)
 *
 * @param {Number} lat
 * @param {Number} lon
 * @param {Number} radiusBitDepth (defaults to 24)
 * @param {Object} options (ranges: {Array}, bitDepth: {Number}, client: {RedisClient}, zset: {Redis zSet name})
 * @param {Function} callBack
 */
var queryByBitDepth = function(lat, lon, radiusBitDepth, options, callBack){

  if(typeof options === "function" && callBack === undefined){
    callBack = options;
    options = {};
  }

  radiusBitDepth = radiusBitDepth || 24;
  var bitDepth = options.bitDepth || 52;
  var ranges = getQueryRangesFromBitDepth(lat, lon, radiusBitDepth, bitDepth);
 
  queryByRanges(ranges, options, callBack);
};


/**
 * Add New Redis Coordinate (Asynchronous)
 *
 * @param {Number} lat
 * @param {Number} lon
 * @param {String|Number} key_name
 * @param {Object} options (bitDepth: {Number}, client: {RedisClient}, zset: {Redis zSet name})
 * @param {Function} callBack
 */
var addCoordinate = function(lat, lon, key_name, options, callBack){

  if(typeof options === "function" && callBack === undefined){
    callBack = options;
    options = {};
  }

  var bitDepth = options.bitDepth || 52;
  var client = options.client !== undefined ? options.client : redis_client;
  var zset = options.zset !== undefined ? options.zset : redis_clientZSetName;

  client.zadd(zset, geohash.encode_int(lat, lon, bitDepth), key_name, callBack);
};


/**
 * Add New Redis Coordinates (Asynchronous)
 * 
 * Takes an array of coordinate arrays in the form [lat, lon, key_name] and adds them to the zset
 *
 * @param {Array} coordinateArray Set
 * @param {Object} options (bitDepth: {Number}, client: {RedisClient}, zset: {Redis zSet name})
 * @param {Function} callBack
 */
var addCoordinates = function(coordinatesArray, options, callBack){

  if(typeof options === "function" && callBack === undefined){
    callBack = options;
    options = {};
  }

  var bitDepth = options.bitDepth || 52;
  var client = options.client !== undefined ? options.client : redis_client;
  var zset = options.zset !== undefined ? options.zset : redis_clientZSetName;

  var args = [];
  var i, hash;

  for (i=0; i<coordinatesArray.length; i++){
    args.push(geohash.encode_int(coordinatesArray[i][0], coordinatesArray[i][1], bitDepth));
    args.push(coordinatesArray[i][2]);
  }

  args.unshift(zset);

  client.zadd(args, callBack);
};


/**
 * Remove Redis Coordinate (Asynchronous)
 *
 * @param {String|Number} key_name
 * @param {Object} options (client: {RedisClient}, zset: {Redis zSet name})
 * @param {Function} callBack
 */
var removeCoordinate = function(key_name, options, callBack){

  if(typeof options === "function" && callBack === undefined){
    callBack = options;
    options = {};
  }

  var client = options.client !== undefined ? options.client : redis_client;
  var zset = options.zset !== undefined ? options.zset : redis_clientZSetName;

  client.zrem(zset, key_name, callBack);
};


/**
 * Remove Redis Coordinates (Asynchronous)
 * 
 * Takes an array of coordinate Arrays in the form [lat, lon, key_name] and adds them to the zset
 *
 * @param {String|Number} key_name
 * @param {Object} options (client: {RedisClient}, zset: {Redis zSet name})
 * @param {Function} callBack
 */
var removeCoordinates = function(coordinateKeys, options, callBack){

  if(typeof options === "function" && callBack === undefined){
    callBack = options;
    options = {};
  }

  var client = options.client !== undefined ? options.client : redis_client;
  var zset = options.zset !== undefined ? options.zset : redis_clientZSetName;

  coordinateKeys.unshift(zset);

  client.zrem(coordinateKeys, callBack);
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

        if(typeof callBack == "function") callBack(err, intersection);
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

  'getQueryRangesFromBitDepth':getQueryRangesFromBitDepth,  // will deprecate interface
  'getQueryRangesFromRadius':getQueryRangesFromRadius,      // will deprecate interface
  'queryByRanges': queryByRanges,                           // will deprecate interface
  'queryByBitDepth': queryByBitDepth,                       // will deprecate interface  
  'addNewCoordinate': addCoordinate,                        // will deprecate interface
  
  'getMinMaxs': getMinMaxs,                                 // really just for testing

  'addCoordinate': addCoordinate,
  'addCoordinates': addCoordinates,
  'removeCoordinate': removeCoordinate,
  'removeCoordinates': removeCoordinates,

  'query': queryByProximity,  
  'getQueryCache': getQueryRangesFromRadius,
  'queryWithCache': queryByRanges
};


module.exports = geohashDistance;
