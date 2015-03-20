geo-proximity
=====================

[![Build Status](https://travis-ci.org/arjunmehta/node-geo-proximity.svg?branch=master)](https://travis-ci.org/arjunmehta/node-geo-proximity)

**Note:** *The API for v2.x.x has been completely rewritten!*<br/>
**Note:** *This module requires a [Redis](http://redis.io) server to be accessible to your Node environment.*

![geo-proximity title image](https://raw.githubusercontent.com/arjunmehta/node-geo-proximity/image/image/splash.png)

This Node module provides everything you need to get proximity information for geo locations. More specifically:

- **Fast querying of nearby locations to a point within a set. Fast like redis is fast.**
- **Basic management (addition, querying and removal) of sets of named geo locations.**
- **A simple, easy to use, scalable interface.**
- **Built-in query caching for improved performance of repeated queries.**

It should be noted that the method used here is not the most precise, but the query is very fast, and should be appropriate for most consumer applications looking for this basic function. [Read more about how this module works](http://gis.stackexchange.com/questions/18330/would-it-be-possible-to-use-geohash-for-proximity-searches/92331#92331).

## Installation

```bash
npm install geo-proximity
```

## Basic Usage
Usage of this module should be extremely simple. Just make sure that your redis server is accessible to your Node environment. Because this module uses redis as a store, almost all methods have integrated error handling for queries.

### Include and Initialize

Include and initialize this module with a node-redis client instance.

```javascript
var redis = require('redis'),
    client = redis.createClient()

var proximity = require('geo-proximity').initialize(client)
```

### Add Locations

Add locations individually:

```javascript
proximity.addLocation(43.6667, -79.4167, 'Toronto', function(err, reply){
  if(err) console.error(err)
  else console.log('added location:', reply)
})
```

If you have a large set you'd like to add in bulk, there's a much quicker way:

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
  else console.log(location.name + "'s location is:", location.latitude, location.longitude)
})
```

Or for multiple locations:

```javascript
proximity.locations(['Toronto', 'Philadelphia', 'Palo Alto', 'San Francisco', 'Ottawa'], function(err, locations){
  if(err) console.error(err)
  else {
    for(var i = 0; i < locations.length; i++)
      console.log(locations[i].name + "'s location is:", locations[i].latitude, locations[i].longitude)
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

### Initializing with Options

You can initialize `geo-proximity` with a specific redis client instance, but you can also specify a ZSET name to use when storing/querying locations instead of the default `geo:locations`. You may also enable an experimental caching feature that should help with performance, but will use additional memory.

```javascript
var redis = require('redis'),
    client = redis.createClient()

var proximity = require('geo-proximity').initialize(client, {
  zset: 'mySpecialLocationsSet',
  cache: true
})
```

### Multiple Sets
If you have different sets of coordinates, you can store and query them separately by creating adding a new set.

#### Create Sets
```javascript
var people = proximity.addSet('people')
var places = proximity.addSet('places')
```

#### Add Locations to Different Sets
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

#### Look for Nearby Locations In Different Sets

```javascript
// will find all PEOPLE ~5000m from the passed in coordinate
people.nearby(43.646838, -79.403723, 5000, function(err, people){
  if(err) console.error(err)
  else console.log('people nearby:', people)
})

// will find all PLACES ~5000m from the passed in coordinate
places.nearby(43.646838, -79.403723, 5000, function(err, places){
  if(err) console.error(err)
  else console.log('places nearby:', places)
})
```

## Performant Querying
If you intend on performing the same query over and over again with the same initial coordinate and the same distance, you can cache the **geohash ranges** that are used to search for nearby locations. Use the **proximity.getQueryCache** and **proximity.nearbyWithQueryCache** methods together in order to do this.

The geohash ranges are what the **proximity.nearby** method ultimately searches within to find nearby points. So keeping these stored in a variable some place and passing them into a more basic search function will save some cycles (at least 5ms on a basic machine). This will save you quite a bit of processing time if you expect to refresh your searches often, and especially if you expect to have empty results often. Your processor is probably best used for other things.

```javascript
var cachedQuery = proximity.getQueryCache(37.4688, -122.1411, 5000)

proximity.nearbyWithQueryCache(cachedQuery, function(err, replies){
  console.log('results to the query:', replies)
})
```


## API

### proximity.initialize(redisClient, options)
Initialize the module with a redis client.

#### Options
- `zset` **String**: Default `geo:locations`. Set this option to specify a zset name to use to store location values.
- `cache` **Boolean**: Default `false`. The module can cache queries to increase the speed of future queries that are similar. However, this can end up taking a bit of memory, and might not be necessary if you don't need to repeat queries.

```javascript
var proximity = require('geo-proximity').initialize(client, {
  zset: 'locations',
  cache: false
})
```

### proximity.addSet(setName)
This method will return a subset that can be queried and hold a unique set of locations from the main set. It will store these new locations in a new redis zset with a unique name related to the parent set (eg. `geo:locations:people`).

### proximity.addLocation(lat, lon, locationName, callBack)
Add a new coordinate to your set.

### proximity.addLocations(locationArray, callBack)
Adds an array of new coordinates to your set. The `coordinateArray` must be in the form `[[lat, lon, name],[lat, lon, name],...,[lat, lon, name]]`. Use this method for bulk additions, as it is much faster than individual adds.

### proximity.location(locationName, callBack)
Retrieve the latitude and longitude of a specific named location. Returns an object with `name`, `latitude` and `longitude` properties.

### proximity.locations(locationNameArray, callBack)
Retrieve the latitude and longitude of a list of specific named locations. Returns an array of objects with `name`, `latitude` and `longitude` properties.

### proximity.addLocations(coordinateArray, callBack)
Adds an array of new coordinates to your set. The `coordinateArray` must be in the form `[[lat, lon, name],[lat, lon, name],...,[lat, lon, name]]`. Use this method for bulk additions, as it is much faster than individual adds.

### proximity.removeLocation(coordinateName, callBack)
Remove the specified coordinate by name.

### proximity.removeLocations(coordinateNameArray, callBack)
Remove a set of coordinates by name. `coordinateNameArray` must be of the form `[nameA,nameB,nameC,...,nameN]`.

### proximity.nearby(lat, lon, radius, {options}, callBack)
Use this function for a basic search by proximity within the given latitude and longitude and radius (in meters). It is not ideal to use this method if you intend on making the same query multiple times. **If performance is important and you'll be making the same query over and over again, it is recommended you instead have a look at proximity.nearbyWithQueryCache and promixity.getQueryCache.** Otherwise this is an easy method to use.

#### Options
- `values` **Boolean**: Default `false`. Instead of returning a flat array of key names, it will instead return a full set of keynames with coordinates in the form of `[[name, lat, lon], [name, lat, lon]...]`.This will be a slower query compared to just returning the keynames because the coordinates need to be calculated from the stored geohashes.

### proximity.getQueryCache(lat, lon, radius)
Get the query ranges to use with **proximity.nearbyWithQueryCache**. This returns an array of geohash ranges to search your set for. `bitDepth` is optional and defaults to 52, set it if you have chosen to store your coordinates at a different bit depth. Store the return value of this function for making the same query often.

### proximity.nearbyWithQueryCache(cache, {options}, callBack)
Pass in query ranges returned by **proximity.getQueryRangesFromRadius** to find points that fall within your range value.

#### Options
- `values` **Boolean**: Default `false`. Instead of returning a flat array of key names, it will instead return a full set of keynames with coordinates in the form of `[[name, lat, lon], [name, lat, lon]...]`.This will be a slower query compared to just returning the keynames because the coordinates need to be calculated from the stored geohashes.


## License

The MIT License (MIT)<br/>
Copyright (c) 2015 Arjun Mehta
