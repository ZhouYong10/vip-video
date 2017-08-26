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
        return User.openCollection('VipUser');
    },
    new: function(info) {
        var user = {
            role: info.role || 'user',
            roleName: info.roleName || '用户',
            username: info.username || '',
            password: info.password || '',
            funds: info.funds || 0,
            profitToParent: info.profitToParent || 0,
            status: info.status || '正常',
            vipTime: info.vipTime || '',
            parentId: info.parentId || '',
            parentName: info.parentName || '',
            childrenId: info.childrenId || [],
            childrenNum: info.childrenNum || 0,
            childrenProfit: info.childrenProfit || 0,
            canWithdraw: info.canWithdraw || 0,
            alreadyWithdraw: info.alreadyWithdraw || 0,
            createTime: info.createTime || '',
            lastLoginTime: info.lastLoginTime || '',
            qq: info.qq || '',
            loginNum: info.loginNum || 0,
            isLogin: info.isLogin || false,
            readme: info.readme || false
        };
        return User.wrapToInstance(user);
    },
    isVip: function(user) {
        var vipTime = Date.parse(user.vipTime);
        var nowTime = new Date().getTime();
        return vipTime > nowTime;
    },
    getSystemFunds: function() {
        return new Promise(function(resolve, reject) {
            User.open().find().then(function(results) {
                var totalFunds = 0;
                var totalProfit = 0;
                var totalCanWithdraw = 0;
                var totalAlreadyWithdraw = 0;
                results.forEach(function (result) {
                    totalFunds += parseFloat(result.funds);
                    if(result.role != 'admin'){
                        totalProfit += parseFloat(result.childrenProfit);
                        totalCanWithdraw += parseFloat(result.canWithdraw);
                        totalAlreadyWithdraw += parseFloat(result.alreadyWithdraw);
                    }
                });
                resolve({
                    totalFunds: totalFunds.toFixed(4),
                    totalProfit: totalProfit.toFixed(4),
                    totalCanWithdraw: totalCanWithdraw.toFixed(4),
                    totalAlreadyWithdraw: totalAlreadyWithdraw.toFixed(4)
                });
            })
        })
    },
    createUser: function(userInfo) {
        return new Promise(function(resolve) {
            userInfo.password = bcrypt.hashSync(userInfo.password, bcrypt.genSaltSync(10));
            userInfo.vipTime = moment().format('YYYY-MM-DD HH:mm:ss');
            userInfo.createTime = moment().format('YYYY-MM-DD HH:mm:ss');
            var user = User.new(userInfo);
            User.open().insert(user).then(function(result) {
                resolve(result[0]);
            })
        })
    },
    removeUser: function(id) {
        return new Promise(function(resolve) {
            User.open().findOne({username: 'admin'}).then(function (admin) {
                //获取被删除用户
                User.open().findById(id).then(function(delUser) {
                    var adminChildren = [].concat(admin.childrenId, delUser.childrenId);
                    User.open().updateById(admin._id, {
                        $set: {
                            funds: (parseFloat(admin.funds) + parseFloat(delUser.funds)).toFixed(4),
                            childrenProfit: (parseFloat(admin.childrenProfit) + parseFloat(delUser.childrenProfit)).toFixed(4),
                            canWithdraw: (parseFloat(admin.canWithdraw) + parseFloat(delUser.canWithdraw)).toFixed(4),
                            alreadyWithdraw: (parseFloat(admin.alreadyWithdraw) + parseFloat(delUser.alreadyWithdraw)).toFixed(4),
                            childrenId: adminChildren,
                            childrenNum: adminChildren.length
                        }
                    }).then(function() {
                        //如果存在父用户，则获取父用户
                        if(delUser.parentId) {
                            User.open().findById(delUser.parentId).then(function(parentUser) {
                                //将被删除用户从父用户中移除
                                var parent = User.wrapToInstance(parentUser);
                                parent.removeChild(id);
                            })
                        }
                        //如果存在子用户，则将被删除用户的所有子用户添加到平台管理员中
                        if(delUser.childrenId.length > 0) {
                            for(var i = 0; i < delUser.childrenId.length; i++) {
                                User.open().updateById(delUser.childrenId[i], {
                                    $set: {
                                        parentId: admin._id,
                                        parentName: admin.username
                                    }
                                });
                            }
                        }
                        User.open().removeById(delUser._id);
                        resolve();
                    })
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
        this.childrenId.unshift(id);
        this.childrenNum = this.childrenId.length;
    },
    removeChild: function(id) {
        var self = this;
        return new Promise(function(resolve) {
            var index;
            for(var i = 0; i < self.childrenId.length; i++) {
                if(self.childrenId[i] == id) {
                    index = i;
                    break;
                }
            }
            self.childrenId.splice(i, 1);
            User.open().updateById(self._id, {
                $set: {
                    childrenId: self.childrenId,
                    childrenNum: self.childrenId.length
                }
            }).then(function() {
                resolve();
            })
        })
    }
});


module.exports = User;