var test = require('assert');

var csv = require('csv');
var fs = require('fs');

var redis = require('redis');
var client = redis.createClient();

var proximity = require('../main.js');
proximity.initialize(client, "redisproximityzset");

var lat = 43.646838,
    lon = -79.403723;

var oneToDelete = "";
var arrayToDelete = [];
var addArray = [];


exports.basicQuery = function(test){

  proximity.query(lat, lon, 50000, function(err, replies){
    if(err) throw err;
    console.log("NUMBER OF GEOHASH MATCHES", replies.length);
    test.equal(replies.length, 13260);
    test.done();
  }); 
};


exports.performantQuery = function(test){
  var ranges = proximity.getQueryRangesFromRadius(lat, lon, 50000);

  proximity.queryByRanges(ranges, function(err, replies){
    if(err) throw err;
    test.equal(replies.length, 13260);
    test.done();
  });

};

exports.deleteOne = function(test){
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


exports.deleteMany = function(test){

  var ranges = proximity.getQueryRangesFromRadius(lat, lon, 50000);

  proximity.queryByRanges(ranges, function(err, replies){

    if(err) throw err;
    arrayToDelete = replies;

    proximity.removeCoordinates(arrayToDelete, function(err, reply){
      if(err) throw err;

      test.equal(reply, 13259);
      test.done();
    });
  });
};


exports.addFromCSV = function(){  

  startTime = new Date().getTime();
  var i = 0;

  var lat, lon;

  csv()
  .from.path(__dirname+'/GeoLiteCity-Location.csv', { delimiter: ',', escape: '"' })
  .on('record', function(row,index){

    lat = Number(row[5]);
    lon = Number(row[6]);
    name = row[3]+row[4];

    proximity.addNewCoordinate(lat, lon, name, function(err, reply){
      if(err) throw err;
      if(i%1000 === 0){
        console.log(i, ":", name, lat, lon, reply, err);
      }
    });  

    i++;

  })
  .on('close', function(count){
    // when writing to a file, use the 'close' event
    // the 'end' event may fire before the file has been written
    console.log('CLOSE Number of lines: '+count);
    console.log('CLOSE Time: '+ (new Date().getTime()-startTime) );

  }).on('end', function(end){

    console.log('END Number of lines: '+end);
    console.log('END Time: '+ (new Date().getTime()-startTime-3224) );

    test.equal(end, 509068);
    test.done();

  })
  .on('error', function(error){
    console.log(error.message);
  });  
};

exports.addFromCSVMulti = function(){  

  client.flushall();

  startTime = new Date().getTime();
  var i = 0;

  var lat, lon;

  csv()
  .from.path(__dirname+'/GeoLiteCity-Location.csv', { delimiter: ',', escape: '"' })
  .on('record', function(row,index){

    lat = Number(row[5]);
    lon = Number(row[6]);
    name = row[3]+row[4];
    addArray.push([lat, lon, name]);    
   
    if(i%1000 === 0){
      console.log(i, ":", name, lat, lon);
    }
    i++;

  })
  .on('close', function(count){
    // when writing to a file, use the 'close' event
    // the 'end' event may fire before the file has been written
    console.log('CLOSE Number of lines: '+count);
    console.log('CLOSE Time: '+ (new Date().getTime()-startTime) );

  }).on('end', function(end){

    console.log('END Number of lines: '+end);

    proximity.addCoordinates(addArray, function(err, reply){
      if(err) throw err;
      // console.log('END Time: '+ (new Date().getTime()-startTime-3224) );
      // console.log('Add Coordinates Multi Reply ', err, reply);
      test.equal(err, null);
      test.equal(reply, 432346);
      test.done();
    });


  })
  .on('error', function(error){
    console.log(error.message);
  });  
};

return exports;