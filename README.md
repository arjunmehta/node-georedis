node-geohash-distance
=====================

A node module that extends the functionality of node-geohash (ngeohash) to provide extremely fast proximity searches of for geocoordinates.

## Installation

```bash
npm install redis-proximity
```

## Example Usage
This module requires a functioning redis server running in order to work. Ideally, you should initialize it with your client and a zset name with which it will use for coordinate queries. But these can be specified in your function calls through method options.

### Setup
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

//Or Plainly if you don't care about tracking errors (you should).

proximity.addNewCoordinate(-12.29, 22.298, "CoordinateName");
```

### Query for proximal points
Now you can look for points that exist within a certain range of any other coordinate in the system.

```javascript
//look for all points within 5000m.
proximity.query(22.911, 11.186, {radius: 5000}, function(err, replies){
  if(err) throw err;
  console.log(replies);
});

```
