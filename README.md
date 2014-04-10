node-redis-proximity
=====================

A node.js module that leverages the functionality of [node-geohash (ngeohash)](https://github.com/sunng87/node-geohash) to provide super fast proximity searches for geo coordinates.

It should be noted that the method used here is likely to not be very precise, but the query is very fast, and should be appropriate for most consumer applications looking for this basic function.

Please leave feedback in the module's [GitHub issues tracker](https://github.com/arjunmehta/node-redis-proximity/issues).

## Installation

```bash
npm install redis-proximity
```

## Example Usage
This module requires a functioning redis server running in order to work. Ideally, you should initialize it with your client and a zset name with which it will use for coordinate queries. But these can be specified in your function calls through method options.

Of course you need to have redis installed on your machine and accessible to node. Visit [node-redis](https://github.com/mranney/node_redis) for more information on using redis into your node environment.

```javascript
var redis = require('redis');
var client = redis.createClient();

var proximity = require('redis-proximity');
proximity.initialize(client, "mygeohashzset");
```

### Add Coordinates
Generally you'll have some trigger to add new coordinates to your set (a user logs in, or a new point gets added in your application), or perhaps you'll want to load all the coordinates from a file of existing places. Whatever the case you should add them to redis as folows:

```javascript
proximity.addNewCoordinate(-12.29, 22.298, "CoordinateName", function(err, reply){
  if(err) throw err;
  console.log("ADD successful:", reply)
});

//Or Plainly if you don't care about handling errors (you should ideally handle errors though!).
proximity.addNewCoordinate(-12.29, 22.298, "CoordinateName");
```

### Query for proximal points
Now you can look for points that exist within a certain range of any other coordinate in the system.

```javascript
//look for all points within 5000m of Toronto.
proximity.query(43.646838, -79.403723, 5000, function(err, replies){
  if(err) throw err;
  console.log(replies);
});
```

# API

## Initialization

### proximity.initialize(redisClient, redisZSetName);
Initialize the module with a redis client, and a ZSET name. This is not required, but will slightly improve efficiency and make your life easier. If you don't initialize, you will need to pass in a client and zset name as options for method calls.

## Adding Coordinates

### proximity.addNewCoordinate(lat, lon, {options}, callBack);
Add a new coordinate to the your set. You can get quite technical here by specifying the geohash integer resolution at which to store (MUST BE CONSISTENT), as well as the specific geohash ranges to query (see proximity.queryByRanges).

#### Options
- `bitDepth: {Number, default is 52}`: the bit depth you want to store your geohashes in, usually the highest possible (52 bits for javascript). MUST BE CONSISTENT. If you set this to another value other than 52, you will have to ensure you set bitDepth in options for querying methods.
- `client: {redisClient}`
- `zset: {String}`


## Basic Querying

### proximity.query(lat, lon, radius, {options}, callBack);
Use this function for a basic search by proximity within the given latitude and longitude and radius (in meters). It is not ideal to use this method if you intend on making the same query multiple times. **If performance is important and you'll be making the same query over and over again, it is recommended you instead have a look at proximity.queryByRanges and promixity.getQueryRangesFromRadius.** Otherwise this is an easy method to use.

**Options:**
- `radiusBitDepth: {Number, default is 48}`: This is the bit depth that is associated with a search radius. It will override your radius setting, so if you use this option, for good form pass in `null` as your radius.
- `bitDepth: {Number, default is 52}`: the bit depth your geohashes are stored in if they are not in the default 52 bits.
- `client: {redisClient}`
- `zset: {String}`



## Performant Querying

If you intend on performing the same query over and over again with the same initial coordinate and the same distance, you should cache the **geohash ranges** that are used to search for nearby locations. The geohash ranges are what the methods ultimately search within to find nearby points. So keeping these stored in a variable some place and passing them into a more basic search function will save some cycles (at least 5ms on a basic machine). This will save you quite a bit of processing time if you expect to refresh your searches often, and especially if you expect to have empty results often. Your processor is probably best used for other things.

### proximity.getQueryRangesFromRadius(lat, lon, radius, {bitDepth=52});
Get the query ranges to use with **proximity.queryByRanges**. This returns an array of geohash ranges to search your set for. `bitDepth` is optional and defaults to 52, set it if you have chosen to store your coordinates at a different bit depth. Store the return value of this function for making the same query often.

### proximity.queryByRanges(ranges, {options}, callBack);
Pass in query ranges returned by **proximity.getQueryRangesFromRadius** to find points that fall within your range value.

**Options:**
- `client: {redisClient}`
- `zset: {String}`


## Example of Performant Method Usage
As mentioned, you may want to cache the ranges to search for in your data model. Perhaps if you have a connection or user that is logged in, you can associate these ranges with their object.


```javascript
//Imagine you have a set of users
//each user has a certain latitude and longitude
var user = users[userID];
var queryRadius = 5000;

user.proximityQueryRanges = proximity.getQueryRangesFromRadius(user.latitude, user.longitide, queryRadius);

function search(user){
  proximity.queryByRanges(user.proximityQueryRanges, function(err, replies){
    console.log("Nearby Users to", user, "are", replies);
  });
}
```

Get it? Got it?


## License

Open sourced under MIT License
