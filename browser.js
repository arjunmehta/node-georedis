var range = require('./lib/range');

// main constructor

function Set(opts) {}

Set.prototype.getQueryCache = function(lat, lon, radius) {
    return range(lat, lon, radius, false);
};

module.exports = exports = new Set();
