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
  return null;
};

/**
 * Nearby Hash Ranges by Resolution
 *
 * Returns 9 ranges including ranges for the coordinate itself, plus its hash neighbors.
 *
 * @param {Number} lat
 * @param {Number} lon
 * @param {Number} rBitDepth (determines the range)
 * @param {Number} bitDepth (bit depth of final hash values)
 * @returns {Hash Integer Ranges} Array
 */
var getBitDepthGeohashRanges = function(lat, lon, rBitDepth, bitDepth){

  bitDepth = bitDepth || 52;
  rBitDepth = rBitDepth || 48;

  var bitDiff = bitDepth - rBitDepth;
  if(bitDiff < 0){
    throw "bitDepth must be high enough to calculate range within radius";
  }

  var i, j;

  var ranges = [];
  var range;

  var lowerRange = 0,
      upperRange = 0;

  var hash = geohash.encode_int(lat, lon, rBitDepth);
  var neighbors = geohash.neighbors_int(hash, rBitDepth);
  
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
 * Returns 9 ranges including ranges for the coordinate itself, plus its hash neighbors.
 * Slower than the direct forBitDepth method as it needs to look up bitDepth based on radius.
 *
 * @param {Number} lat
 * @param {Number} lon
 * @param {Number} radius (in meters)
 * @param {Number} bitDepth (bit depth of final hash values)
 * @returns {Hash Integer Ranges} Array
 */
var getRadiusGeohashRanges = function(lat, lon, radius, bitDepth){
  var rBitDepth = rangeDepth(radius);
  console.log("RADIUS BIT DEPTH:", rBitDepth);

  return getBitDepthGeohashRanges(lat, lon, rBitDepth, bitDepth);
};

/**
 * Nearby Search (Asynchronous)
 *
 * @param {RedisClient} client
 * @param {Hash Integer Ranges} ranges
 * @param {Function} callBack
 */
var redis_findInRange = function(client, ranges, callBack){

  var rangeLength = ranges.length;
  var range = [];
  var i;

  var multi = client.multi();
  for(i=0; i<rangeLength; i++){
    range = ranges[i];
    multi.ZRANGEBYSCORE("myzset", range[0], range[1]);
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
 * @param {Object} options (ranges: {Array}, radius: {Number}, rBitDepth: {Number}, client: {RedisClient})
 * @param {Function} callBack
 */
var redis_proximity = function(lat, lon, bitDepth, options, callBack){

  bitDepth = bitDepth || 52;
  var rBitDepth = 24;

  if(typeof options === "function" && callBack === undefined){
    callBack = options;
    options = {};
  }

  var ranges;
  var client = redis_client || options.client;

  if(options.ranges === undefined){    

    rBitDepth = (options.radius !== undefined) ? rangeDepth(options.radius) : (options.rBitDepth || 48);
    ranges = getBitDepthGeohashRanges(lat, lon, rBitDepth, bitDepth);
  }
  else{
    ranges = options.ranges;
  }
  
  redis_findInRange(client, ranges, callBack);
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
var redis_addNewCoordinate = function(lat, lon, key_name, bitDepth, options, callBack){

  if(typeof options === "function" && callBack === undefined){
    callBack = options;
    options = {};
  }

  bitDepth = bitDepth || 52;
  var client = redis_client || options.client;
  var zSetName = redis_clientZSetName || options.zset;

  client.zadd(zSetName, geohash.encode_int(lat, lon, bitDepth), key_name, callBack);
};




var redis_findCoordinatesInRangeNaive = function(client, lat, lon, radius, callBack){

  var ranges = getMinMaxs(lat, lon, radius);

  var multi = client.multi();
      multi.ZUNIONSTORE("temp:lat", 1, "index:lat", "WEIGHTS", 1);
      multi.ZREMRANGEBYSCORE("temp:lat", 0, ranges.latmin);
      multi.ZREMRANGEBYSCORE("temp:lat", ranges.latmax, "INF");
      multi.ZUNIONSTORE("temp:lon", 1, "index:lon", "WEIGHTS", 1);
      multi.ZREMRANGEBYSCORE("temp:lon", 0, ranges.lonmin);
      multi.ZREMRANGEBYSCORE("temp:lon", ranges.lonmax, "INF");
      multi.ZINTERSTORE("temp:result", 2, "temp:lon", "temp:lat");
      multi.ZRANGE("temp:result", 0, -1, callBack);

      multi.exec(callBack);
};


var redis_findCoordinatesInRangeMin = function(client, lat, lon, radius, callBack){

  var startTime = new Date().getTime();

  var ranges = getMinMaxs(lat, lon, radius);

  var multi = client.multi();
      multi.ZRANGEBYSCORE("index:lat", ranges.latmin, ranges.latmax);
      multi.ZRANGEBYSCORE("index:lon", ranges.lonmin, ranges.lonmax);
      multi.exec(function(err, replies){

        // console.log("TIMESTAMP REDIS RESULT for Coordinate Range", new Date().getTime()-startTime);
        var replyLength = 0;
        for(var i=0; i<replies.length; i++){
          replyLength += replies[i].length;
        }
        // console.log("FOR REPLY LENGTH:",replyLength);

        startTime = new Date().getTime();

        var lats = arrayToObject(replies[0]);
        var lons = arrayToObject(replies[1]);

        var intersection = (replies[0].length < replies[1].length) ? intersect(lats, lons) : intersect(lons, lats);

        if(callBack && typeof callBack == "function") callBack(err, intersection);
        // console.log(replies);
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
  'getBitDepthGeohashRanges':getBitDepthGeohashRanges,
  'getRadiusGeohashRanges':getRadiusGeohashRanges,
  'redis_findInRange': redis_findInRange,
  'redis_proximity': redis_proximity,
  'redis_addNewCoordinate': redis_addNewCoordinate,
  'redis_findCoordinatesInRangeNaive': redis_findCoordinatesInRangeNaive,
  'redis_findCoordinatesInRangeMin': redis_findCoordinatesInRangeMin
};


module.exports = geohashDistance;
