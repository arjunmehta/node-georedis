GeoRedis
=====================

[![Build Status](https://travis-ci.org/arjunmehta/node-georedis.svg?branch=master)](https://travis-ci.org/arjunmehta/node-georedis)

**Note:** *v3.x.x has introduced major API changes! Please refer to the API/examples below*<br/>
**Note:** *This module requires a [Redis](http://redis.io) server to be accessible to your Node environment. Does not require redis geo commands but will leverage them if they are available (ie. >= Redis 3.2)*

![georedis title image](https://raw.githubusercontent.com/arjunmehta/node-georedis/image/image/splash.png)

This Node module provides everything you need to get proximity information for geo locations. More specifically:

- **Basic management (addition, querying and removal) of sets of named geo locations.**
- **Fast querying of nearby locations to a point within a set. Fast like redis is fast.**
- **A simple, easy to use, scalable interface.**
- **Distributable methods (for browser based clients) alleviate computational load on server.**
- **Compatible input/output with the popular [GeoLib](https://github.com/manuelbieh/Geolib) module for further manipulation.**
- **Defaults to use native [Redis geo commands](http://redis.io/commands#geo) if available (Redis v3.2+), but falls back to emulation otherwise**

It should be noted that the algorithm used here is not the most precise, but the query is very fast, and should be appropriate for most consumer applications looking for this basic function. [Read more about how this module works](http://gis.stackexchange.com/questions/18330/would-it-be-possible-to-use-geohash-for-proximity-searches/92331#92331).

## Installation

```bash
npm install georedis
```

## Basic Usage
Usage of this module should be extremely simple. Just make sure that your Redis server is accessible to your Node environment. Because this module uses Redis as a store, almost all methods have integrated error handling for queries.

### Include and Initialize

Include and initialize this module with a node-redis client instance.

```javascript
var redis = require('redis'),
    client = redis.createClient()

var geo = require('georedis').initialize(client)
```

### Add Locations

Add locations individually (uses `GEOADD`):

```javascript
geo.addLocation('Toronto', {latitude: 43.6667, longitude: -79.4167},function(err, reply){
  if(err) console.error(err)
  else console.log('added location:', reply)
})
```

If you have a large set you'd like to add in bulk, there's a much quicker way:

```javascript
var locations = {
  'Toronto': {latitude: 43.6667, longitude: -79.4167},
  'Philadelphia': {latitude: 39.9523, longitude: -75.1638},
  'Palo Alto': {latitude: 37.4688, longitude: -122.1411},
  'San Francisco': {latitude: 37.7691, longitude: -122.4449},
  'St. John\'s': {latitude: 47.5500, longitude: -52.6667},
  'New York': {latitude: 40.7143, longitude: -74.0060},
  'Twillingate': {latitude: 49.6500, longitude: -54.7500},
  'Ottawa': {latitude: 45.4167, longitude: -75.7000},
  'Calgary': {latitude: 51.0833, longitude: -114.0833},
  'Mumbai': {latitude: 18.9750, longitude: 72.8258}
}

geo.addLocations(locations, function(err, reply){
  if(err) console.error(err)
  else console.log('added locations:', reply)
})
```


### Recall the Coordinates of a Location

```javascript
geo.location('Toronto', function(err, location){
  if(err) console.error(err)
  else console.log('Location for Toronto is: ', location.latitude, location.longitude)
})
```

Or for multiple locations:

```javascript
geo.locations(['Toronto', 'Philadelphia', 'Palo Alto', 'San Francisco', 'Ottawa'], function(err, locations){
  if(err) console.error(err)
  else {
    for(var locationName in locations){
      console.log(locationName + "'s location is:", locations[locationName].latitude, locations[locationName].longitude)
    }
  }
})
```

```javascript
var options = {
  asHash: true // == GEOHASH
}

geo.location('Toronto', function(err, location){
  if(err) console.error(err)
  else console.log('Location for Toronto is: ', location.latitude, location.longitude)
})
```

### Search for Nearby Locations

Now you can look for locations that exist approximately within a certain distance of any particular coordinate in the system.

```javascript
// look for all points within ~5000m of Toronto.
geo.nearby({latitude: 43.646838, longitude: -79.403723}, 5000, function(err, locations){
  if(err) console.error(err)
  else console.log('nearby locations:', locations)
})
```

```javascript
var options = {
  withCoordinate: true, // Will provide coordinates with locations
  withHash: true, // Will provide a 52bit Geohash Integer
  withDistance: true, // Will provide distance from query
  sort: 'ASC', // or 'DESC' or false (default)
  units: 'm',
  count: 100 // Number of results to return
  strictRadius: true,
}

// look for all points within ~5000m of Toronto.
geo.nearby({latitude: 43.646838, longitude: -79.403723}, 5000, options, function(err, locations){
  if(err) console.error(err)
  else console.log('nearby locations:', locations)
})
```


### Remove Locations
Of course you may need to remove some points from your set as users/temporary events/whatever no longer are part of the set.

```javascript
geo.removeLocation('New York', function(err, reply){
  if(err) console.error(err)
  else console.log('removed location:', reply)
})

// OR Quicker for Bulk Removals
geo.removeLocations(['New York', 'St. John\'s', 'San Francisco'], function(err, reply){
  if(err) console.error(err)
  else console.log('removed locations', reply)
})
```


## Advanced Usage

### Initializing with Options

You can initialize `georedis` with a specific redis client instance, but you can also specify a ZSET name to use when storing/querying locations instead of the default `geo:locations`. You may also enable an experimental caching feature that should help with performance, but will use additional memory.

```javascript
var redis = require('redis'),
    client = redis.createClient()

var proximity = require('georedis').initialize(client, {
  zset: 'mySpecialLocationsSet',
  cache: true
})
```

### Multiple Sets
If you have different sets of coordinates, you can store and query them separately by creating adding a new set.

#### Create Sets
```javascript
var people = geo.addSet('people')
var places = geo.addSet('places')
```

#### Add Locations to Different Sets
```javascript
var peopleLocations = {
  'John': {latitude: 43.6667, longitude: -79.4167},
  'Shankar': {latitude: 39.9523, longitude: -75.1638},
  'Cynthia': {latitude: 37.4688, longitude: -122.1411},
  'Chen': {latitude: 37.7691, longitude: -122.4449}
}

var placeLocations  = {
  'Toronto': {latitude: 43.6667, longitude: -79.4167},
  'Philadelphia': {latitude: 39.9523, longitude: -75.1638},
  'Palo Alto': {latitude: 37.4688, longitude: -122.1411},
  'San Francisco': {latitude: 37.7691, longitude: -122.4449},
  'St. John\'s': {latitude: 47.5500, longitude: -52.6667}
}

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
people.nearby({latitude: 43.646838, longitude: -79.403723}, 5000, function(err, people){
  if(err) console.error(err)
  else console.log('people nearby:', people)
})

// will find all PLACES ~5000m from the passed in coordinate
places.nearby({latitude: 43.646838, longitude: -79.403723}, 5000, function(err, places){
  if(err) console.error(err)
  else console.log('places nearby:', places)
})
```

#### Delete Different Sets

If you no longer need one of your newly created sets, you can just delete it. Either of the following methods will remove the set from redis and destroy its contents. If you add locations to that set again it will recreate the set on redis and you can use as usual.

```javascript
// will delete the people set and its contents
people.delete()

// OR
geo.deleteSet('people')
```

## Performant Querying
If you intend on performing the same query over and over again with the same initial coordinate and the same distance, you can cache the **geohash ranges** that are used to search for nearby locations. Use the **geo.getQueryCache** and **geo.nearbyWithQueryCache** methods together in order to do this.

The geohash ranges are what the **geo.nearby** method ultimately searches within to find nearby points. So keeping these stored in a variable some place and passing them into a more basic search function will save some cycles (at least 5ms on a basic machine). This will save you quite a bit of processing time if you expect to refresh your searches often, and especially if you expect to have empty results often. Your processor is probably best used for other things.

```javascript
var cachedQuery = geo.getQueryCache(37.4688, -122.1411, 5000)

geo.nearbyWithQueryCache(cachedQuery, function(err, replies){
  console.log('results to the query:', replies)
})
```

## Super Performant Scalable Querying
Similar to the above method of increasing performance, you can use browserify and use this module in clients. The only method a client will have access to is the `getQueryCache` method. This way, your clients can take on the computational load of generating the geohash ranges to query within.

No need to initialize the module to use it on the browser/client side, just do a regular require.

```javascript
var proximity = require('georedis')
var cachedQuery = geo.getQueryCache(37.4688, -122.1411, 5000)
```

Pass the `cachedQuery` along to the server (using http or socket.io or anything) to use with the `nearbyWithQueryCache` method and send back the results.

## API

### geo.initialize(redisClient, options)
Initialize the module with a redis client.

#### Options
- `zset` **String**: Default `geo:locations`. Set this option to specify a zset name to use to store location values.
- `cache` **Boolean**: Default `false`. The module can cache queries to increase the speed of future queries that are similar. However, this can end up taking a bit of memory, and might not be necessary if you don't need to repeat queries.

```javascript
var proximity = require('georedis').initialize(client, {
  zset: 'locations',
  cache: false
})
```

### geo.addSet(setName)
This method will return a subset that can be queried and hold a unique set of locations from the main set. It will store these new locations in a new redis zset with a unique name related to the parent set (eg. `geo:locations:people`).

### geo.deleteSet(setName, callBack)
This method will delete a subset and its contents. You should use the callBack to check for errors or to wait for confirmation that the set is deleted, but this is probably not necessary.

### geo.addLocation(lat, lon, locationName, callBack)
Add a new coordinate to your set.

### geo.addLocations(locationArray, callBack)
Adds an array of new coordinates to your set. The `coordinateArray` must be in the form `[[lat, lon, name],[lat, lon, name],...,[lat, lon, name]]`. Use this method for bulk additions, as it is much faster than individual adds.

### geo.updateLocation(lat, lon, locationName, callBack)
Update a coordinate to your set.

### geo.updateLocations(locationArray, callBack)
Same syntax as `addLocations`. Updates all locations passed.

### geo.location(locationName, callBack)
Retrieve the latitude and longitude of a specific named location. Returns an object with `name`, `latitude` and `longitude` properties. `latitude` and `longitude` will be null if the location does not exist.

### geo.locations(locationNameArray, callBack)
Retrieve the latitude and longitude of a list of specific named locations. Returns an array of objects with `name`, `latitude` and `longitude` properties. `latitude` and `longitude` will be null if the location does not exist.

### geo.removeLocation(coordinateName, callBack)
Remove the specified coordinate by name.

### geo.removeLocations(coordinateNameArray, callBack)
Remove a set of coordinates by name. `coordinateNameArray` must be of the form `[nameA,nameB,nameC,...,nameN]`.

### geo.delete(callBack)
Removes all locations and deletes the zSet from Redis. You should use the callBack to check for errors or to wait for confirmation that the set is deleted, but this is probably not necessary.

### geo.nearby(lat, lon, distance, {options}, callBack)
Use this function for a basic search by proximity within the given latitude and longitude and approximate distance (in meters). It is not ideal to use this method if you intend on making the same query multiple times. **If performance is important and you'll be making the same query over and over again, it is recommended you instead have a look at geo.nearbyWithQueryCache and promixity.getQueryCache.** Otherwise this is an easy method to use.

#### Options
- `values` **Boolean**: Default `false`. Instead of returning a flat array of key names, it will instead return a full set of keynames with coordinates in the form of `[[name, lat, lon], [name, lat, lon]...]`.This will be a slower query compared to just returning the keynames because the coordinates need to be calculated from the stored geohashes.

### geo.getQueryCache(lat, lon, distance)
Get the query ranges to use with **geo.nearbyWithQueryCache**. This returns an array of geohash ranges to search your set for. `bitDepth` is optional and defaults to 52, set it if you have chosen to store your coordinates at a different bit depth. Store the return value of this function for making the same query often.

### geo.nearbyWithQueryCache(cache, {options}, callBack)
Pass in query ranges returned by **geo.getQueryRangesFromRadius** to find points that fall within your range value.

#### Options
- `values` **Boolean**: Default `false`. Instead of returning a flat array of key names, it will instead return a full set of keynames with coordinates in the form of `[[name, lat, lon], [name, lat, lon]...]`.This will be a slower query compared to just returning the keynames because the coordinates need to be calculated from the stored geohashes.


## License

The MIT License (MIT)<br/>
Copyright (c) 2015 Arjun Mehta
