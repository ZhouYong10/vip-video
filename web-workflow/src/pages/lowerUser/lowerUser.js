/**
 * Created by ubuntu64 on 3/30/16.
 */
var Utils = require('utils');

var Vue = require('vue');
Vue.use(require('vue-validator'));

new Vue({
    el: '#searchForm'
});

$(function () {
    Utils.clipboard();
    Utils.layPage();
});