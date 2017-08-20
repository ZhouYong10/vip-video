/**
 * Created by Administrator on 2015/12/21.
 */

var Vue = require('vue');
Vue.use(require('vue-resource'));
var Utils = require('utils');

function isTrue(field) {
    $('#'+field).css({color: 'green'});
    layer.closeAll('tips');
}

function isFalse(msg, field) {
    $('#'+field).css({color: 'red'});
    layer.tips(msg, '#'+field, {
        tips: [1, '#3595CC'],
        time: 0
    });
}

new Vue({
    el: '#login',
    data:{
        username: '',
        password: '',
        securityCode: '',
        isAutoLogin: false
    },
    created: function() {
        var loginInfo = Cookies.get('loginInfo');
        if(loginInfo) {
            this.$http.post('/login', loginInfo).then((res) => {
                if(res.data.isOK) {
                    location.href = res.data.path;
                }else{
                    layer.msg(res.data.message);
                }
            });
        }
    },
    methods: {
        changeImg: function() {
            $('.getSecurityCode').get(0).src = '/securityImg?' + new Date().getTime();
        },
        closeTips: function() {
            layer.closeAll('tips');
        },
        checkUsername: function() {
            var val = $('#username').val();
            if(Utils.isEmpty(val)){
                isFalse('用户名不能为空！', 'username');
                return false;
            }else{
                isTrue('username');
                return true;
            }
        },
        checkPassword: function() {
            var val = $('#password').val();
            if(Utils.isEmpty(val)){
                isFalse('密码不能为空！', 'password');
                return false;
            }else{
                isTrue('password');
                return true;
            }
        },
        checkSecurityCode: function() {
            var val = $('#securityCode').val();
            if(Utils.isEmpty(val) || val.length != 4){
                isFalse('请输入4位验证码！', 'securityCode');
                return false;
            }else{
                isTrue('securityCode');
                return true;
            }
        },
        onLogin: function() {  //使用es6语法,获取不到相应的数据,例如this.username,得不到数据.
            var isCommit = this.checkUsername() && this.checkPassword() && this.checkSecurityCode();
            if(isCommit) {
                if(this.isAutoLogin) {
                    Cookies.set('loginInfo', {
                        username: this.username,
                        password: this.password,
                        isAuto: true
                    }, {expires: 14, path: '/'});
                }
                this.$http.post('/login', {
                    username: this.username,
                    password: this.password,
                    securityCode: this.securityCode
                }).then((res) => {
                    if(res.data.isOK) {
                        location.href = res.data.path;
                    }else{
                        layer.msg(res.data.message);
                    }
                });
            }
        }
    }
});
