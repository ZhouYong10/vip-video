/**
 * Created by zhouyong10 on 2/3/16.
 */
var dbWrap = require('../dbWrap');
var Class = require('./Class');
var bcrypt = require('bcryptjs');
var moment = require('moment');


var User = new Class();
User.role = {
    admin: '管理员',
    user: '用户'
};

User.extend(dbWrap);

User.extend({
    open: function() {
        return User.openCollection('User');
    },
    getSystemFunds: function() {
        return new Promise(function(resolve, reject) {
            User.open().find().then(function(results) {
                var count = 0;
                results.forEach(function (result) {
                    count += parseFloat(result.funds);
                });
                resolve(count.toFixed(4));
            })
        })
    },
    getSystemFreezeFunds: function() {
        return new Promise(function(resolve, reject) {
            User.open().find().then(function(results) {
                var count = 0;
                results.forEach(function (result) {
                    count += parseFloat(result.freezeFunds);
                });
                resolve(count.toFixed(4));
            })
        })
    },
    createUser: function(user, resolve, reject) {
        user.password = bcrypt.hashSync(user.password, bcrypt.genSaltSync(10));
        user.funds = 0;
        user.freezeFunds = 0;
        user.status = '正常';
        user.createTime = moment().format('YYYY-MM-DD HH:mm:ss');

        User.open().insert(user).then(function(result) {
            resolve(result);
        }, function(error) {
            reject(error);
        })
    },
    removeUser: function(id) {
        return new Promise(function(resolve, reject) {
            User.open().findOne({username: 'admin'}).then(function (admin) {
                //获取被删除用户
                User.open().findById(id).then(function(delUser) {
                    //如果存在父用户，则获取父用户
                    if(delUser.parentID) {
                        User.open().findById(delUser.parentID).then(function(parentUser) {
                            //将被删除用户从父用户中移除
                            var parent = User.wrapToInstance(parentUser);
                            parent.removeChild(id);
                        })
                    }
                    //如果存在子用户，则将被删除用户的所有子用户添加到平台管理员中
                    if(delUser.childNum > 0) {
                        if(!admin.children) {
                            admin.children = [];
                        }
                        admin.children = admin.children.concat(delUser.children);
                        admin.childNum = admin.children.length;
                        for(var i = 0; i < delUser.children.length; i++) {
                            User.open().updateById(delUser.children[i], {
                                $set: {
                                    parent: admin.username,
                                    parentID: admin._id
                                }
                            });
                        }
                    }
                    User.open().updateById(admin._id, {
                        $set: {
                            funds: (parseFloat(admin.funds) + parseFloat(delUser.funds)).toFixed(4),
                            freezeFunds: (parseFloat(admin.freezeFunds) + parseFloat(delUser.freezeFunds)).toFixed(4),
                            children: admin.children,
                            childNum: admin.childNum
                        }
                    });
                    User.open().removeById(delUser._id);
                    resolve(delUser.username);
                })
            });
        })
    },
    resetPassword: function(id) {
       return new Promise(function(resolve) {
           User.open().updateById(id, {
               $set: {
                   password: bcrypt.hashSync('123456', bcrypt.genSaltSync(10))
               }
           }).then(function() {
               resolve();
           })
       })
    }
});

User.include({
    isAdmin: function() {
        return this.role === 'admin';
    },
    samePwd: function(pwd) {
        return bcrypt.compareSync(pwd, this.password);
    },
    childRole: function() {
        var roles = this.parent.roles;
        for(var i = 0; i < roles.length; i++) {
            if(roles[i] === this.role) {
                if(i + 1 < roles.length) {
                    return roles[i + 1];
                }
                return roles[i];
            }
        }
    },
    addChild: function(id) {
        if(this.children == undefined) {
            this.children = [];
        }
        this.children.unshift(id);
        this.childNum = this.children.length;
    },
    removeChild: function(id) {
        var self = this;
        for(var i = 0; i < self.children.length; i++) {
            if(self.children[i] == id) {
                self.children.splice(i, 1);
                User.open().updateById(self._id, {
                    $set: {
                        children: self.children,
                        childNum: self.children.length
                    }
                });
            }
        }
    }
});


module.exports = User;