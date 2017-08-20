/**
 * Created by zhouyong10 on 2/18/16.
 */
var Vue = require('vue');

new Vue({
    el: '#userInfo',
    data: {
        isEdit: false
    },
    methods: {
        edit: function() {
            this.isEdit = true;
        },
        cancel: function() {
            this.isEdit = false;
        }
    }
});