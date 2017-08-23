/**
 * Created by zhouyong10 on 2/3/16.
 */
var db = require('../dbWrap');
var Class = require('./Class');

var Profit = new Class();


Profit.extend(db);

Profit.extend({
    open: function() {
        return Profit.openCollection('Profit');
    }
});

Profit.include({

});


module.exports = Profit;