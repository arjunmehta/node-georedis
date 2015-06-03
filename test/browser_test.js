var expect = require('chai').expect;
var proximity = require('../browser');

var lat = 43.646838,
    lon = -79.403723;

describe("geo-proximity Tests", function() {

    it("Exported OK", function() {

        expect(typeof proximity).to.equal('object');
        expect(typeof proximity.getQueryCache).to.equal('function');
    });

    it("Get Query Cache", function() {

        var expected = [
            [1785293350895616, 1785297645862912],
            [1785319120699392, 1785323415666688],
            [1785327710633984, 1785332005601280],
            [1785478034489344, 1785486624423936],
            [1785503804293120, 1785520984162304]
        ];

        var cachedQuery = proximity.getQueryCache(lat, lon, 50000);

        for (var i = 0; i < expected.length; i++) {
            expect(cachedQuery[i][0]).to.equal(expected[i][0]);
            expect(cachedQuery[i][1]).to.equal(expected[i][1]);
        }
    });
});
