// Queued interface constructor
// This interface queues up commands to pass to an active interface (emulated or native)
// once it has been determined what the redis server supports.


function QueuedInterface(client) {
  this.client = client;
  this.queue = [];
}


// Queued Geo Commands

QueuedInterface.prototype.geoadd = function() {
  this.queue.push(['geoadd', arguments]);
};

QueuedInterface.prototype.geoadd_multi = function() {
  this.queue.push(['geoadd_multi', arguments]);
};

QueuedInterface.prototype.geodist = function() {
  this.queue.push(['geodist', arguments]);
};

QueuedInterface.prototype.geohash = function() {
  this.queue.push(['geohash', arguments]);
};

QueuedInterface.prototype.geohashes = function() {
  this.queue.push(['geohashes', arguments]);
};

QueuedInterface.prototype.geopos = function() {
  this.queue.push(['geopos', arguments]);
};

QueuedInterface.prototype.geopos_multi = function() {
  this.queue.push(['geopos_multi', arguments]);
};

QueuedInterface.prototype.georadius = function() {
  this.queue.push(['georadius', arguments]);
};

QueuedInterface.prototype.georadiusbymember = function() {
  this.queue.push(['georadiusbymember', arguments]);
};

QueuedInterface.prototype.nearby = function() {
  this.queue.push(['nearby', arguments]);
};

QueuedInterface.prototype.nearbymember = function() {
  this.queue.push(['nearbymember', arguments]);
};


// Set Commands

QueuedInterface.prototype.del = function() {
  this.queue.push(['del', arguments]);
};

QueuedInterface.prototype.zrem = function() {
  this.queue.push(['zrem', arguments]);
};

// Drain Method

QueuedInterface.prototype.drain = function(clientInterface) {
  var method;
  var args;

  for (var i = 0; i < this.queue.length; i++) {
    method = this.queue[i][0];
    args = this.queue[i][1];
    clientInterface[method].apply(clientInterface, args);
  }

  return clientInterface;
};


module.exports = QueuedInterface;
