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

var clientZSetName = "geohashzset";

/**
 * Range-Radius Index
 *
 * The index is a list of ranges that correspond to the accuracy associated with
 * a particular bitDepth in reverse order from 52 bits. ie. rangeIndex[0] represents
 * 52 bits and an accuracy of a 0.5971m radius, while rangeIndex[7] represents 38 bits (52-(7*2))
 * and 76.4378m radius accuracy.
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
var hashIntegerRangesforBitDepth = function(lat, lon, rBitDepth, bitDepth){

  bitDepth = bitDepth || 52;  
  rBitDepth = rBitDepth || 48;

  var bitDiff = bitDepth - rBitDepth;
  if(bitDiff < 0){
    throw "bitDepth must be high enough to calculate range within radius";
  }

  var hash = geohash.encode_int(lat, lon, rBitDepth);
  var ranges = [];
  var neighbors = geohash.neighbors_int(hash, rBitDepth);

  // console.log("NEIGHBOURS:", hash, neighbors);

  for(var i=0; i< neighbors.length; i++){
    ranges.push(buildRange(neighbors[i], bitDiff));
  }

  return ranges;
};

function buildRange(hash_integer, diff){

  // console.log(hash_integer);

  var lowerRange = leftShift(hash_integer, diff);
  var upperRange = leftShift(hash_integer + 1, diff);
  return [lowerRange, upperRange];
}

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
var hashIntegerRangesforRadius = function(lat, lon, radius, bitDepth){
  var rBitDepth = rangeDepth(radius);
  return hashIntegerRangesforBitDepth(lat, lon, rBitDepth, bitDepth);
};



var setClientZSetName = function(zset_name){
  clientZSetName = zset_name;
};

/**
 * Nearby Search (Asynchronous)
 *
 * Returns 9 ranges including ranges for the coordinate itself, plus its hash neighbors.
 * Slower than the direct forBitDepth method as it needs to look up bitDepth based on radius.
 *
 * @param {RedisClient} client
 * @param {Hash Integer Ranges} ranges
 * @returns {Connected Neighbors in Ranges} Array
 */
var redis_nearbySearch = function(client, ranges, callBack){

  var rangeCount = 0;
  var rangeLength = ranges.length;
  var args = [];


  var multi = client.multi();
  for(var i=0; i<rangeLength; i++){
    // console.log("ranges", ranges[i][0], ranges[i][1]);
    multi.ZRANGEBYSCORE("myzset", ranges[i][0], ranges[i][1]);
    // args.push(["zrangebyscore", "myzset", ranges[i][0], ranges[i][1]]);
  }

  // client.multi(args).exec(function (err, replies) {
  //   if(callBack && typeof callBack == "function") callBack(err, replies);
  // });

  multi.exec(function (err, replies) {
    // console.log(replies);
    if(callBack && typeof callBack == "function") callBack(err, replies);
  });
};

/**
 * Add New Redis Coordinate (Asynchronous)
 *
 * Returns 9 ranges including ranges for the coordinate itself, plus its hash neighbors.
 * Slower than the direct forBitDepth method as it needs to look up bitDepth based on radius.
 *
 * @param {RedisClient} client
 * @param {Hash Integer Ranges} ranges
 * @returns {Connected Neighbors in Ranges} Array
 */
function redis_addNewCoordinate(client, lat, lon, key_name, bitDepth, callBack){

  if(typeof bitDepth === "function"){
    callBack = bitDepth;
    bitDepth = 52;
  }
  else{
    bitDepth = bitDepth || 52;
  }

  client.zadd(clientZSetName, geohash.encode_int(lat, lon, bitDepth), key_name, function (err, res){
    if(err){
      // console.log("ERROR", err);
      if(callBack && typeof callBack === "function") callBack(err, res);
    }
  });
}


var geohashDistance = {
  'rangeDepth': rangeDepth,
  'hashIntegerRangesforBitDepth':hashIntegerRangesforBitDepth,
  'hashIntegerRangesforRadius':hashIntegerRangesforRadius,
  'redis_setClientZSetName': setClientZSetName,
  'redis_nearbySearch': redis_nearbySearch,
  'redis_addNewCoordinate': redis_addNewCoordinate
};


module.exports = geohashDistance;
