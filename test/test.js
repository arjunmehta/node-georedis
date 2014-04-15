var csv = require('csv');
var fs = require('fs');

var redis = require('redis');
var client = redis.createClient();

var proximity = require('../main.js');
proximity.initialize(client, "redisproximityzset");

var lat = 43.646838,
    lon = -79.403723;

var startTime;


var oneToDelete = "";
var arrayToDelete = [];
var addArray = [];


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


function performantQuery(switcher){

  var ranges = proximity.getQueryRangesFromRadius(lat, lon, 50000);
  startTime = new Date().getTime();

  proximity.queryByRanges(ranges, function(err, replies){
    if(err) throw err;
    console.log("TIMESTAMP Concated Replies Performant", new Date().getTime()-startTime);
    // console.log(JSON.stringify(replies));
    console.log("NUMBER OF GEOHASH MATCHES", replies.length);

    if(switcher === undefined){
      oneToDelete = replies[replies.length-1];
      setTimeout(function(){
        deleteOne();
      }, 3000);
    }
    else if(switcher === "one"){
      arrayToDelete = replies;
      setTimeout(function(){
        deleteMany();
      }, 3000);
    }

  });
}


function deleteOne(){
  startTime = new Date().getTime();
  proximity.removeCoordinate(oneToDelete, function(err, reply){
    if(err) throw err;
    console.log("TIMESTAMP Delete One", new Date().getTime()-startTime);
    console.log(JSON.stringify(reply));

    setTimeout(function(){
      performantQuery("one");
    }, 3000);

  });  
}


function deleteMany(){
  startTime = new Date().getTime();
  proximity.removeCoordinates(arrayToDelete, function(err, reply){
    if(err) throw err;
    console.log("TIMESTAMP Delete Many", new Date().getTime()-startTime);
    console.log(JSON.stringify(reply));

    setTimeout(function(){
      performantQuery("many");
    }, 3000);

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
      if(err) throw err;
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
      addFromCSVMulti();
    }, 3000);

  })
  .on('error', function(error){
    console.log(error.message);
  });  
}

function addFromCSVMulti(){  

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
      console.log('END Time: '+ (new Date().getTime()-startTime-3224) );

      if(err) throw err;

      setTimeout(function(){
        basicQuery();
      }, 3000);

    });


  })
  .on('error', function(error){
    console.log(error.message);
  });  
}


addFromCSV();