/**
 * Created by Administrator on 2015/12/21.
 */

var Vue = require('vue');
Vue.use(require('vue-resource'));

new Vue({
    el: '#login',
    data:{
        username: '',
        password: '',
        repassword: '',
        qq: '',
        securityCode: '',
        readme: false,
        noInvitation: true
    },
    created: function() {
        if(location.search) {
            this.noInvitation = false;
        }
    },
    methods: {
        changeImg: function() {
            $('.getSecurityCode').get(0).src = '/securityImg?' + new Date().getTime();
        },
        closeTips: function() {
            layer.closeAll('tips');
        },
        onSignIn: function() {  //使用es6语法,获取不到相应的数据,例如this.username,得不到数据.
            this.$http.post('/sign/in', {
                invitation: location.search.split('=')[1],
                username: this.username,
                password: this.password,
                repassword: this.repassword,
                qq: this.qq,
                securityCode: this.securityCode,
                readme: this.readme
            }).then((res) => {
                if(res.data.isOK) {
                    location.href = res.data.path;
                }else{
                    var field = res.data.field;
                    layer.tips(res.data.message, '#'+field, {
                        tips: [1, '#3595CC'],
                        time: 0
                    });
                }
            });
        }
    }
});