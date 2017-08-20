/**
 * Created by zhouyong10 on 2/3/16.
 */
var db = require('../dbWrap');

var Class = require('./Class');

//var bcrypt = require('bcryptjs');
//var moment = require('moment');


var Error = new Class();


Error.extend(db);

Error.open = function() {
    return Error.openCollection('Error');
};

Error.include({

});


module.exports = Error;