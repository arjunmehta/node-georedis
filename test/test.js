var test = require('assert');

var csv = require('csv');
var fs = require('fs');

var redis = require('redis');
var client = redis.createClient();

var proximity = require('../main.js');
proximity.initialize(client, "redisproximityzset");

var lat = 43.646838,
    lon = -79.403723;

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

var addArray = [];


exports.addCoordinate = function(test){

  client.flushall();

  test.expect(1);

  proximity.addCoordinate(43.6667, -79.4167, "Toronto", function (err, reply){
    if(err) throw err;

    test.equals(reply, 1);
    test.done();    
  });

};


exports.addCoordinates = function(test){  

  client.flushall();
  
  test.expect(2);

  var coordinateRange;
  var coordinateArray = [];
  var distance = 0;
  var count = 1;

  coordinateArray.push([lat, lon, "center_0"]);

  for (var i = 0; i < 100000; i++) {
    distance = i*(i/100);
    coordinateRange = proximity.getMinMaxs(lat, lon, distance);
    coordinateArray.push([coordinateRange.latmin, coordinateRange.lonmin, "sw_"+distance]);
    coordinateArray.push([coordinateRange.latmax, coordinateRange.lonmin, "nw_"+distance]);
    coordinateArray.push([coordinateRange.latmin, coordinateRange.lonmax, "se_"+distance]);
    coordinateArray.push([coordinateRange.latmax, coordinateRange.lonmax, "ne_"+distance]);
    count += 4;
  }

  proximity.addCoordinates(coordinateArray, function (err, reply){
    if(err) throw err;

    test.equal(err, null);
    test.equal(400001, reply);
    test.done();
  });

};


exports.queryBasic = function(test){

  test.expect(1);

  proximity.query(lat, lon, 50000, function(err, replies){
    if(err) throw err;
    // console.log("NUMBER OF GEOHASH MATCHES", replies.length);
    test.equal(replies.length, 6835);
    test.done();
  }); 
};


exports.performantQuery = function(test){

  test.expect(1);

  var ranges = proximity.getQueryRangesFromRadius(lat, lon, 50000);

  proximity.queryByRanges(ranges, function(err, replies){
    if(err) throw err;
    test.equal(replies.length, 6835);
    test.done();
  });

};


exports.removeCoordinate = function(test){

  test.expect(1);

  var oneToDelete = "";
  var ranges = proximity.getQueryRangesFromRadius(lat, lon, 50000);

  proximity.queryByRanges(ranges, function(err, replies){
    if(err) throw err;
    oneToDelete = replies[replies.length-1];

    proximity.removeCoordinate(oneToDelete, function(err, reply){
      if(err) throw err;
      // console.log("TIMESTAMP Delete One", new Date().getTime()-startTime);
      // console.log(JSON.stringify(reply));
      test.equal(reply, 1);
      test.done();
    });  
  });
};


exports.removeCoordinates = function(test){

  test.expect(1);

  var arrayToDelete = [];
  var ranges = proximity.getQueryRangesFromRadius(lat, lon, 50000);

  proximity.queryByRanges(ranges, function(err, replies){

    if(err) throw err;
    arrayToDelete = replies;

    proximity.removeCoordinates(arrayToDelete, function(err, reply){
      if(err) throw err;
      test.equal(reply, 6834);
      
      test.done();
    });
  });
};


exports.addNearbyRanges = function(test){

  client.flushall();
  
  test.expect(2);

  var coordinateRange;
  var coordinateArray = [];
  var distance = 0;
  var count = 1;

  coordinateArray.push([lat, lon, "center_0"]);

  for (var i = 0; i < 100000; i++) {
    distance = i*(i/100);
    coordinateRange = proximity.getMinMaxs(lat, lon, distance);
    coordinateArray.push([coordinateRange.latmin, coordinateRange.lonmin, "sw_"+distance]);
    coordinateArray.push([coordinateRange.latmax, coordinateRange.lonmin, "nw_"+distance]);
    coordinateArray.push([coordinateRange.latmin, coordinateRange.lonmax, "se_"+distance]);
    coordinateArray.push([coordinateRange.latmax, coordinateRange.lonmax, "ne_"+distance]);
    count += 4;
  }

  proximity.addCoordinates(coordinateArray, function (err, reply){
    if(err) throw err;

    test.equal(err, null);
    test.equal(count, reply);
    test.done();
  });
};


