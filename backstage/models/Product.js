/**
 * Created by zhouyong10 on 2/3/16.
 */
var db = require('../dbWrap');

var Class = require('./Class');

//var bcrypt = require('bcryptjs');
//var moment = require('moment');


var Product = new Class();


Product.extend(db);

Product.open = function() {
    return Product.openCollection('Product');
};

Product.include({
    getPriceByUser: function(user) {
        var price ;
        if(user.parent) {
            price = this.childPrice;
        }else{
            price = this.superPrice;
        }
        return price;
    },
    getPerByUser: function(user) {
        var price ;
        if(user.parent) {
            price = this.childPer;
        }else{
            price = this.superPer;
        }
        return price;
    }
});


module.exports = Product;