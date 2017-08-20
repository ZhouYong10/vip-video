/**
 * Created by zhouyong10 on 1/24/16.
 */
var User = require('../models/User');
var Placard = require('../models/Placard');
var Recharge = require('../models/Recharge');
var Error = require('../models/Error');
var Feedback = require('../models/Feedback');
var Withdraw = require('../models/Withdraw');

var Product = require('../models/Product');
var Order = require('../models/Order');
var Task = require('../models/Task');
var Address = require('../models/Address');

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
                    User.getSystemFreezeFunds().then(function(freezeFunds) {
                        req.session.freezeFunds = freezeFunds;
                        next();
                    })
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
                    freezeFunds: req.session.freezeFunds,
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
        checkOrder: 0,
        complaintTask: 0,
        feedback: 0,
        recharge: 0,
        withdraw: 0
    };

    Order.open().find({status: '审核中'}).then(function (orders) {
        updateNav.checkOrder = orders.length;
        Task.open().find({taskStatus: '被投诉'}).then(function (tasks) {
            updateNav.complaintTask = tasks.length;
            Feedback.open().find({status: '未处理'}).then(function (feedbacks) {
                updateNav.feedback = feedbacks.length;
                getRechargeNum().then(function (num) {
                    updateNav.recharge = num;
                    Withdraw.open().find({status: '未处理'}).then(function (withdraws) {
                        updateNav.withdraw = withdraws.length;
                        res.send(updateNav);
                    });
                })
            });
        });
    });

    function getRechargeNum() {
        return new Promise(function(resolve) {
            var url = 'http://www.hongtupingtai.com/handle/get/recharge/num?type=handle';
            request(url, function (err, resp, body) {
                var obj = JSON.parse(body);
                resolve(obj.num);
            });
        })
    }
});

/*
 * manage funds
 * */
router.get('/recharge', function (req, res) {
    var url = 'http://www.hongtupingtai.com/handle/manage/recharge?type=handle' +
        '&page=' + (req.query.page ? req.query.page : 1);
    request(url, function (err, resp, body) {
        var obj = JSON.parse(body);
        if(obj.results){
            res.render('adminRecharge', {
                title: '资金管理 / 充值记录',
                money: req.session.systemFunds,
                freezeFunds: req.session.freezeFunds,
                recharges: obj.results,
                pages: obj.pages,
                path: '/admin/recharge'
            });
        }else{
            res.send(obj);
        }
    });
});

router.get('/search/recharge/by/alipayId', function (req, res) {
    var url = 'http://www.hongtupingtai.com/handle/search/recharge/by/alipayId?type=handle' +
        '&alipayId=' + req.query.alipayId.replace(/(^\s*)|(\s*$)/g,"");
    request(url, function (err, resp, body) {
        var obj = JSON.parse(body);
        res.render('adminRecharge', {
            title: '资金管理 / 充值记录',
            money: req.session.systemFunds,
            freezeFunds: req.session.freezeFunds,
            recharges: obj,
            pages: 0,
            path: '/admin/recharge'
        });
    });
});

