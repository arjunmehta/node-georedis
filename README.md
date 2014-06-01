node-geo-proximity
=====================
**node-redis-proximity is renamed to node-geo-proximity with 1.0.0 release.**

A node.js module that leverages the functionality of [node-geohash (ngeohash)](https://github.com/sunng87/node-geohash) to provide super fast proximity searches for geo coordinates.


[![Build Status](https://travis-ci.org/arjunmehta/node-redis-proximity.svg?branch=master)](https://travis-ci.org/arjunmehta/node-redis-proximity)

A node.js module that leverages the functionality of [node-geohash (ngeohash)](https://github.com/sunng87/node-geohash) and [node-redis](https://github.com/mranney/node_redis) to provide super fast proximity searches for geo coordinates.
>>>>>>> 1058393648e2fe0d170e80e27d2e9a867be87ed5

It should be noted that the method used here is not the most precise, but the query is very fast, and should be appropriate for most consumer applications looking for this basic function. This module leverages a [process for spatial indexing as outlined by Yin Qiwen](https://github.com/yinqiwen/ardb/blob/master/doc/spatial-index.md).

Please leave feedback in the module's [GitHub issues tracker](https://github.com/arjunmehta/node-geo-proximity/issues).

## Installation

```bash
npm install geo-proximity
```


## Example Usage
This module requires a redis server in order to work and of course you need to have redis accessible to node. Visit [node-redis](https://github.com/mranney/node_redis) for more information on using redis into your node environment.
=======
This module requires a functioning redis server running in order to work. Ideally, you should initialize it with your client and a zset name with which it will use for coordinate queries. But these can be specified in your function calls through method options, which can be helpful if you want to create various sets of geocoordinates to query against.

You should at the very least initialize the module with your redis client, but if you only have one set of coordinates, you can initialize the module with your client AND a zset name with which it will use for coordinate queries.

If you have more than one set of coordinates (ie. people and places) that you want to query separately, you can store and query them using optional parameters in the method calls. (see section on Multiple Sets)

```javascript
var redis = require('redis');
var client = redis.createClient();

var proximity = require('geoproximity');
proximity.initialize(client, "locationsSet");
```

### Add Coordinates
Generally you'll have some trigger to add new coordinates to your set (a user logs in, or a new point gets added in your application), or perhaps you'll want to load all the coordinates from a file of existing places. Whatever the case you should add them to redis as folows:

```javascript
proximity.addCoordinate(43.6667,-79.4167, "Toronto", function(err, reply){
  if(err) throw err;
  console.log("ADD successful:", reply)
});

// OR (much quicker for large sets)
var coordinates = [[43.6667,-79.4167, "Toronto"],
                   [39.9523,-75.1638, "Philadelphia"],
                   [37.4688,-122.1411, "Palo Alto"],
                   [37.7691,-122.4449, "San Francisco"],
                   [47.5500,-52.6667, "St. John's"],
                   [40.7143,-74.0060, "New York"],
                   [49.6500,-54.7500, "Twillingate"],
                   [45.4167,-75.7000, "Ottawa"],
                   [51.0833,-114.0833, "Calgary"],
                   [18.9750,72.8258, "Mumbai"]];

proximity.addCoordinates(coordinates, function(err, reply){
  if(err) throw err;
  console.log("ADD successful:", reply)
});
```

### Query for proximal points
Now you can look for points that exist within a certain range of any other coordinate in the system.

```javascript
// look for all points within 5000m of Toronto.
proximity.query(43.646838, -79.403723, 5000, function(err, replies){
  if(err) throw err;
  console.log(replies);
});
```

### Remove points
Of course you may need to remove some points from your set as users/temporary events/whatever no longer are part of the set.

```javascript
proximity.removeCoordinate("New York", function(err, reply){
  if(err) throw err;
  console.log("Removed Coordinate", reply);
});

// OR Quicker for Bulk Removals
proximity.removeCoordinates(["New York", "St. John's", "San Francisco"], function(err, reply){
  if(err) throw err;
  console.log("Removed Coordinates", reply);
});
```

### Multiple zSets
If you have different sets of coordinates, you can store and query them separately by passing options with a `zset` property that specifies the Redis ordered set to store/query them in. Removal and Performant Querying work the same way. Review the API to see where you can specify options.

```javascript
var people       = [[43.6667,-79.4167, "John"],
                   [39.9523,-75.1638, "Shankar"],
                   [37.4688,-122.1411, "Cynthia"],
                   [37.7691,-122.4449, "Chen"]];

var places = [[43.6667,-79.4167, "Toronto"],
                   [39.9523,-75.1638, "Philadelphia"],
                   [37.4688,-122.1411, "Palo Alto"],
                   [37.7691,-122.4449, "San Francisco"],
                   [47.5500,-52.6667, "St. John's"]];

proximity.addCoordinates(people, {zset: "locations:people"}, function(err, reply){
  if(err) throw err;
  console.log("ADD successful:", reply)
});

proximity.addCoordinates(places, {zset: "locations:places"}, function(err, reply){
  if(err) throw err;
  console.log("ADD successful:", reply)
});
```

```javascript
// will find all PEOPLE ~5000m from the passed in coordinate
proximity.query(43.646838, -79.403723, 5000, {zset: "locations:people"}, function(err, people){
  if(err) throw err;
  console.log(people);
});

// will find all PLACES ~5000m from the passed in coordinate
proximity.query(43.646838, -79.403723, 5000, {zset: "locations:places"}, function(err, places){
  if(err) throw err;
  console.log(places);
});
```




# API

## Initialization

### proximity.initialize(redisClient, redisZSetName);
Initialize the module with a redis client, and a ZSET name. This is not required, but will slightly improve efficiency and make your life easier. If you don't initialize, you will need to pass in a client and zset name as options for method calls.

## Adding/Removing Coordinates

### proximity.addCoordinate(lat, lon, {options}, callBack);
Add a new coordinate to your set. You can get quite technical here by specifying the geohash integer resolution at which to store (MUST BE CONSISTENT).

#### Options
- `bitDepth: {Number, default is 52}`: the bit depth you want to store your geohashes in, usually the highest possible (52 bits for javascript). MUST BE CONSISTENT. If you set this to another value other than 52, you will have to ensure you set bitDepth in options for querying methods.
- `client: {redisClient}`
- `zset: {String}`

### proximity.addCoordinates(coordinateArray, {options}, callBack);
Adds an array of new coordinates to your set. The `coordinateArray` must be in the form `[[lat, lon, name],[lat, lon, name],...,[lat, lon, name]]`. Again you can specify the geohash integer resolution at which to store (MUST BE CONSISTENT). Use this method for bulk additions, as it is much faster than individual adds.

#### Options
- `bitDepth: {Number, default is 52}`: the bit depth you want to store your geohashes in, usually the highest possible (52 bits for javascript). MUST BE CONSISTENT. If you set this to another value other than 52, you will have to ensure you set bitDepth in options for querying methods.
- `client: {redisClient}`
- `zset: {String}`

### proximity.removeCoordinate(coordinateName, {options}, callBack);
Remove the specified coordinate by name.

#### Options
- `client: {redisClient}`
- `zset: {String}`

### proximity.removeCoordinates(coordinateNameArray, {options}, callBack);
Remove a set of coordinates by name. `coordinateNameArray` must be of the form `[nameA,nameB,nameC,...,nameN]`.

#### Options
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
// Imagine you have a set of users
// each user has a certain latitude and longitude
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
