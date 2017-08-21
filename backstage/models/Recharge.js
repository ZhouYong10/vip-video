/**
 * Created by ubuntu64 on 2/26/16.
 */
var db = require('../dbWrap');
var Class = require('./Class');

var User = require('./User');
var moment = require('moment');


var Recharge = new Class();


Recharge.extend(db);


Recharge.extend({
    open: function() {
        return Recharge.openCollection('Recharge');
    },
    vipDays: function(funds) {
        var vipDays = 0;
        var money = parseInt(funds);
        if(money >= 3) {
            var years = Math.floor(money / 368);
            var yu = money % 368;
            var threeMonth = Math.floor(yu / 126);
            yu %= 126;
            var month = Math.floor(yu / 56);
            yu %= 56;
            var week = Math.floor(yu / 18);
            yu %= 18;
            var day = Math.floor(yu / 3);
            vipDays = years * 365 + threeMonth * 90 + month * 30 + week * 7 + day;
        }
        return vipDays;
    },
    hand: function(id, funds) {
        return new Promise(function(resolve, reject) {
            Recharge.open().findById(id)
                .then(function (record) {
                    Recharge.open().findOne({alipayId: record.alipayId, isRecharge: true})
                        .then(function (recordAlre) {
                            if(recordAlre) {
                                Recharge.open().update({alipayId: recordAlre.alipayId, isRecharge: false}, {
                                    $set: {
                                        isRecharge: true,
                                        dec: '已经充值过了还来，滚犊子...!',
                                        status: '失败'
                                    }
                                }).then(function () {
                                    resolve();
                                });
                            }else {
                                User.open().findById(record.userId)
                                    .then(function (user) {
                                        var fundsNow = (parseFloat(user.funds) + parseFloat(funds)).toFixed(4);
                                        User.open().updateById(user._id, {
                                            $set: {
                                                funds: fundsNow
                                            }
                                        }).then(function () {
                                            Recharge.open().updateById(record._id, {
                                                $set: {
                                                    funds: funds,
                                                    isRecharge: true,
                                                    dec: '充值成功!',
                                                    status: '成功',
                                                    userNowFunds: fundsNow
                                                }
                                            }).then(function () {
                                                resolve();
                                            });
                                        });
                                    });
                            }
                        });
                });
        })
    },
    handRefuse: function(id, info) {
        return new Promise(function(resolve) {
            Recharge.open().updateById(id, {
                $set: {
                    dec: info,
                    isRecharge: true,
                    status: '失败'
                }
            }).then(function () {
                resolve();
            });
        })
    },
    record: function(alipayInfo) {
        return new Promise(function(resolve, reject) {
            var alipayDate = alipayInfo.alipayId.substr(0, 8),
                today = moment().format('YYYYMMDD');
            if(alipayDate < (today)) {
                reject({
                    isOK: false,
                    message: '该交易号已经过期！'
                });
            }else if(!(/^[0-9]*[1-9][0-9]*$/.test(alipayInfo.alipayId)) || (alipayInfo.alipayId.length != 32 && alipayInfo.alipayId.length != 28)){
                reject({
                    isOK: false,
                    message: '请输入合法的支付宝交易号!'
                });
            } else {
                //查询充值记录是否存在
                Recharge.open().findOne({
                    alipayId: alipayInfo.alipayId
                }).then(function (alipay) {
                    //如果充值记录存在
                    if (alipay) {
                        if (alipay.isRecharge) {
                            reject({
                                isOK: false,
                                message: '该交易号已提交充值，不能重提交！'
                            });
                        } else {
                            if(alipay.funds) {
                                alipayInfo.isRecharge = true;
                                alipayInfo.status = '成功';
                                alipayInfo.vipDays = Recharge.vipDays(alipay.funds);
                                alipayInfo.userNowFunds = (parseFloat(alipay.funds) + parseFloat(alipayInfo.userOldFunds)).toFixed(4);
                                Recharge.open().updateById(alipay._id, {
                                    $set: alipayInfo
                                }).then(function () {
                                    resolve(alipay.funds, alipayInfo.vipDays);
                                });
                            }else{
                                reject({
                                    isOK: false,
                                    message: '该交易号已提交充值，不能重提交！'
                                });
                            }
                        }
                    } else {
                        alipayInfo.isRecharge = false;
                        alipayInfo.status = '充值中';
                        Recharge.open().insert(alipayInfo).then(function () {
                            reject({
                                isOK: true,
                                path: '/user/recharge/history'
                            });
                        });
                    }
                });
            }
        })
    },
    history: function(info){
        return new Promise(function(resolve, reject) {
            Recharge.open().findPages(info.query, info.page)
                .then(function (obj) {
                    resolve(obj);
                }, function (error) {
                    reject('查询充值记录失败： ' + error);
                });
        })
    },
    getAlipayIds: function() {
        return new Promise(function(resolve, reject) {
            Recharge.open().find({isRecharge: false})
                .then(function (results) {
                    var alipayIds = [];
                    for (var i = 0, len = results.length; i < len; i++) {
                        var result = results[i];
                        alipayIds.push(result.alipayId);
                    }
                    var sendStr = 'id:' + alipayIds.join(',');
                    resolve(sendStr);
                });
        })
    },
    updateRecord: function(result) {
        return new Promise(function(resolve, reject) {
            /*
             * 结果的格式中有’N’,’F’,’S’等状态,现在顺带做个说明。
             201304180000100089005XXX6446|N|0         不存在这个交易号
             201304180000100089005XXX6446|F|0         订单交易号存在但是代表交易不成功
             201304180000100089005XXX6446|S|10.00  订单交易号存在且交易成功，交易金额是10元
             * */
            var checkInfo = result.split('|'), aliplayId = checkInfo[0],
                status = checkInfo[1], funds = checkInfo[2], key = checkInfo[3];
            switch (status) {
                case "N":
                    Recharge.open().update({alipayId: aliplayId}, {
                        $set: {
                            dec: '交易号不存在，请转账后再充值!',
                            isRecharge: true,
                            status: '失败'
                        }
                    }).then(function () {
                        resolve();
                    });
                    break;
                case "F":
                    Recharge.open().update({alipayId: aliplayId}, {
                        $set: {
                            dec: '充值失败，请联系管理员!',
                            status: '失败'
                        }
                    }).then(function () {
                        resolve();
                    });
                    break;
                case "S":
                    Recharge.open().findOne({alipayId: aliplayId, isRecharge: true})
                        .then(function (recordAlre) {
                            if(recordAlre) {
                                Recharge.open().update({alipayId: aliplayId, isRecharge: false}, {
                                    $set: {
                                        isRecharge: true,
                                        dec: '已经充值过了还来，滚犊子...!',
                                        status: '失败'
                                    }
                                }).then(function () {
                                    resolve('已经充值过了还来，滚犊子...');
                                });
                            }else {
                                Recharge.open().findOne({alipayId: aliplayId, isRecharge: false})
                                    .then(function (record) {
                                        User.open().findById(record.userId)
                                            .then(function (user) {
                                                var fundsNow = (parseFloat(user.funds) + parseFloat(funds)).toFixed(4);
                                                User.open().updateById(user._id, {
                                                    $set: {
                                                        funds: fundsNow
                                                    }
                                                }).then(function () {
                                                    Recharge.open().updateById(record._id, {
                                                        $set: {
                                                            funds: funds,
                                                            isRecharge: true,
                                                            dec: '充值成功!',
                                                            status: '成功',
                                                            userNowFunds: fundsNow
                                                        }
                                                    }).then(function () {
                                                        resolve();
                                                    });
                                                });
                                            });
                                    });
                            }
                        });
                    break;
            }
        })
    },
    findRechargeByUserId: function(userId, page) {
        return new Promise(function(resolve, reject) {
            Recharge.open().findPages({userId: db.toObjectID(userId)}, page)
                .then(function(obj) {
                    resolve(obj);
                }, function(error) {
                    reject(error);
                })
        })
    }
});


Recharge.include({

});


module.exports = Recharge;