router.get('/search/user/recharge', function (req, res) {
    if(req.query.userId){
        req.session.searchRecharge = req.query.userId;
    }
    Recharge.findRechargeByUserId(req.session.searchRecharge, (req.query.page ? req.query.page : 1))
        .then(function (obj) {
            res.render('adminRecharge', {
                title: '资金管理 / 充值记录',
                money: req.session.systemFunds,
                freezeFunds: req.session.freezeFunds,
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
        var url = 'http://www.hongtupingtai.com/handle/hand/recharge?' +
            'alipayId=' + msg.id +
            '&funds=' + msg.funds;
        request(url, function (err, resp, body) {
            var result = JSON.parse(body);
            if(result.isOk) {
                User.open().findById(result.userId)
                    .then(function (user) {
                        User.open().updateById(user._id, {
                            $set: {
                                funds: (parseFloat(user.funds) + parseFloat(msg.funds)).toFixed(4)
                            }
                        }).then(function () {
                            res.redirect(msg.url + '?date=' + new Date().getTime());
                        });
                    });
            }else{
                res.redirect(msg.url + '?date=' + new Date().getTime());
            }
        });
    }
});

router.get('/hand/recharge/refuse', function (req, res) {
    var url = 'http://www.hongtupingtai.com/handle/hand/recharge/refuse?' +
        'alipayId=' + req.query.id +
        '&msg=' + encodeURIComponent(req.query.info);
    request(url, function (err, resp, body) {
        res.redirect(req.query.url + '?date=' + new Date().getTime());
    });
});

router.get('/withdraw/wait', function (req, res) {
    Withdraw.open().findPages({status: '未处理'}, (req.query.page ? req.query.page : 1))
        .then(function(obj) {
            res.render('adminWithdrawWait', {
                title: '资金管理 / 提现管理 / 待处理',
                money: req.session.systemFunds,
                freezeFunds: req.session.freezeFunds,
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
                freezeFunds: req.session.freezeFunds,
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
                freezeFunds: req.session.freezeFunds,
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
                freezeFunds: req.session.freezeFunds,
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
                freezeFunds: req.session.freezeFunds,
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
    User.removeUser(req.query.id).then(function (username) {
        Order.open().find({
            user: username,
            status: {$nin: ['已完成']}
        }).then(function (orders) {
                for (var i = 0; i < orders.length; i++) {
                    Order.open().updateById(orders[i]._id, {
                        $set: {
                            status: '已完成'
                        }
                    });
                }
                res.redirect('/admin/manage/user');
            });
    });
});

router.get('/manage/user/add', function (req, res) {
    res.render('adminManageUserAdd', {
        title: '设置 / 用户管理 / 添加用户',
        freezeFunds: req.session.freezeFunds,
        money: req.session.systemFunds
    })
});

router.post('/manage/user/add', function (req, res) {
    var userInfo = req.body;
    userInfo.username = userInfo.username.replace(/(^\s*)|(\s*$)/g, "");
    User.open().findById(req.session.passport.user)
        .then(function(result) {
            var parent = User.wrapToInstance(result);
            userInfo.parent = parent.username;
            userInfo.parentID = parent._id;
            User.createUser(userInfo, function (user) {
                parent.addChild(user[0]._id);
                User.open().updateById(parent._id, {
                    $set: parent
                }).then(function (result) {
                    res.redirect('/admin/manage/user');
                }, function(error) {
                    throw (new Error(error));
                });
            }, function (error) {
                res.send('添加下级用户失败： ' + error);
            });
        }, function(error) {
            res.send('查询上级用户信息失败： ' + error);
        })
});

router.get('/lowerUsers/of/user', function (req, res) {
    User.open().findById(req.query.userId)
        .then(function (parent) {
            if(parent.children && parent.children.length > 0){
                User.open().find({_id: {$in: parent.children}})
                    .then(function(obj) {
                        res.render('adminLowerUserOfUser', {
                            title: '用户管理 / ' + parent.username + '的下级用户',
                            money: req.session.systemFunds,
                            freezeFunds: req.session.freezeFunds,
                            users: obj
                        });
                    }, function(error) {
                        throw new Error('查询下级用户信息失败： ' + error)
                    })
            }else {
                res.render('adminLowerUserOfUser', {
                    title: '用户管理 / ' + parent.username + '的下级用户',
                    money: req.session.systemFunds,
                    freezeFunds: req.session.freezeFunds,
                    users: []
                });
            }
        }, function(error) {
            res.send(error);
        });
});



/*
 * manage price
 * */
router.get('/price/manage', function (req, res) {
    Product.open().find()
        .then(function (obj) {
            res.render('adminPriceManage', {
                title: '价格管理',
                money: req.session.systemFunds,
                freezeFunds: req.session.freezeFunds,
                products: obj
            });
        });
});

router.post('/price/manage', function (req, res) {
    Product.open().insert(req.body)
        .then(function (result) {
            res.send(result[0]);
        });
});

router.post('/price/manage/update', function (req, res) {
    var id = req.body.id;
    delete req.body.id;
    Product.open().updateById(id, {$set: req.body})
        .then(function (result) {
            res.end();
        });
});

router.post('/price/manage/delete', function (req, res) {
    Product.open().removeById(req.body.id)
        .then(function () {
            res.end();
        });
});


/*
 * manage placard
 * */
router.get('/placard/send', function (req, res) {
    res.render('adminPlacardSend', {
        title: '公告管理 / 发布公告',
        freezeFunds: req.session.freezeFunds,
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
                freezeFunds: req.session.freezeFunds,
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
        freezeFunds: req.session.freezeFunds,
        money: req.session.systemFunds
    })
});

/*
* manage order handle
* */
global.orderCheckIsOpen = 'no';
router.get('/check/wait', function (req, res) {
    Order.open().findPages({
            status: '审核中'
        }, (req.query.page ? req.query.page : 1))
        .then(function(obj) {
            res.render('adminCheckWait', {
                title: '待发布任务',
                money: req.session.systemFunds,
                freezeFunds: req.session.freezeFunds,
                orders: obj.results,
                pages: obj.pages,
                orderCheckIsOpen: global.orderCheckIsOpen,
                path: '/admin/check/wait'
            });
        })
});

router.get('/orderCheckOpen', function (req, res) {
    global.orderCheckIsOpen = 'yes';
    res.end(global.orderCheckIsOpen);
});

router.get('/orderCheckClose', function (req, res) {
    global.orderCheckIsOpen = 'no';
    res.end(global.orderCheckIsOpen);
});

router.get('/check/release', function (req, res) {
    var orderId = req.query.id;
    var url = req.query.url;
    Order.open().updateById(orderId, {
        $set: {
            status: '已发布'
        }
    }).then(function () {
        res.redirect(url);
    });
});

router.get('/check/refuse/refund', function (req, res) {
    var msg = req.query;
    Order.open().findById(msg.id)
        .then(function(order) {
            if(order.status != '已退款'){
                var orderIns = Order.wrapToInstance(order);
                orderIns.refund(msg.info, function() {
                    res.redirect(msg.url);
                });
            }else {
                res.redirect(msg.url);
            }
        })
});

router.get('/check/already', function (req, res) {
    Order.open().findPages({
            status: '已发布'
        }, (req.query.page ? req.query.page : 1))
        .then(function (obj) {
            res.render('adminCheckAlre', {
                title: '执行中任务',
                money: req.session.systemFunds,
                freezeFunds: req.session.freezeFunds,
                orders: obj.results,
                pages: obj.pages
            });
        });
});

router.get('/order/refund', function (req, res) {
    Task.open().find({
        orderId: req.query.id,
        taskStatus: {$in: ['待审核', '被投诉']}
    }).then(function (tasks) {
        if(tasks.length > 0) {
            res.redirect('/admin/order/details?orderId=' + req.query.id + '&refund=true');
        }else {
            Order.open().findById(req.query.id).then(function(order) {
                Order.open().updateById(order._id, {$set: {
                    status: '已退款',
                    surplus: 0,
                    refundInfo: req.query.info
                }}).then(function() {
                    User.open().findById(order.userId).then(function(user) {
                        if(user) {
                            User.open().updateById(user._id, {$set: {
                                funds: (parseFloat(user.funds) + parseFloat(order.surplus)).toFixed(4),
                                freezeFunds: (parseFloat(user.freezeFunds) - parseFloat(order.surplus)).toFixed(4)
                            }}).then(function() {
                                res.redirect('/admin/check/already');
                            })
                        }else{
                            User.open().findOne({username: 'admin'})
                                .then(function (admin) {
                                    User.open().updateById(admin._id, {
                                        $set: {
                                            funds: (parseFloat(admin.funds) + parseFloat(order.surplus)).toFixed(4),
                                            freezeFunds: (parseFloat(admin.freezeFunds) - parseFloat(order.surplus)).toFixed(4)
                                        }
                                    }).then(function () {
                                        res.redirect('/admin/check/already');
                                    });
                                });
                        }
                    })
                })
            })
        }
    });
});

router.get('/check/refund', function (req, res) {
    Order.open().findPages({
            status: '已退款'
        }, (req.query.page ? req.query.page : 1))
        .then(function(obj) {
            res.render('adminCheckRefund', {
                title: '已退款任务',
                money: req.session.systemFunds,
                freezeFunds: req.session.freezeFunds,
                orders: obj.results,
                pages: obj.pages,
                path: '/admin/check/refund'
            });
        })
});

router.get('/order/complete', function (req, res) {
    Order.open().findPages({
            status: '已完成'
        }, (req.query.page ? req.query.page : 1))
        .then(function(obj) {
            res.render('adminOrderComplete', {
                title: '已完结任务',
                money: req.session.systemFunds,
                freezeFunds: req.session.freezeFunds,
                orders: obj.results,
                pages: obj.pages
            });
        })
});

router.get('/order/details', function (req, res) {
    var query = {
        orderId: req.query.orderId
    };
    if(req.query.refund) {
        query = {
            orderId: req.query.orderId,
            taskStatus: {$in: ['待审核', '被投诉']}
        }
    }
    Task.open().findPages(query, (req.query.page ? req.query.page : 1))
        .then(function (obj) {
            var renderInfo = {
                title: '人工任务管理 / 任务进度详情',
                money: req.session.systemFunds,
                freezeFunds: req.session.freezeFunds,
                orders: obj.results,
                pages: obj.pages,
                msg: undefined
            };
            if(req.query.refund) {
                renderInfo.msg = '该订单存在待审核或被投诉任务，清楚理后再取消！';
            }
            res.render('adminOrderDetails', renderInfo);
        });
});

router.get('/task/complete', function (req, res) {
    Task.open().findById(req.query.id).then(function(task) {
        var taskIns = Task.wrapToInstance(task);
        taskIns.success().then(function() {
            res.redirect('/admin/order/details?orderId=' + taskIns.orderId + '&refund=true');
        })
    })
});

router.get('/task/refund', function (req, res) {
    Task.open().findById(req.query.id).then(function(task) {
        var taskIns = Task.wrapToInstance(task);
        taskIns.refuse().then(function () {
            res.redirect('/admin/order/details?orderId=' + taskIns.orderId + '&refund=true');
        });
    })
});

router.get('/complaint/wait', function (req, res) {
    Task.open().findPages({
            taskStatus: '被投诉'
        }, (req.query.page ? req.query.page : 1))
        .then(function (obj) {
            res.render('adminComplaintWait', {
                title: '被投诉任务',
                money: req.session.systemFunds,
                freezeFunds: req.session.freezeFunds,
                orders: obj.results,
                pages: obj.pages
            });
        });
});

router.get('/complaint/success', function (req, res) {
    Task.open().findById(req.query.taskId).then(function(task) {
        var taskIns = Task.wrapToInstance(task);
        taskIns.refuse().then(function () {
            res.redirect('/admin/complaint/wait');
        });
    })
});

router.get('/complaint/refuse', function (req, res) {
    Task.open().findById(req.query.taskId).then(function(task) {
        var taskIns = Task.wrapToInstance(task);
        taskIns.success().then(function() {
            Task.open().updateById(req.query.taskId, {$set: {
                taskStatus: '投诉不成立',
                complaintRefuse: req.query.info
            }}).then(function () {
                res.redirect('/admin/complaint/wait');
            });
        })
    })
});

router.get('/complaint/alre', function (req, res) {
    Task.open().findPages({
            taskStatus: {$in: ['投诉成立', '投诉不成立']}
        }, (req.query.page ? req.query.page : 1))
        .then(function (obj) {
            res.render('adminComplaintAlre', {
                title: '被投诉已处理',
                money: req.session.systemFunds,
                freezeFunds: req.session.freezeFunds,
                orders: obj.results,
                pages: obj.pages
            });
        });
});



/*
 * manage order form
 * */

router.get('/redirect/aim/order', function (req, res) {
    var orderId = req.query.id, type = req.query.type, smallType = req.query.smallType,
        render = '', title = '', money = req.session.systemFunds, freezeFunds = req.session.freezeFunds,
        pages = 1, path = '/admin/error/wait';
    Order.open().findById(orderId).then(function(result) {
        var arr = [];
        arr.push(result);
        switch (type) {
            case 'forum':
                render = 'adminReplyAlre';
                title = '回复任务管理 / 已处理订单';
                break;
            case 'flow':
                render = 'adminFlowAlre';
                title = '流量任务管理 / 已处理订单';
                break;
            case 'wx':
                switch (smallType) {
                    case 'article': case 'share': case 'collect':
                    render = 'adminWXarticleAlre';
                    title = '微信任务管理 / 已处理微信原文任务';
                    break;
                    case 'read': case 'like':
                    render = 'adminWXlikeAlre';
                    title = '微信任务管理 / 已处理微信阅读点赞任务';
                        break;
                    case 'readQuick': case 'likeQuick':
                    render = 'adminWXlikeQuickAlre';
                    title = '微信任务管理 / 已处理微信阅读点赞快速任务';
                    break;
                    case 'fans':
                        render = 'adminWXreplyAlre';
                        title = '微信任务管理 / 已处理公众粉丝回复任务';
                        break;
                    case 'friend':
                        render = 'adminWXfriendAlre';
                        title = '微信任务管理 / 已处理微信个人好友任务';
                        break;
                    case 'code':
                        render = 'adminWXcodeAlre';
                        title = '微信任务管理 / 已处理微信好友地区扫码';
                        break;
                }
                break;
            case 'mp':
                render = 'adminMPAlre';
                title = '美拍任务管理 / 已处理订单';
                break;
            case 'wb':
                render = 'adminWBAlre';
                title = '微博任务管理 / 已处理订单';
                break;
        }
        res.render(render, {
            title: title,
            money: money,
            freezeFunds: freezeFunds,
            orders: arr,
            pages: pages,
            path: path,
            readTotal: result.num
        });
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
            freezeFunds: req.session.freezeFunds,
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
            freezeFunds: req.session.freezeFunds,
            feedbacks: obj.results,
            pages: obj.pages
        });
    });
});


module.exports = router;