/**
 * Created by zhouyong10 on 2/2/16.
 */

var bcrypt = require('bcryptjs');
var moment = require('moment');
var User = require('./models/User');

var initUsers = [User.new({
    role: 'admin',
    roleName: '管理员',
    username: 'admin',
    password: bcrypt.hashSync('admin', bcrypt.genSaltSync(10)),
    vipTime: moment().format('YYYY-MM-DD HH:mm:ss'),
    createTime: moment().format('YYYY-MM-DD HH:mm:ss')
}), User.new({
    username: '演示',
    password: bcrypt.hashSync('yanshi', bcrypt.genSaltSync(10)),
    vipTime: moment().format('YYYY-MM-DD HH:mm:ss'),
    createTime: moment().format('YYYY-MM-DD HH:mm:ss')
})];


exports.initUser = function() {
    initUsers.map(function(user) {
        User.open().findOne({username: user.username, role: user.role})
            .then(function (result) {
                if (result) {
                    user = result;
                    delete user._id;
                }
                User.open().update({username: user.username}, {$set: user})
                    .then(function (result) {
                        console.log('添加初始化账户成功!');
                    }, function (err) {
                        console.log('添加初始化账户失败： ' + err);
                    });
            }, function(err) {
                console.log('初始化查询用户信息失败： ' + err);
            });
    })
};
