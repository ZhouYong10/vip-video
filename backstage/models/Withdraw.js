/**
 * Created by zhouyong10 on 2/3/16.
 */
var db = require('../dbWrap');

var Class = require('./Class');

var User = require('./User');
var moment = require('moment');
//var bcrypt = require('bcryptjs');


var Withdraw = new Class();


Withdraw.extend(db);

Withdraw.open = function() {
    return Withdraw.openCollection('Withdraw');
};

Withdraw.extend({
    getWithdrawFreezeFunds: function() {
        return new Promise(function(resolve, reject) {
            Withdraw.open().find({
                status: '未处理'
            }).then(function(Withdraws) {
                var count = 0;
                Withdraws.forEach(function (Withdraw) {
                    count += parseFloat(Withdraw.funds);
                });
                resolve(count.toFixed(4));
            })
        })
    },
    saveOne: function(withdraw, userId) {
        return new Promise(function(resolve, reject) {
            if(withdraw.funds < 5) {
                resolve('请不要跳过页面验证提现，提现不足5元仍然不能提现哦。。。。');
            }
            User.open().findById(userId)
                .then(function(user) {
                    var userFunds = (parseFloat(user.funds) - parseFloat(withdraw.funds)).toFixed(4);
                    withdraw.createTime = moment().format('YYYY-MM-DD HH:mm:ss');
                    withdraw.status = '未处理';
                    withdraw.user = user.username;
                    withdraw.userId = user._id;
                    withdraw.userFunds = userFunds;
                    if(userFunds >= 0){
                        Withdraw.open().insert(withdraw)
                            .then(function(results) {
                                User.open().updateById(user._id, {
                                    $set: {
                                        funds: userFunds,
                                        freezeFunds: (parseFloat(user.freezeFunds) + parseFloat(withdraw.funds)).toFixed(4)
                                    }
                                }).then(function () {
                                    resolve();
                                });
                            })
                    }else {
                        resolve('请不要跳过页面验证提现，你的余额不足仍然不能提现哦。。。。');
                    }
                })
        });
    },
    complete: function(id) {
       return new Promise(function(resolve, reject) {
           Withdraw.open().findById(id).then(function (withdraw) {
               User.open().findById(withdraw.userId).then(function(user) {
                   Withdraw.open().updateById(withdraw._id, {$set: {
                       status: '成功',
                       endTime: moment().format('YYYY-MM-DD HH:mm:ss')
                   }}).then(function() {
                       User.open().updateById(user._id, {
                           $set: {
                               freezeFunds: (parseFloat(user.freezeFunds) - parseFloat(withdraw.funds)).toFixed(4)
                           }
                       }).then(function () {
                           resolve();
                       });
                   })
               })
           });
       })
    },
    refused: function(id, info, funds, userId) {
        return new Promise(function(resolve, reject) {
            Withdraw.open().updateById(id, {$set: {
                status: '失败',
                endTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                refuseInfo: info
            }}).then(function() {
                User.open().findById(userId)
                    .then(function (user) {
                        User.open().updateById(user._id, {
                            $set: {
                                funds: (parseFloat(user.funds) + parseFloat(funds)).toFixed(4),
                                freezeFunds: (parseFloat(user.freezeFunds) - parseFloat(funds)).toFixed(4)
                            }
                        }).then(function () {
                            resolve();
                        });
                    });
            })
        })
    }
});

Withdraw.include({

});


module.exports = Withdraw;