/**
 * Created by ubuntu64 on 4/17/17.
 */
var db = require('../dbWrap');
var Class = require('./Class');

var Consume = new Class();

Consume.extend(db);

Consume.extend({
    open: function() {
        return Consume.openCollection('Consume');
    }
});

Consume.include({

});


module.exports = Consume;