/**
 * Created by zhouyong10 on 2/3/16.
 */
var db = require('../dbWrap');

var Class = require('./Class');

//var bcrypt = require('bcryptjs');
//var moment = require('moment');


var Placard = new Class();


Placard.extend(db);
Placard.extend({
    type: {
        systemPlacard: '系统公告',
        taskerPlacard: '发布者公告',
        handerPlacard: '任务者公告'
    },
    getTypeName: function(type) {
        return Placard.type[type];
    }
});

Placard.open = function() {
    return Placard.openCollection('VipPlacard');
};

Placard.include({

});


module.exports = Placard;