var startBitDepth = 52;

exports.testRangeBitDepths = function(test){

  test.expect(25);

  query(startBitDepth, test, function(){
    console.log("DONE TEXT RANGE BIT DEPTHS");
    test.done();
  });

};


function query(bitDepth, test, next){

  // console.log("Querying bit depth", lat, lon, bitDepth);

  proximity.queryByBitDepth(lat, lon, bitDepth, function (err, replies){

    if(err) throw err;

    var max = 0;
    var maxname = "";

    for (var i = 0; i < replies.length; i++) {
      var split = replies[i].split("_");
      if(Number(split[1]) > max){
        max = Number(split[1]);
        maxname = replies[i];
      }
    }

    test.equal((max > rangeIndex[(52-bitDepth)/2] || max < rangeIndex[((52-bitDepth)/2) + 1]), true);

    console.log("Max Radius for BitDepth", bitDepth, max, maxname );

    startBitDepth -= 2;

    if(startBitDepth > 2){
      query(startBitDepth, test, next);
    }
    else{
      next();
    }
  });
}


var startRadius = 0.4;

exports.testRangesRadius = function(test){

  test.expect(22);

  queryRadius(startRadius, test, function(){
    test.done();    
  });

};

function queryRadius(radius, test, next){

  // console.log("Querying bit depth", lat, lon, radius);

  proximity.query(lat, lon, radius, function (err, replies){

    if(err) throw err;

    var max = 0;
    var maxname = "";

    for (var i = 0; i < replies.length; i++) {
      var split = replies[i].split("_");
      if(Number(split[1]) > max){
        max = Number(split[1]);
        maxname = replies[i];
      }
    }

    test.equal((max > radius-(radius/2) || max < radius+(radius/2)), true);

    console.log("Max Radius for Radius", radius, max, maxname );

    startRadius *= 2;

    if(startRadius < 1000000){
      queryRadius(startRadius, test, next);
    }
    else{
      next();
    }
  });
}


exports.differentSets = function(test){

  test.expect(2);

  var people       = [[43.6667,-79.4167, "John"],
                     [39.9523,-75.1638, "Shankar"],
                     [37.4688,-122.1411, "Cynthia"],
                     [37.7691,-122.4449, "Chen"]];

  var places       = [[43.6667,-79.4167, "Toronto"],
                     [39.9523,-75.1638, "Philadelphia"],
                     [37.4688,-122.1411, "Palo Alto"],
                     [37.7691,-122.4449, "San Francisco"],
                     [47.5500,-52.6667, "St. John's"]];


  proximity.addCoordinates(people, {zset: "locations:people"}, function(err, reply){
    if(err) throw err;
    // console.log("ADD successful:", reply);

    proximity.addCoordinates(places, {zset: "locations:places"}, function(err, reply){
      if(err) throw err;
      // console.log("ADD successful:", reply);


      // will find all PEOPLE ~5000m from the passed in coordinate
      proximity.query(39.9523, -75.1638, 5000, {zset: "locations:people"}, function(err, people){
        if(err) throw err;
        // console.log(people);

        test.equal(people[0], "Shankar");


        // will find all PLACES ~5000m from the passed in coordinate
        proximity.query(39.9523, -75.1638, 5000, {zset: "locations:places"}, function(err, places){

          if(err) throw err;
          // console.log(places);

          test.equal(places[0], "Philadelphia");
          test.done();  
          client.quit();        

        });
      });
    });
  });
};


exports.tearDown = function(done){
  done();
};


return exports;