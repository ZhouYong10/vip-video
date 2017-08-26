/**
 * Created by zhouyong10 on 1/24/16.
 */
var User = require('../models/User');
var Feedback = require('../models/Feedback');
var Recharge = require('../models/Recharge');
var Withdraw = require('../models/Withdraw');
var Utils = require('../models/Utils');
var router = require('express').Router();
var request = require('request');

var bcrypt = require('bcryptjs');
var moment = require('moment');


/*
* VIP免费看电影
* */
router.get('/vip/video', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            if(User.isVip(user)){
                res.render('vip',  {
                    user: user
                });
            }else{
                res.redirect('/user/recharge?msg=' + encodeURIComponent('您的VIP电影会员已过期，请充值！'));
            }
        });
});

router.get('/vip/video/teach', function (req, res) {
    res.render('teach');
});

router.get('/vip/video/url', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            if(User.isVip(user)){
                res.send({
                    isOk: true,
                    address: 'http://www.wmxz.wang/video.php?url='
                });
            }else{
                res.send({
                    isOk: false,
                    url: '/user/recharge?msg=' + encodeURIComponent('您的VIP电影会员已过期，请充值！')
                });
            }
        });
});

router.get('/recharge', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            res.render('recharge', {
                title: '在线充值',
                user: user,
                msg: req.query.msg
            })
        });
});

router.post('/recharge', function (req, res) {
    var alipayInfo = req.body;
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            alipayInfo.username = user.username;
            alipayInfo.userId = user._id;
            alipayInfo.userOldFunds = user.funds;
            alipayInfo.createTime = moment().format('YYYY-MM-DD HH:mm:ss');
            Recharge.record(alipayInfo)
                .then(function (alipay) {
                    var vipTime;
                    if(User.isVip(user)){
                        vipTime = moment(user.vipTime).add('days', alipay.vipDays).format('YYYY-MM-DD HH:mm:ss');
                    }else{
                        vipTime = moment().add('days', alipay.vipDays).format('YYYY-MM-DD HH:mm:ss')
                    }
                    var profitToParent = (parseFloat(alipay.funds) * 0.2).toFixed(4);

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
                    User.open().updateById(user._id, {$set: {
                        funds: (parseFloat(user.funds) + parseFloat(alipay.funds)).toFixed(4),
                        profitToParent: (parseFloat(user.profitToParent) + parseFloat(profitToParent)).toFixed(4),
                        vipTime: vipTime
                    }}).then(function() {
                        res.send({
                            isOK: true,
                            path: '/user/recharge/history'
                        });
                    })
                }, function(errInfo) {
                    res.send(errInfo);
                })
        });
});

router.get('/recharge/history', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            var info = {
                query: {
                    userId: user._id
                },
                page: req.query.page ? req.query.page : 1
            };
            Recharge.history(info).then(function (obj) {
                res.render('rechargeHistory', {
                    title: '充值记录',
                    user: user,
                    recharges: obj.results,
                    pages: obj.pages
                });
            }, function(errMsg) {
                res.send(errMsg);
            });
        });
});

router.get('/search/recharge', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            var query = {
                userId: user._id
            };
            if(req.query.funds) {
                query.funds = parseFloat(req.query.funds);
            }
            if(req.query.createTime) {
                query.createTime = new RegExp(req.query.createTime);
            }
            var info = {
                query: query,
                page: req.query.page ? req.query.page : 1
            };
            Recharge.history(info).then(function (obj) {
                res.render('rechargeHistory', {
                    title: '充值记录',
                    user: user,
                    recharges: obj.results,
                    pages: obj.pages
                });
            }, function(errMsg) {
                res.send(errMsg);
            });
        });
});

router.get('/info', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            res.render('userInfo', {
                title: '我的详细信息',
                user: user
            });
        }, function (error) {
            res.send('获取用户详细信息失败： ' + error);
        });
});

router.post('/info', function (req, res) {
    var update = req.body;
    User.open().updateById(req.session.passport.user, {
        $set: {
            qq: update.qq,
            phone: update.phone,
            email: update.email
        }
    }).then(function (user) {
        res.redirect('/user/info');
    }, function (error) {
        res.send('更新用户信息失败： ' + error);
    });
});

router.get('/logout', function(req, res){
    User.open().updateById(req.session.passport.user, {
        $set: {
            isLogin: false
        }
    }).then(function () {
        req.logout();
        res.redirect('/');
    });
});

router.get('/changePwd', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            res.render('changePassword', {
                title: '修改账号密码',
                user: user
            });
        });
});

router.post('/changePwd', function (req, res) {
    var info = req.body;
    var oldPwd = info.oldpwd,
        newPwd = info.newpwd,
        repeatPwd = info.repeatpwd;

    if(newPwd === repeatPwd) {
        User.open().findById(req.session.passport.user)
            .then(function(result) {
                var user = User.wrapToInstance(result);
                if(user.samePwd(oldPwd)){
                    User.open().update({
                        _id: user._id
                    }, {$set: {
                        password: bcrypt.hashSync(newPwd, bcrypt.genSaltSync(10))
                    }}).then(function(user) {
                        res.send({
                            isOK: true,
                            url: '/user/info'
                        });
                    }, function(error) {
                        res.send({
                            isOK: false,
                            info: '更新用户密码失败： ' + error
                        });
                    })
                }else{
                    res.send({
                        isOK: false,
                        info: '原密码错误！如果忘记密码，请联系管理员！！'
                    });
                }
            }, function(error) {
                res.send({
                    isOK: false,
                    info: '用户信息查询失败： ' + error
                });
            })
    }else{
        res.send({
            isOK: false,
            info: '新密码两次输入不一致！！'
        });
    }
});

