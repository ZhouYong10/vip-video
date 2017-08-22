/**
 * Created by zhouyong10 on 1/24/16.
 */
var User = require('../models/User');
var Placard = require('../models/Placard');
var Recharge = require('../models/Recharge');
var Feedback = require('../models/Feedback');
var Withdraw = require('../models/Withdraw');

var moment = require('moment');
var Formidable = require('formidable');
var path = require('path');
var fs = require('fs');
var request = require('request');
var router = require('express').Router();

Object.defineProperty(global, 'logoDir', {
    value: path.join(__dirname, '../public/logos/'),
    writable: false,
    configurable: false
});


//拦截非管理员登录
router.use(function(req, res, next) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            var userIns = User.wrapToInstance(user);
            if(userIns.isAdmin()){
                User.getSystemFunds().then(function (canUse) {
                    req.session.systemFunds = canUse;
                    next();
                });
            }else{
                console.log('不是管理员，不能非法登陆。。。。。。。。。。。。');
                res.redirect('/');
            }
        }, function (error) {
            res.send('获取用户信息失败： ' + error);
        });
});


router.get('/home', function (req, res) {
    User.open().find({isLogin: true}).then(function (users) {
        Placard.open().findPages(null, (req.query.page ? req.query.page : 1))
            .then(function (obj) {
                res.render('adminHome', {
                    title: '管理员公告',
                    money: req.session.systemFunds,
                    placards: obj.results,
                    pages: obj.pages,
                    loginNum: users.length
                });
            }, function (error) {
                return res.send('获取公告列表失败： ' + error);
            });
    });
});

router.get('/get/system/funds', function(req, res) {
    User.getSystemFunds().then(function (count) {
        req.session.systemFunds = count;
        res.end(count);
    });
});

/*
* update header nav
* */
router.get('/update/header/nav', function (req, res) {
    var updateNav = {
        feedback: 0,
        recharge: 0,
        withdraw: 0
    };

    Feedback.open().find({status: '未处理'}).then(function (feedbacks) {
        updateNav.feedback = feedbacks.length;
        Recharge.open().find({status: '充值中'}).then(function (recharges) {
            updateNav.recharge = recharges.length;
            Withdraw.open().find({status: '未处理'}).then(function (withdraws) {
                updateNav.withdraw = withdraws.length;
                res.send(updateNav);
            });
        });
    });
});

/*
 * manage funds
 * */
router.get('/recharge', function (req, res) {
    Recharge.open().findPages({}, (req.query.page ? req.query.page : 1), {'createTime': -1})
        .then(function(obj) {
            res.render('adminRecharge', {
                title: '资金管理 / 充值记录',
                money: req.session.systemFunds,
                recharges: obj.results,
                pages: obj.pages,
                path: '/admin/recharge'
            });
        }, function(error) {
            res.send('查询充值记录失败： ' + error);
        })
});

router.get('/search/recharge/by/alipayId', function (req, res) {
    Recharge.open().find({
        alipayId: req.query.alipayId.replace(/(^\s*)|(\s*$)/g,"")
    }).then(function(obj) {
        res.render('adminRecharge', {
            title: '资金管理 / 充值记录',
            money: req.session.systemFunds,
            recharges: obj,
            pages: 0,
            path: '/admin/recharge'
        });
    }, function(error) {
        res.send('查询充值记录失败： ' + error);
    })
});

router.get('/search/user/recharge', function (req, res) {
    Recharge.findRechargeByUserId(req.query.userId, (req.query.page ? req.query.page : 1))
        .then(function (obj) {
            res.render('adminRecharge', {
                title: '资金管理 / 充值记录',
                money: req.session.systemFunds,
                recharges: obj.results,
                pages: obj.pages,
                path: '/admin/recharge'
            });
        }, function (error) {
            res.send('查询充值记录失败： ' + error);
        });
});

