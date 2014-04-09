var csv = require('csv');
var fs = require('fs');

var redis = require('redis');
var client = redis.createClient();

var proximity = require('../main.js');
proximity.initialize(client, "redisproximityzset");

var lat = 43.646838,
    lon = -79.403723;

var startTime;


function basicQuery(){
  startTime = new Date().getTime();
  proximity.query(lat, lon, 50000, function(err, replies){
    if(err) throw err;
    console.log("TIMESTAMP Concated Replies Basic Query", new Date().getTime()-startTime);
    // console.log(JSON.stringify(replies));
    console.log("NUMBER OF GEOHASH MATCHES", replies.length);

    setTimeout(function(){
      performantQuery();
    }, 3000);

  });  
}


function performantQuery(){

  var ranges = proximity.getQueryRangesFromRadius(lat, lon, 50000);
  startTime = new Date().getTime();

  proximity.queryByRanges(ranges, function(err, replies){
    if(err) throw err;
    console.log("TIMESTAMP Concated Replies Performant", new Date().getTime()-startTime);
    // console.log(JSON.stringify(replies));
    console.log("NUMBER OF GEOHASH MATCHES", replies.length);
  });
}


function addFromCSV(){  

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

    });
   
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
    console.log('END Time: '+ (new Date().getTime()-startTime-3224) );

    setTimeout(function(){
      basicQuery();
    }, 3000);

  })
  .on('error', function(error){
    console.log(error.message);
  });  
}

addFromCSV();