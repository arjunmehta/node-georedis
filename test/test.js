var redis   = require('redis');
var fs = require('fs');
var csv = require('csv');

var geohash = require('ngeohash');
var distance = require('./main.js');

var client = redis.createClient();

var hash = "";
var j, 
    sign = 1,
    lat = 43.646838,
    lon = -79.403723;

distance.initialize(client, "myzset");


console.log("GEOHASH32", geohash.encode_int(lat, lon, 32));
console.log("/////////");
console.log("GEOHASH46", geohash.encode_int(lat, lon, 46));
console.log("/////////");
console.log("NEIGHBOURSINT32", geohash.neighbors_int(1702789509, 32));
console.log("/////////");
console.log("NEIGHBOURSINT46", geohash.neighbors_int(27898503327470, 46));



console.log(geohash.bboxes_int(30, 120, 30.0001, 120.0001, 50));




// var ranges = distance.getRadiusGeohashRanges(lat, lon, 50000, 52);
// // ranges = distance.getBitDepthGeohashRanges(lat, lon, 24, 52);

// // console.log("RANGES MAIN", ranges);
// // console.log("TIMESTAMP Range Calc:", new Date().getTime()-startTime);

// setTimeout(function(){
//   getNearby();
// }, 2000);

// // addFromCSV();

// function getNearby(){
//   var startTime = new Date().getTime();
//   distance.redis_proximity(lat, lon, 52, {client: client, ranges: ranges}, function(err, replies){
//     console.log("TIMESTAMP Concated Replies", new Date().getTime()-startTime);
//     console.log(JSON.stringify(replies));
//     console.log("NUMBER OF GEOHASH MATCHES", replies.length);
//   });
// }


// function addFromCSV(){  

//   var startTime = new Date().getTime();
//   var i = 0;
//   csv()
//   .from.path(__dirname+'/GeoLiteCity-Location.csv', { delimiter: ',', escape: '"' })
//   .on('record', function(row,index){

//     distance.redis_addNewCoordinate(Number(row[5]), Number(row[6]), row[3]+row[4], 52);
   
//     if(i%1000 === 0){
//       console.log(i, ":", row[3]+row[4], ":", hash);
//     }
//     i++;

//   })
//   .on('close', function(count){
//     // when writing to a file, use the 'close' event
//     // the 'end' event may fire before the file has been written
//     console.log('CLOSE Number of lines: '+count);
//     console.log('CLOSE Time: '+ (new Date().getTime()-startTime) );

//   }).on('end', function(end){

//     console.log('END Number of lines: '+end);
//     console.log('END Time: '+ (new Date().getTime()-startTime-3224) );

//   })
//   .on('error', function(error){
//     console.log(error.message);
//   });

// }