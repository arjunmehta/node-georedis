var setIdCount = 0;


module.exports = {

    randomId: function() {
        return '' + (~~(Math.random() * 1000000000000)).toString(36) + (setIdCount++);
    },


    buildObjectFromKeyedArray: function(arr) {

        var obj = {};
        var element;
        var i;

        for (i = 0; i < arr.length; i++) {
            element = arr[i];
            obj[element.key] = element;
        }

        return obj;
    },

    buildObjectFromStringArray: function(arr) {

        var obj = {};
        var str;
        var i;

        for (i = 0; i < arr.length; i++) {
            str = arr[i];
            obj[str] = {
                key: str,
                latitude: null,
                longitude: null
            };
        }

        return obj;
    },

    convertUnitsToMeters: function(units, distance) {

        switch (units) {
            case 'km':
                distance = distance * 1000;
                break;
            case 'cm':
                distance = distance / 100;
                break;
            case 'mm':
                distance = distance / 1000;
                break;
            case 'ft':
                distance = distance / 3.28084;
                break;
            case 'mi':
                distance = distance * 1609.34;
                break;
            default:
                break;
        }
        return distance;
    },

    convertUnitsFromMeters: function(units, distance) {

        switch (units) {
            case 'km':
                distance = distance / 1000;
                break;
            case 'cm':
                distance = distance * 100;
                break;
            case 'mm':
                distance = distance * 1000;
                break;
            case 'ft':
                distance = distance * 3.28084;
                break;
            case 'mi':
                distance = distance / 1609.34;
                break;
            default:
                break;
        }
        return distance;
    }
};