router.get('/hand/recharge', function (req, res) {
    var msg = req.query;
    if(isNaN(msg.funds)) {
        res.send('充值金额必须是数字。。。。。。');
    }else {
        var vipDays = Recharge.vipDays(msg.funds);
        Recharge.open().findById(msg.id).then(function (record) {
            if (record.isRecharge) {
                res.redirect(msg.url + '?date=' + new Date().getTime());
            } else {
                User.open().findById(record.userId)
                    .then(function (user) {

                        var vipTime = Date.parse(user.vipTime);
                        var nowTime = new Date().getTime();
                        if(vipTime - nowTime > 0){
                            vipTime = moment(user.vipTime).add('days', vipDays).format('YYYY-MM-DD HH:mm:ss');
                        }else{
                            vipTime = moment().add('days', vipDays).format('YYYY-MM-DD HH:mm:ss')
                        }
                        var profitToParent = (parseFloat(msg.funds) * 0.2).toFixed(4);
                        if(user.parentId) {
                            User.open().findById(user.parentId).then(function(parent) {
                                User.open().updateById(parent._id, {
                                    $set: {
                                        childrenProfit: (parseFloat(parent.childrenProfit) + parseFloat(profitToParent)).toFixed(4),
                                        canWithdraw: (parseFloat(parent.canWithdraw) + parseFloat(profitToParent)).toFixed(4)
                                    }
                                });
                            })
                        }
                        User.open().updateById(user._id, {
                            $set: {
                                funds: (parseFloat(user.funds) + parseFloat(msg.funds)).toFixed(4),
                                profitToParent: (parseFloat(user.profitToParent) + parseFloat(profitToParent)).toFixed(4),
                                vipTime: vipTime
                            }
                        }).then(function () {
                            Recharge.open().updateById(record._id, {$set: {
                                funds: parseFloat(msg.funds),
                                isRecharge: true,
                                status: '成功',
                                vipDays: vipDays,
                                userNowFunds: (parseFloat(record.userOldFunds) + parseFloat(msg.funds)).toFixed(4)
                            }}).then(function () {
                                res.redirect(msg.url + '?date=' + new Date().getTime());
                            });
                        });
                    });
            }
        });
    }
});

router.get('/hand/recharge/refuse', function (req, res) {
    var msg = req.query;
    Recharge.handRefuse(msg.id, msg.info).then(function() {
        res.redirect(msg.url);
    })
});

router.get('/withdraw/wait', function (req, res) {
    Withdraw.open().findPages({status: '未处理'}, (req.query.page ? req.query.page : 1))
        .then(function(obj) {
            res.render('adminWithdrawWait', {
                title: '资金管理 / 提现管理 / 待处理',
                money: req.session.systemFunds,
                withdraws: obj.results,
                pages: obj.pages,
                path: '/admin/withdraw/wait'
            });
        })
});

router.get('/withdraw/already', function (req, res) {
    Withdraw.open().findPages({status: {$in: ['成功', '失败']}}, (req.query.page ? req.query.page : 1))
        .then(function (obj) {
            res.render('adminWithdrawAlre', {
                title: '资金管理 / 提现管理 / 已处理',
                money: req.session.systemFunds,
                withdraws: obj.results,
                pages: obj.pages,
                path: '/admin/withdraw/already'
            });
        });
});

router.get('/withdraw/complete', function (req, res) {
    Withdraw.complete(req.query.id)
        .then(function() {
            res.redirect(req.query.url);
        })
});

router.get('/withdraw/refused', function (req, res) {
    var obj = req.query;
    Withdraw.refused(obj.id, obj.info, obj.funds, obj.userId)
        .then(function() {
            res.redirect(obj.url);
        })
});


/*
 * manage user
 * */
router.get('/manage/user', function (req, res) {
    User.open().findPages(null, (req.query.page ? req.query.page : 1))
        .then(function (obj) {
            res.render('adminManageUser', {
                title: '用户管理',
                money: req.session.systemFunds,
                users: obj.results,
                pages: obj.pages
            });
        }, function (error) {
            res.send('获取用户列表失败： ' + error);
        });
});

router.get('/search/user', function (req, res) {
    User.open().findPages({
        username: new RegExp(req.query.username)
    }, (req.query.page ? req.query.page : 1))
        .then(function (obj) {
            res.render('adminManageUser', {
                title: '用户管理',
                money: req.session.systemFunds,
                users: obj.results,
                pages: obj.pages
            });
        }, function (error) {
            res.send('获取用户列表失败： ' + error);
        });
});