router.post('/username/notrepeat', function (req, res) {
    User.open().findOne({
        username: req.body.username
    }).then(function (user) {
        if(user) {
            res.send({notRepeat: false});
        }else{
            res.send({notRepeat: true});
        }
    }, function (error) {
        res.send('查询用户信息失败： ' + error);
    });
});

router.get('/lowerUser', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (parent) {
            var invitation = 'http://' + req.headers.host + '/sign/in?invitation=' + Utils.cipher(parent._id + '', Utils.invitationKey);
            if(parent.childrenId.length > 0){
                User.open().findPages({_id: {$in: parent.childrenId}}, (req.query.page ? req.query.page : 1))
                    .then(function(obj) {
                        res.render('lowerUser', {
                            title: '我的下级用户',
                            user: parent,
                            invitation: invitation,
                            users: obj.results,
                            pages: obj.pages
                        });
                    }, function(error) {
                        throw new Error('查询下级用户信息失败： ' + error)
                    })
            }else {
                res.render('lowerUser', {
                    title: '我的下级用户',
                    user: parent,
                    invitation: invitation,
                    users: [],
                    pages: 1
                });
            }
        }, function(error) {
            res.send(error);
        });
});

router.get('/search/lowerUser', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (parent) {
            var invitation = req.headers.host + '/sign/in?invitation=' + Utils.cipher(parent._id + '', Utils.invitationKey);
            if(parent.childrenId.length > 0){
                User.open().findPages({
                    _id: {$in: parent.childrenId},
                    username: new RegExp(req.query.username)
                }, (req.query.page ? req.query.page : 1))
                    .then(function(obj) {
                        res.render('lowerUser', {
                            title: '我的下级用户',
                            user: parent,
                            invitation: invitation,
                            users: obj.results,
                            pages: obj.pages
                        });
                    }, function(error) {
                        throw new Error('查询下级用户信息失败： ' + error)
                    })
            }else {
                res.render('lowerUser', {
                    title: '我的下级用户',
                    user: parent,
                    invitation: invitation,
                    users: [],
                    pages: 1
                });
            }
        }, function(error) {
            res.send(error);
        });
});

router.get('/lowerUser/profit', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Recharge.open().findPages({
                    userId: {$in: user.childrenId}
                }, (req.query.page ? req.query.page : 1))
                .then(function(obj) {
                    res.render('lowerUserProfit', {
                        title: '下级返利详情',
                        user: user,
                        profits: obj.results,
                        pages: obj.pages
                    });
                }, function(error) {
                    throw new Error('查询下级用户信息失败： ' + error)
                })
        });
});

router.get('/feedback', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Feedback.open().findPages({userId: user._id}, (req.query.page ? req.query.page : 1))
                .then(function (obj) {
                    res.render('feedback', {
                        title: '问题反馈',
                        user: user,
                        feedbacks: obj.results,
                        pages: obj.pages
                    });
                }, function (error) {
                    res.send('获取反馈列表失败： ' + error);
                });
        });
});

router.get('/feedback/add', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            res.render('feedbackAdd', {
                title: '问题反馈 / 我要提意见',
                user: user
            });
        });
});

router.post('/feedback/add', function (req, res) {
    var feedback = req.body;
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            feedback.user = user.username;
            feedback.userId = user._id;
            feedback.userRole = user.role;
            Feedback.createFeedback(feedback)
                .then(function (result) {
                    socketIO.emit('updateNav', {feedback: 1});
                    res.redirect('/user/feedback');
                }, function (error) {
                    res.send('提交反馈失败： ' + error);
                });
        });
});

router.get('/withdraw', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Withdraw.open().findPages({userId: user._id}, (req.query.page ? req.query.page : 1))
                .then(function(obj) {
                    res.render('withdraw', {
                        title: '我要提现',
                        user: user,
                        withdraws: obj.results,
                        pages: obj.pages
                    });
                })
        });
});

router.get('/withdraw/add', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            if(User.isVip(user)){
                res.render('withdrawAdd', {
                    title: '申请提现',
                    user: user
                });
            }else{
                res.redirect('/user/recharge?msg=' + encodeURIComponent('非VIP会员，不具备提现资格！'));
            }
        });
});

router.post('/withdraw/add', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            if(User.isVip(user)){
                Withdraw.saveOne(req.body, user._id)
                    .then(function(msg) {
                        if(msg) {
                            res.send(msg);
                        }else {
                            socketIO.emit('updateNav', {withdraw: 1});
                            res.redirect('/user/withdraw');
                        }
                    })
            }else{
                res.redirect('/user/recharge?msg=' + encodeURIComponent('非VIP会员，不具备提现资格！'));
            }
        });
});

module.exports = router;