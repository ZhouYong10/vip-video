/**
 * Created by ubuntu64 on 3/21/16.
 */
var Utils = require('utils');
var Vue = require('vue');
Vue.use(require('vue-validator'));


new Vue({
    el: '#withdrawAdd',
    data: {
        canWithdraw: ''
    },
    validators: {
        isfloat: Utils.isfloat,
        mustOne: function(funds) {
            return parseFloat(funds) >= 5;
        },
        mintotal: function(funds) {
            var val = funds.trim();
            return val == '' ? true : parseFloat(val) <= parseFloat(this.canWithdraw);
        }
    }
});