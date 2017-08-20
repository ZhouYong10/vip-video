/**
 * Created by zhouyong10 on 2/18/16.
 */
var Vue = require('vue');
Vue.use(require('vue-validator'));
Vue.use(require('vue-resource'));

new Vue({
    el: '#changePassword',
    data: {
        oldpwd: '',
        newpwd: '',
        repeatpwd: ''
    },
    validators: {
        same: function(pwd) {
            return pwd === this.newpwd;
        }
    },
    methods: {
        submit: function() {
            var username = $('#username').val();
            if(username == 'yanshi'){
                layer.msg('演示账户不能不能修改密码！')
            }else {
                this.$http.post('/user/changePwd', {
                    oldpwd: this.oldpwd,
                    newpwd: this.newpwd,
                    repeatpwd: this.repeatpwd
                }).then(function(res) {
                    if(res.data.isOK) {
                        $('<a href="' + res.data.url + '" ></a>').get(0).click();
                    }else{
                        layer.msg(res.data.info);
                    }
                });
            }
        }
    }
});