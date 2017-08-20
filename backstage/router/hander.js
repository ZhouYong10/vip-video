/**
 * Created by ubuntu64 on 5/11/16.
 */
var User = require('../models/User');
var Order = require('../models/Order');
var Task = require('../models/Task');

var router = require('express').Router();


router.get('/all', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Order.open().findPages({
                    status: '已发布',
                    taskUsers: {$not: {$all: [user._id]}}
                }, (req.query.page ? req.query.page : 1), {'onTop': -1, 'taskerReleasePrice': -1})
                .then(function (obj) {
                    res.render('handerAll', {
                        title: '任务大厅',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages
                    });
                });
        });
});

router.get('/type', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Order.open().findPages({
                    type: req.query.type,
                    status: '已发布',
                    taskUsers: {$not: {$all: [user._id]}}
                }, (req.query.page ? req.query.page : 1), {'onTop': -1, 'taskerReleasePrice': -1})
                .then(function (obj) {
                    res.render('handerAll', {
                        title: '任务大厅',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages
                    });
                });
        });
});

router.get('/show', function (req, res) {
    var orderId = req.query.id;
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            if(user.taskAccount && user.taskName){
                Order.open().findById(orderId)
                    .then(function(order) {
                        var flag = true;
                        for(var i = 0; i < order.taskUsers.length; i++) {
                            var taskUser = order.taskUsers[i];
                            if ((taskUser + '') == (user._id + '')) {
                                flag = false;
                                break;
                            }
                        }
                        if(flag) {
                            Task.getRandomStr(req).then(function(orderFlag) {
                                res.render('handerTaskShow', {
                                    user: user,
                                    order: order,
                                    orderFlag: orderFlag
                                });
                            })
                        }else{
                            res.send('<h1>您已经做过该任务了，不要以为我不知道哦！！！</h1>');
                        }
                    })
            }else{
                req.session.msg = '请填写您做任务的微信账户信息!';
                res.redirect('/hander/account');
            }
        });
});

router.post('/show', function (req, res) {
    Order.getOrder(req).then(function (info) {
        info.userId = req.session.passport.user;
        Task.checkRandomStr(req, info).then(function() {
            Task.createTask(info).then(function(task) {
                socketIO.emit('navUpdateNum', {'checks': 1, 'orderUser': task.user});
                res.redirect('/hander/all');
            }, function(err) {
                res.send('<h1>'+err+'</h1>'); //各种错误
            })
        }, function(msg) {
            res.send('<h1>'+msg+'</h1>');
        })
    }, function(err) {
        res.send('<h1>'+err+'</h1>'); //各种错误
    });
});

router.get('/alre', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Task.open().findPages({
                    taskUserId: user._id
                }, (req.query.page ? req.query.page : 1))
                .then(function (obj) {
                    res.render('handerAlre', {
                        title: '我做过的任务',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages
                    });
                });
        });
});

router.get('/search/alre', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            var query = {taskUserId: user._id};
            var titleOrAds = req.query.titleOrAds;
            if (titleOrAds) {
                if(titleOrAds.indexOf('http://') != -1) {
                    query.address = titleOrAds;
                }else {
                    query.title = new RegExp(titleOrAds);
                }
            }
            if (req.query.createTime) {
                query.createTime = new RegExp(req.query.createTime);
            }
            Task.open().findPages(query, (req.query.page ? req.query.page : 1))
                .then(function (obj) {
                    res.render('handerAlre', {
                        title: '我做过的任务',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages
                    });
                }, function (error) {
                    res.send('查询记录失败： ' + error);
                });
        });
});

router.get('/complaints', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Task.open().findPages({
                    taskUserId: user._id,
                    taskStatus: {$in: ['被投诉', '投诉成立', '投诉不成立']}
                }, (req.query.page ? req.query.page : 1))
                .then(function (obj) {
                    res.render('handerComplaints', {
                        title: '我被投诉的任务',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages
                    });
                });
        });
});


router.get('/account', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            res.render('handerAccount', {
                title: '我做任务的微信账户',
                user: user,
                message: req.session.msg ? req.session.msg : ''
            });
        }, function (error) {
            res.send('获取用户详细信息失败： ' + error);
        });
});

router.post('/account', function (req, res) {
    var update = req.body;
    User.open().updateById(req.session.passport.user, {
        $set: {
            taskAccount: update.taskAccount,
            taskName: update.taskName
        }
    }).then(function (user) {
        delete req.session.msg;
        res.redirect('/hander/account');
    }, function (error) {
        res.send('更新用户信息失败： ' + error);
    });
});

router.get('/look', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            res.render('handerLook', {
                title: '做任务必看',
                user: user
            });
        }, function (error) {
            res.send('获取用户详细信息失败： ' + error);
        });
});

module.exports = router;
