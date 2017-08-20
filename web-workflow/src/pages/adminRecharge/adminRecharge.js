/**
 * Created by ubuntu64 on 4/5/16.
 */
var Utils = require('utils');

var Vue = require('vue');
Vue.use(require('vue-validator'));

new Vue({
    el: '#searchForm'
});

$(function () {
    Utils.layPage();
    layer.config({
        extend: 'extend/layer.ext.js'
    });

    $('.handRecharge').click(function (e) {
        e.stopPropagation();
        e.preventDefault();
        var href = $(this).attr('href');
        layer.prompt({
            title: '请输入充值金额！',
            offset: '6%'
        }, function (value, index) {
            href += '&funds=' + value.replace(/(^\s*)|(\s*$)/g,"");
            layer.close(index);
            $('<a href=' + href + '></a>').get(0).click();
        });
    });

    $('.refuseRecharge').click(function (e) {
        e.stopPropagation();
        e.preventDefault();
        var href = $(this).attr('href');
        layer.prompt({
            formType: 2,
            title: '请输入充值失败原因！',
            offset: '6%'
        }, function (value, index) {
            href += '&info=' + value.replace(/\r\n/g,"").replace(/\n/g,"");
            layer.close(index);
            $('<a href=' + href + '></a>').get(0).click();
        });
    });
});