router.get('/manage/user/edit', function(req, res) {
    User.open().findById(req.query.id)
        .then(function (user) {
            res.render('adminManageUserEdit', {
                title: '用户管理 / 编辑用户信息',
                money: req.session.systemFunds,
                user: user
            });
        }, function (error) {
            res.send('查询用户详情失败： ' + error);
        });
});

router.post('/manage/user/edit', function(req, res) {
    var updateInfo = req.body;
    var id = updateInfo.id;
    delete updateInfo.id;
    User.open().updateById(id, {$set: updateInfo})
        .then(function (user) {
            res.redirect('/admin/manage/user');
        }, function(error) {
            res.send('更新用户信息失败： ' + error);
        });
});

router.get('/user/edit/reset/password', function (req, res) {
    User.resetPassword(req.query.id)
        .then(function() {
            res.end();
        })
});

router.get('/manage/user/del', function(req, res) {
    User.removeUser(req.query.id).then(function () {
        res.redirect('/admin/manage/user');
    });
});


router.get('/lowerUsers/of/user', function (req, res) {
    User.open().findById(req.query.userId)
        .then(function (parent) {
            if(parent.childrenId.length > 0){
                User.open().find({_id: {$in: parent.childrenId}})
                    .then(function(obj) {
                        res.render('adminLowerUserOfUser', {
                            title: '用户管理 / ' + parent.username + '的下级用户',
                            money: req.session.systemFunds,
                            users: obj
                        });
                    }, function(error) {
                        throw new Error('查询下级用户信息失败： ' + error)
                    })
            }else {
                res.render('adminLowerUserOfUser', {
                    title: '用户管理 / ' + parent.username + '的下级用户',
                    money: req.session.systemFunds,
                    users: []
                });
            }
        }, function(error) {
            res.send(error);
        });
});

/*
 * manage placard
 * */
router.get('/placard/send', function (req, res) {
    res.render('adminPlacardSend', {
        title: '公告管理 / 发布公告',
        money: req.session.systemFunds
    })
});

router.post('/placard/send', function (req, res) {
    Placard.open().insert({
        type: req.body.type,
        typeName: Placard.getTypeName(req.body.type),
        placardContent: req.body.placardContent,
        sendTime: moment().format('YYYY-MM-DD HH:mm:ss')
    }).then(function (placard) {
        res.redirect('/admin/placard/history');
    }, function (error) {
        res.send('发布公告失败： ' + error);
    });
});

router.get('/placard/history', function (req, res) {
    Placard.open().findPages(null, (req.query.page ? req.query.page : 1))
        .then(function (obj) {
            res.render('adminPlacardHistory', {
                title: '公告管理 / 历史公告',
                money: req.session.systemFunds,
                placards: obj.results,
                pages: obj.pages
            });
        }, function (error) {
            return res.send('获取公告列表失败： ' + error);
        });
});

router.get('/placard/history/del', function (req, res) {
    Placard.open().removeById(req.query.id)
        .then(function (placard) {
            res.redirect('/admin/placard/history');
        }, function (error) {
            return res.send('删除公告失败： ' + error);
        });
});

router.get('/placard/add', function (req, res) {
    res.render('adminPlacardAdd', {
        title: '公告管理 / 添加公告类型',
        money: req.session.systemFunds
    })
});


router.get('/feedback/wait', function (req, res) {
    Feedback.open().findPages({
        status: '未处理'
    }, (req.query.page ? req.query.page : 1))
        .then(function(obj) {
        res.render('adminFeedbackWait', {
            title: '问题反馈 / 待处理',
            money: req.session.systemFunds,
            feedbacks: obj.results,
            pages: obj.pages
        });
    })
});

router.post('/feedback/wait/handle', function (req, res) {
    Feedback.handleFeedback(req.body, function(result) {
        res.redirect('/admin/feedback/wait');
    });
});

router.get('/feedback/already', function (req, res) {
    Feedback.open().findPages({
        status: '已处理'
    }, (req.query.page ? req.query.page : 1))
        .then(function (obj) {
        res.render('adminFeedbackAlre', {
            title: '问题反馈 / 已处理',
            money: req.session.systemFunds,
            feedbacks: obj.results,
            pages: obj.pages
        });
    });
});


module.exports = router;