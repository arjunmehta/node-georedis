geo-proximity
=====================

[![Build Status](https://travis-ci.org/arjunmehta/node-geo-proximity.svg?branch=master)](https://travis-ci.org/arjunmehta/node-geo-proximity)

**Note:** *The API for version v2 has been completely rewritten!*

This node/io.js module provides super fast proximity searches for geo locations. More specifically:

- Basic management (addition, querying and removal) of named geo locations.
- Fast querying of nearby locations to a point. Fast like redis is fast.
- An easy to use interface.

It should be noted that the method used here is not the most precise, but the query is very fast, and should be appropriate for most consumer applications looking for this basic function. [Read more about how this module works](http://www.arjunmehta.net/geo-proximity.html).

## Prerequisites

This module requires Redis in order to work and of course your Redis server needs to be accessible to the module's environment (ie. node/io.js).


## Installation

```bash
npm install geo-proximity
```


## Basic Usage
Usage of this module should be extremely simple. Just make sure that your redis server is accessible to your node/io.js environment. Because this module uses redis as a store, almost all methods have integrated error handling for queries.

### Include

```javascript
var proximity = require('geo-proximity')
```

### Add Locations

Add locations individually:

```javascript
proximity.addLocation(43.6667, -79.4167, 'Toronto', function(err, reply){
  if(err) console.error(err)
  else console.log('added location:', reply)
})
```

OR much quicker for large sets:

```javascript
var locations = [[43.6667, -79.4167,  'Toronto'],
                 [39.9523, -75.1638,  'Philadelphia'],
                 [37.4688, -122.1411, 'Palo Alto'],
                 [37.7691, -122.4449, 'San Francisco'],
                 [47.5500, -52.6667,  'St. John\'s'],
                 [40.7143, -74.0060,  'New York'],
                 [49.6500, -54.7500,  'Twillingate'],
                 [45.4167, -75.7000,  'Ottawa'],
                 [51.0833, -114.0833, 'Calgary'],
                 [18.9750, 72.8258,   'Mumbai']]

proximity.addLocations(locations, function(err, reply){
  if(err) console.error(err)
  else console.log('added locations:', reply)
})
```


### Recall the Coordinates of a Location

```javascript
proximity.location('Toronto', function(err, location){
  if(err) console.error(err)
  else console.log(location.name + "'s location is:", location.lat, location.lon)
})
```

Or for multiple locations:

```javascript
proximity.locations(['Toronto', 'Philadelphia', 'Palo Alto', 'San Francisco', 'Ottawa'], function(err, locations){
  if(err) console.error(err)
  else {
    for(var i = 0; i < locations.length, i++)
      console.log(location.name + "'s location is:", location.lat, location.lon)
  }
})
```

### Search for Nearby Locations

Now you can look for locations that exist within a certain range of any particular coordinate in the system.

```javascript
// look for all points within 5000m of Toronto.
proximity.nearby(43.646838, -79.403723, 5000, function(err, locations){
  if(err) console.error(err)
  else console.log('nearby locations:', locations)
})
```

### Remove Locations
Of course you may need to remove some points from your set as users/temporary events/whatever no longer are part of the set.

```javascript
proximity.removeLocation('New York', function(err, reply){
  if(err) console.error(err)
  else console.log('removed location:', reply)
})

// OR Quicker for Bulk Removals
proximity.removeLocations(['New York', 'St. John\'s', 'San Francisco'], function(err, reply){
  if(err) console.error(err)
  else console.log('removed locations', reply)
})
```


## Advanced Usage

### Specify a Redis Client instance/Set Name

You can initialize `geo-proximity` with a specific redis client instance as well as specify a zSet name to use when storing/querying locations. Read more about the [node-redis module](https://github.com/mranney/node_redis) to understand how you can configure your redis client.

```javascript
var redis = require('redis'),
    client = redis.createClient()

var proximity = require('geo-proximity').initialize(client, 'geo:locations')
```

### Multiple Sets
If you have different sets of coordinates, you can store and query them separately by passing options with a `zset` property that specifies the Redis ordered set to store/query them in. Removal and Performant Querying work the same way. Review the API to see where you can specify options.

#### Create Sets
```javascript
var people = proximity.addSet('people')
var places = proximity.addSet('places')
```

#### Add Locations
```javascript
var peopleLocations = [[43.6667,-79.4167,   'John'],
                       [39.9523, -75.1638,  'Shankar'],
                       [37.4688, -122.1411, 'Cynthia'],
                       [37.7691, -122.4449, 'Chen']]

var placeLocations  = [[43.6667,-79.4167,   'Toronto'],
                       [39.9523, -75.1638,  'Philadelphia'],
                       [37.4688, -122.1411, 'Palo Alto'],
                       [37.7691, -122.4449, 'San Francisco'],
                       [47.5500, -52.6667,  'St. John\'s']]

people.addLocations(peopleLocations, function(err, reply){
  if(err) console.error(err)
  else console.log('added people:', reply)
})

places.addLocations(placeLocations, function(err, reply){
  if(err) console.error(err)
  else console.log('added places:', reply)
})
```

#### Look for Nearby Locations

```javascript
// will find all PEOPLE ~5000m from the passed in coordinate
people.nearby(43.646838, -79.403723, 5000, function(err, people){
  if(err) console.error(err)
  else console.log('people nearby:', people)
})

// will find all PLACES ~5000m from the passed in coordinate
places.query(43.646838, -79.403723, 5000, function(err, places){
  if(err) console.error(err)
  else console.log('places nearby:', places)
})
```

#### Performant Querying


# API

## Initialization

### proximity.initialize(redisClient, redisZSetName)
Initialize the module with a redis client, and a ZSET name. This is not required, but will slightly improve efficiency and make your life easier. If you don't initialize, you will need to pass in a client and zset name as options for method calls.

## Adding/Removing Coordinates

### proximity.addLocation(lat, lon, coordinateName, {options}, callBack)
Add a new coordinate to your set. You can get quite technical here by specifying the geohash integer resolution at which to store (MUST BE CONSISTENT).

#### Options
- `bitDepth: {Number, default is 52}`: the bit depth you want to store your geohashes in, usually the highest possible (52 bits for javascript). MUST BE CONSISTENT. If you set this to another value other than 52, you will have to ensure you set bitDepth in options for querying methods.
- `client: {redisClient}`
- `zset: {String}`

### proximity.addLocations(coordinateArray, {options}, callBack)
Adds an array of new coordinates to your set. The `coordinateArray` must be in the form `[[lat, lon, name],[lat, lon, name],...,[lat, lon, name]]`. Again you can specify the geohash integer resolution at which to store (MUST BE CONSISTENT). Use this method for bulk additions, as it is much faster than individual adds.

#### Options
- `bitDepth: {Number, default is 52}`: the bit depth you want to store your geohashes in, usually the highest possible (52 bits for javascript). MUST BE CONSISTENT. If you set this to another value other than 52, you will have to ensure you set bitDepth in options for querying methods.
- `client: {redisClient}`
- `zset: {String}`

### proximity.removeLocation(coordinateName, {options}, callBack)
Remove the specified coordinate by name.

#### Options
- `client: {redisClient}`
- `zset: {String}`

### proximity.removeLocations(coordinateNameArray, {options}, callBack)
Remove a set of coordinates by name. `coordinateNameArray` must be of the form `[nameA,nameB,nameC,...,nameN]`.

#### Options
- `client: {redisClient}`
- `zset: {String}`


## Basic Querying

### proximity.query(lat, lon, radius, {options}, callBack)
Use this function for a basic search by proximity within the given latitude and longitude and radius (in meters). It is not ideal to use this method if you intend on making the same query multiple times. **If performance is important and you'll be making the same query over and over again, it is recommended you instead have a look at proximity.queryByRanges and promixity.getQueryRangesFromRadius.** Otherwise this is an easy method to use.

**Options:**
- `radiusBitDepth: {Number, default is 48}`: This is the bit depth that is associated with a search radius. It will override your radius setting, so if you use this option, for good form pass in `null` as your radius.
- `bitDepth: {Number, default is 52}`: the bit depth your geohashes are stored in if they are not in the default 52 bits.
- `client: {redisClient}`
- `zset: {String}`
- `values: {Boolean, default is false}`: Instead of returning a flat array of key names, it will instead return a full set of keynames with coordinates in the form of `[[name, lat, lon], [name, lat, lon]...]`.This will be a slower query compared to just returning the keynames because the coordinates need to be calculated from the stored geohashes.


## Performant Querying

If you intend on performing the same query over and over again with the same initial coordinate and the same distance, you should cache the **geohash ranges** that are used to search for nearby locations. The geohash ranges are what the methods ultimately search within to find nearby points. So keeping these stored in a variable some place and passing them into a more basic search function will save some cycles (at least 5ms on a basic machine). This will save you quite a bit of processing time if you expect to refresh your searches often, and especially if you expect to have empty results often. Your processor is probably best used for other things.

### proximity.getQueryCache(lat, lon, radius, {bitDepth=52})
Get the query ranges to use with **proximity.queryByRanges**. This returns an array of geohash ranges to search your set for. `bitDepth` is optional and defaults to 52, set it if you have chosen to store your coordinates at a different bit depth. Store the return value of this function for making the same query often.

### proximity.queryWithCache(ranges, {options}, callBack)
Pass in query ranges returned by **proximity.getQueryRangesFromRadius** to find points that fall within your range value.

**Options:**
- `client: {redisClient}`
- `zset: {String}`
- `values: {Boolean, default is false}`: Instead of returning a flat array of key names, it will instead return a full set of keynames with coordinates in the form of `[[name, lat, lon], [name, lat, lon]...]`.This will be a slower query compared to just returning the keynames because the coordinates need to be calculated from the stored geohashes.
- `bitDepth: {Number, default is 52}`: the bit depth your geohashes are stored in if they are not in the default 52 bits. Only needed if the `values` option is set.

## Example of Performant Method Usage
As mentioned, you may want to cache the ranges to search for in your data model. Perhaps if you have a connection or user that is logged in, you can associate these ranges with their object.

```javascript
// will hold the generated query ranges used for the query. This will
// save you some processing time for future queries using the same values
var cachedQuery = proximity.getQueryCache(37.4688, -122.1411, 5000)

proximity.queryWithCache(cachedQuery, function(err, replies){
  console.log('results to the query:', replies)
})
```

Get it? Got it?


## License

The MIT License (MIT)

Copyright (c) 2014 Arjun Mehta

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
