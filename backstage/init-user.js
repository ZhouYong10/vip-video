/**
 * Created by zhouyong10 on 2/2/16.
 */

var bcrypt = require('bcryptjs');
var moment = require('moment');

var initUsers = [{
    username: 'admin',
    password: bcrypt.hashSync('admin', bcrypt.genSaltSync(10)),
    funds: 0,
    role: 'admin',
    roleName: '管理员',
    status: '正常',
    vipTime: moment().format('YYYY-MM-DD HH:mm:ss'),
    createTime: moment().format('YYYY-MM-DD HH:mm:ss')
}, {
    username: '演示',
    password: bcrypt.hashSync('yanshi', bcrypt.genSaltSync(10)),
    funds: 0,
    role: 'user',
    roleName: '用户',
    status: '正常',
    vipTime: moment().format('YYYY-MM-DD HH:mm:ss'),
    createTime: moment().format('YYYY-MM-DD HH:mm:ss')
}];


exports.initUser = function(User) {
    initUsers.map(function(user) {
        User.findOne({username: user.username, role: user.role}, function(error, result) {
            if(error) {
                return console.log('初始化查询用户信息失败： ' + error);
            }
            if(result) {
                user = result;
                delete user._id;
            }
            User.findAndModify({
                username: user.username
            }, [], {$set: user}, {
                new: true,
                upsert: true
            }, function(error, result) {
                if(error) {
                    console.log('添加初始化账户失败： ' + error);
                }else{
                    console.log('添加初始化账户成功!');
                }
            })
        })
    })
};
