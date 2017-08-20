/**
 * Created by ubuntu64 on 5/11/16.
 */
var User = require('../models/User');
var Order = require('../models/Order');
var Product = require('../models/Product');
var Consume = require('../models/Consume');
var Task = require('../models/Task');

var moment = require('moment');
var path = require('path');
var router = require('express').Router();



Object.defineProperty(global, 'handleExam', {
    value: path.join(__dirname, '../public/handle_example/'),
    writable: false,
    configurable: false
});

router.get('/WX/fans', function (req, res) {
    var obj = {
        type: 'WXfans'
    };
    if(req.query.account) {
        obj.account = new RegExp(req.query.account);
    }
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            obj.userId = user._id;
            Order.open().findPages(obj, (req.query.page ? req.query.page : 1))
                .then(function(obj) {
                    res.render('taskerWXfans', {
                        title: '微信粉丝(回复)',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages,
                        path: '/tasker/WX/fans'
                    })
                })
        });
});

router.get('/WX/fans/add', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Product.open().findOne({type: 'WXfans'})
                .then(function(fansP) {
                    var fans = Product.wrapToInstance(fansP);
                    var fansPrice = fans.getPriceByUser(user);
                    Product.open().findOne({type: 'WXfansReply'})
                        .then(function(replyP) {
                            var reply = Product.wrapToInstance(replyP);
                            var replyPrice = reply.getPriceByUser(user);
                            Order.getRandomStr(req).then(function(orderFlag) {
                                res.render('taskerWXfansAdd', {
                                    title: '添加微信粉丝(回复)任务',
                                    user: user,
                                    fansPrice: fansPrice,
                                    replyPrice: replyPrice,
                                    orderFlag: orderFlag
                                })
                            })
                        });
                });
        });
});

router.post('/WX/fans/add', function (req, res) {
    Order.getOrder(req).then(function (order) {
        User.open().findById(req.session.passport.user)
            .then(function (user) {
                var orderIns = Order.wrapToInstance(order);
                orderIns.checkRandomStr(req).then(function() {
                    if(orderIns.isTow) {
                        orderIns.createTwo(user, {type: 'WXfans'}, {type: 'WXfansReply'})
                            .then(function () {
                                if(global.orderCheckIsOpen == 'yes'){
                                    socketIO.emit('updateNav', {checkOrder: 1});
                                }
                                res.redirect('/tasker/WX/fans');
                            }, function() {
                                res.send('<h1>您的余额不足，请充值！ 顺便多说一句，请不要跳过页面非法提交数据。。。不要以为我不知道哦！！</h1>')
                            });
                    }else {
                        delete orderIns.price2;
                        orderIns.createOne(user, {type: 'WXfans'})
                            .then(function () {
                                if(global.orderCheckIsOpen == 'yes'){
                                    socketIO.emit('updateNav', {checkOrder: 1});
                                }
                                res.redirect('/tasker/WX/fans');
                            }, function() {
                                res.send('<h1>您的余额不足，请充值！ 顺便多说一句，请不要跳过页面非法提交数据。。。不要以为我不知道哦！！</h1>')
                            });
                    }
                }, function(msg) {
                    res.redirect('/tasker/WX/fans');
                })
            });
    }, function(err) {
        res.end('提交表单失败： ',err); //各种错误
    });
});

router.get('/WX/friend', function (req, res) {
    var obj = {
        type: 'WXfriend'
    };
    if(req.query.account) {
        obj.account = new RegExp(req.query.account);
    }
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            obj.userId = user._id;
            Order.open().findPages(obj, (req.query.page ? req.query.page : 1))
                .then(function(obj) {
                    res.render('taskerWXfriend', {
                        title: '微信个人好友',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages,
                        path: '/tasker/WX/friend'
                    })
                })
        });
});

router.get('/WX/friend/add', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Product.open().findOne({type: 'WXfriend'})
                .then(function(result) {
                    var fans = Product.wrapToInstance(result);
                    var fansPrice = fans.getPriceByUser(user);
                    Order.getRandomStr(req).then(function(orderFlag) {
                        res.render('taskerWXfriendAdd', {
                            title: '添加微信个人好友任务',
                            user: user,
                            fansPrice: fansPrice,
                            orderFlag: orderFlag
                        })
                    })
                });
        });
});

router.post('/WX/friend/add', function (req, res) {
    Order.getOrder(req).then(function (order) {
        User.open().findById(req.session.passport.user)
            .then(function (user) {
                var orderIns = Order.wrapToInstance(order);
                orderIns.checkRandomStr(req).then(function() {
                    delete orderIns.price2;
                    orderIns.createOne(user, {type: 'WXfriend'})
                        .then(function () {
                            if(global.orderCheckIsOpen == 'yes'){
                                socketIO.emit('updateNav', {checkOrder: 1});
                            }
                            res.redirect('/tasker/WX/friend');
                        }, function() {
                            res.send('<h1>您的余额不足，请充值！ 顺便多说一句，请不要跳过页面非法提交数据。。。不要以为我不知道哦！！</h1>')
                        });
                }, function(msg) {
                    res.redirect('/tasker/WX/friend');
                })
            });
    }, function(err) {
        res.end('提交表单失败： ',err); //各种错误
    });
});

router.get('/WX/vote', function (req, res) {
    var obj = {
        type: 'WXvote'
    };
    if(req.query.address) {
        obj.address = new RegExp(req.query.address);
    }
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            obj.userId = user._id;
            Order.open().findPages(obj, (req.query.page ? req.query.page : 1))
                .then(function(obj) {
                    Order.addSchedule(obj.results, 10);
                    res.render('taskerWXvote', {
                        title: '微信投票',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages,
                        path: '/tasker/WX/vote'
                    })
                })
        });
});

router.get('/WX/vote/add', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Product.open().findOne({type: 'WXvote'})
                .then(function(result) {
                    var fans = Product.wrapToInstance(result);
                    var fansPrice = fans.getPriceByUser(user);
                    Order.getRandomStr(req).then(function(orderFlag) {
                        res.render('taskerWXvoteAdd', {
                            title: '添加微信投票任务',
                            user: user,
                            fansPrice: fansPrice,
                            orderFlag: orderFlag
                        })
                    })
                });
        });
});

router.post('/WX/vote/add', function (req, res) {
    Order.getOrder(req).then(function (order) {
        User.open().findById(req.session.passport.user)
            .then(function (user) {
                var orderIns = Order.wrapToInstance(order);
                delete orderIns.price2;
                orderIns.checkRandomStr(req).then(function() {
                    orderIns.createOne(user, {type: 'WXvote'})
                        .then(function () {
                            if(global.orderCheckIsOpen == 'yes'){
                                socketIO.emit('updateNav', {checkOrder: 1});
                            }
                            res.redirect('/tasker/WX/vote');
                        }, function() {
                            res.send('<h1>您的余额不足，请充值！ 顺便多说一句，请不要跳过页面非法提交数据。。。不要以为我不知道哦！！</h1>')
                        });
                }, function(msg) {
                    res.redirect('/tasker/WX/vote');
                })
            });
    }, function(err) {
        res.end('提交表单失败： ',err); //各种错误
    });
});

router.get('/WX/code', function (req, res) {
    var obj = {
        type: 'WXcode'
    };
    if(req.query.account) {
        obj.account = new RegExp(req.query.account);
    }
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            obj.userId = user._id;
            Order.open().findPages(obj, (req.query.page ? req.query.page : 1))
                .then(function(obj) {
                    res.render('taskerWXcode', {
                        title: '微信扫码(回复)',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages,
                        path: '/tasker/WX/code'
                    })
                })
        });
});

router.get('/WX/code/add', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Product.open().findOne({type: 'WXcode'})
                .then(function(result) {
                    var fans = Product.wrapToInstance(result);
                    var fansPrice = fans.getPriceByUser(user);
                    Product.open().findOne({type: 'WXcodeReply'})
                        .then(function(result) {
                            var reply = Product.wrapToInstance(result);
                            var replyPrice = reply.getPriceByUser(user);
                            Order.getRandomStr(req).then(function(orderFlag) {
                                res.render('taskerWXcodeAdd', {
                                    title: '添加微信扫码(回复)任务',
                                    user: user,
                                    fansPrice: fansPrice,
                                    replyPrice: replyPrice,
                                    orderFlag: orderFlag
                                })
                            })
                        });
                });
        });
});

router.post('/WX/code/add', function (req, res) {
    Order.getOrder(req).then(function (order) {
        User.open().findById(req.session.passport.user)
            .then(function (user) {
                var orderIns = Order.wrapToInstance(order);
                orderIns.checkRandomStr(req).then(function() {
                    if(orderIns.isTow) {
                        orderIns.createTwo(user, {type: 'WXcode'}, {type: 'WXcodeReply'})
                            .then(function () {
                                if(global.orderCheckIsOpen == 'yes'){
                                    socketIO.emit('updateNav', {checkOrder: 1});
                                }
                                res.redirect('/tasker/WX/code');
                            }, function() {
                                res.send('<h1>您的余额不足，请充值！ 顺便多说一句，请不要跳过页面非法提交数据。。。不要以为我不知道哦！！</h1>')
                            });
                    }else {
                        delete orderIns.price2;
                        orderIns.createOne(user, {type: 'WXcode'})
                            .then(function () {
                                if(global.orderCheckIsOpen == 'yes'){
                                    socketIO.emit('updateNav', {checkOrder: 1});
                                }
                                res.redirect('/tasker/WX/code');
                            }, function() {
                                res.send('<h1>您的余额不足，请充值！ 顺便多说一句，请不要跳过页面非法提交数据。。。不要以为我不知道哦！！</h1>')
                            });
                    }
                }, function(msg) {
                    res.redirect('/tasker/WX/code');
                })
            });
    }, function(err) {
        res.end('提交表单失败： ',err); //各种错误
    });
});

router.get('/WX/article', function (req, res) {
    var obj = {
        type: 'WXarticleShare'
    };
    if(req.query.address) {
        obj.address = new RegExp(req.query.address);
    }
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            obj.userId = user._id;
            Order.open().findPages(obj, (req.query.page ? req.query.page : 1))
                .then(function(obj) {
                    res.render('taskerWXarticle', {
                        title: '微信原文/收藏/分享',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages,
                        path: '/tasker/WX/article'
                    })
                })
        });
});

router.get('/WX/article/add', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Product.open().findOne({type: 'WXarticleShare'})
                .then(function(result) {
                    var fans = Product.wrapToInstance(result);
                    var fansPrice = fans.getPriceByUser(user);
                    Product.open().findOne({type: 'WXarticleHide'})
                        .then(function(result) {
                            var reply = Product.wrapToInstance(result);
                            var replyPrice = reply.getPriceByUser(user);
                            Order.getRandomStr(req).then(function(orderFlag) {
                                res.render('taskerWXarticleAdd', {
                                    title: '添加微信原文/收藏/分享任务',
                                    user: user,
                                    fansPrice: fansPrice,
                                    replyPrice: replyPrice,
                                    orderFlag: orderFlag
                                })
                            })
                        });
                });
        });
});

router.post('/WX/article/add', function (req, res) {
    Order.getOrder(req).then(function (order) {
        User.open().findById(req.session.passport.user)
            .then(function (user) {
                var orderIns = Order.wrapToInstance(order);
                orderIns.checkRandomStr(req).then(function() {
                    if(orderIns.isTow) {
                        orderIns.createTwo(user, {type: 'WXarticleShare'}, {type: 'WXarticleHide'})
                            .then(function () {
                                if(global.orderCheckIsOpen == 'yes'){
                                    socketIO.emit('updateNav', {checkOrder: 1});
                                }
                                res.redirect('/tasker/WX/article');
                            }, function() {
                                res.send('<h1>您的余额不足，请充值！ 顺便多说一句，请不要跳过页面非法提交数据。。。不要以为我不知道哦！！</h1>')
                            });
                    }else {
                        delete orderIns.price2;
                        orderIns.createOne(user, {type: 'WXarticleShare'})
                            .then(function () {
                                if(global.orderCheckIsOpen == 'yes'){
                                    socketIO.emit('updateNav', {checkOrder: 1});
                                }
                                res.redirect('/tasker/WX/article');
                            }, function() {
                                res.send('<h1>您的余额不足，请充值！ 顺便多说一句，请不要跳过页面非法提交数据。。。不要以为我不知道哦！！</h1>')
                            });
                    }
                }, function(msg) {
                    res.redirect('/tasker/WX/article');
                })
            });
    }, function(err) {
        res.end('提交表单失败： ',err); //各种错误
    });
});


router.get('/WB/fans', function (req, res) {
    var obj = {
        type: 'WBfans'
    };
    if(req.query.account) {
        obj.account = new RegExp(req.query.account);
    }
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            obj.userId = user._id;
            Order.open().findPages(obj, (req.query.page ? req.query.page : 1))
                .then(function(obj) {
                    res.render('taskerWBfans', {
                        title: '微博关注',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages,
                        path: '/tasker/WB/fans'
                    })
                })
        });
});

router.get('/WB/fans/add', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Product.open().findOne({type: 'WBfans'})
                .then(function(fansP) {
                    var fans = Product.wrapToInstance(fansP);
                    var fansPrice = fans.getPriceByUser(user);
                    Order.getRandomStr(req).then(function(orderFlag) {
                        res.render('taskerWBfansAdd', {
                            title: '添加微博关注任务',
                            user: user,
                            fansPrice: fansPrice,
                            orderFlag: orderFlag
                        })
                    })
                });
        });
});

router.post('/WB/fans/add', function (req, res) {
    Order.getOrder(req).then(function (order) {
        User.open().findById(req.session.passport.user)
            .then(function (user) {
                var orderIns = Order.wrapToInstance(order);
                orderIns.checkRandomStr(req).then(function() {
                    orderIns.createOne(user, {type: 'WBfans'})
                        .then(function () {
                            if (global.orderCheckIsOpen == 'yes') {
                                socketIO.emit('updateNav', {checkOrder: 1});
                            }
                            res.redirect('/tasker/WB/fans');
                        }, function () {
                            res.send('<h1>您的余额不足，请充值！ 顺便多说一句，请不要跳过页面非法提交数据。。。不要以为我不知道哦！！</h1>')
                        });
                }, function(msg) {
                    res.redirect('/tasker/WB/fans');
                })
            });
    }, function(err) {
        res.end('提交表单失败： ',err); //各种错误
    });
});

router.get('/WB/vote', function (req, res) {
    var obj = {
        type: 'WBvote'
    };
    if(req.query.account) {
        obj.address = new RegExp(req.query.account);
    }
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            obj.userId = user._id;
            Order.open().findPages(obj, (req.query.page ? req.query.page : 1))
                .then(function(obj) {
                    Order.addSchedule(obj.results, 10);
                    res.render('taskerWBvote', {
                        title: '微博投票',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages,
                        path: '/tasker/WB/vote'
                    })
                })
        });
});

router.get('/WB/vote/add', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Product.open().findOne({type: 'WBvote'})
                .then(function(result) {
                    var fans = Product.wrapToInstance(result);
                    var fansPrice = fans.getPriceByUser(user);
                    Order.getRandomStr(req).then(function(orderFlag) {
                        res.render('taskerWBvoteAdd', {
                            title: '添加微博投票任务',
                            user: user,
                            fansPrice: fansPrice,
                            orderFlag: orderFlag
                        })
                    })
                });
        });
});

router.post('/WB/vote/add', function (req, res) {
    Order.getOrder(req).then(function (order) {
        User.open().findById(req.session.passport.user)
            .then(function (user) {
                var orderIns = Order.wrapToInstance(order);
                orderIns.checkRandomStr(req).then(function() {
                    orderIns.createOne(user, {type: 'WBvote'})
                        .then(function () {
                            if(global.orderCheckIsOpen == 'yes'){
                                socketIO.emit('updateNav', {checkOrder: 1});
                            }
                            res.redirect('/tasker/WB/vote');
                        }, function() {
                            res.send('<h1>您的余额不足，请充值！ 顺便多说一句，请不要跳过页面非法提交数据。。。不要以为我不知道哦！！</h1>')
                        });
                }, function(msg) {
                    res.redirect('/tasker/WB/vote');
                })
            });
    }, function(err) {
        res.end('提交表单失败： ',err); //各种错误
    });
});

router.get('/WB/forward', function (req, res) {
    var obj = {
        type: 'WBforward'
    };
    if(req.query.account) {
        obj.address = new RegExp(req.query.account);
    }
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            obj.userId = user._id;
            Order.open().findPages(obj, (req.query.page ? req.query.page : 1))
                .then(function(obj) {
                    res.render('taskerWBforward', {
                        title: '微博转发',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages,
                        path: '/tasker/WB/forward'
                    })
                })
        });
});

router.get('/WB/forward/add', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Product.open().findOne({type: 'WBforward'})
                .then(function(result) {
                    var fans = Product.wrapToInstance(result);
                    var fansPrice = fans.getPriceByUser(user);
                    Order.getRandomStr(req).then(function(orderFlag) {
                        res.render('taskerWBforwardAdd', {
                            title: '添加微博转发任务',
                            user: user,
                            fansPrice: fansPrice,
                            orderFlag: orderFlag
                        })
                    })
                });
        });
});

router.post('/WB/forward/add', function (req, res) {
    Order.getOrder(req).then(function (order) {
        User.open().findById(req.session.passport.user)
            .then(function (user) {
                var orderIns = Order.wrapToInstance(order);
                orderIns.checkRandomStr(req).then(function() {
                    orderIns.createOne(user, {type: 'WBforward'})
                        .then(function () {
                            if(global.orderCheckIsOpen == 'yes'){
                                socketIO.emit('updateNav', {checkOrder: 1});
                            }
                            res.redirect('/tasker/WB/forward');
                        }, function() {
                            res.send('<h1>您的余额不足，请充值！ 顺便多说一句，请不要跳过页面非法提交数据。。。不要以为我不知道哦！！</h1>')
                        });
                }, function(msg) {
                    res.redirect('/tasker/WB/forward');
                })
            });
    }, function(err) {
        res.end('提交表单失败： ',err); //各种错误
    });
});

router.get('/WB/read', function (req, res) {
    var obj = {
        type: 'WBread'
    };
    if(req.query.account) {
        obj.address = new RegExp(req.query.account);
    }
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            obj.userId = user._id;
            Order.open().findPages(obj, (req.query.page ? req.query.page : 1))
                .then(function(obj) {
                    res.render('taskerWBread', {
                        title: '微博阅读',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages,
                        path: '/tasker/WB/read'
                    })
                })
        });
});

router.get('/WB/read/add', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Product.open().findOne({type: 'WBread'})
                .then(function(result) {
                    var fans = Product.wrapToInstance(result);
                    var fansPrice = fans.getPriceByUser(user);
                    Order.getRandomStr(req).then(function(orderFlag) {
                        res.render('taskerWBreadAdd', {
                            title: '添加微博阅读任务',
                            user: user,
                            fansPrice: fansPrice,
                            orderFlag: orderFlag
                        })
                    })
                });
        });
});

router.post('/WB/read/add', function (req, res) {
    Order.getOrder(req).then(function (order) {
        User.open().findById(req.session.passport.user)
            .then(function (user) {
                var orderIns = Order.wrapToInstance(order);
                orderIns.checkRandomStr(req).then(function() {
                    orderIns.createOne(user, {type: 'WBread'})
                        .then(function () {
                            if(global.orderCheckIsOpen == 'yes'){
                                socketIO.emit('updateNav', {checkOrder: 1});
                            }
                            res.redirect('/tasker/WB/read');
                        }, function() {
                            res.send('<h1>您的余额不足，请充值！ 顺便多说一句，请不要跳过页面非法提交数据。。。不要以为我不知道哦！！</h1>')
                        });
                }, function(msg) {
                    res.redirect('/tasker/WB/read');
                })
            });
    }, function(err) {
        res.end('提交表单失败： ',err); //各种错误
    });
});

router.get('/WB/comment', function (req, res) {
    var obj = {
        type: 'WBcomment'
    };
    if(req.query.account) {
        obj.address = new RegExp(req.query.account);
    }
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            obj.userId = user._id;
            Order.open().findPages(obj, (req.query.page ? req.query.page : 1))
                .then(function(obj) {
                    res.render('taskerWBcomment', {
                        title: '微博评论',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages,
                        path: '/tasker/WB/comment'
                    })
                })
        });
});

router.get('/WB/comment/add', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Product.open().findOne({type: 'WBcomment'})
                .then(function(result) {
                    var fans = Product.wrapToInstance(result);
                    var fansPrice = fans.getPriceByUser(user);
                    Order.getRandomStr(req).then(function(orderFlag) {
                        res.render('taskerWBcommentAdd', {
                            title: '添加微博评论任务',
                            user: user,
                            fansPrice: fansPrice,
                            orderFlag: orderFlag
                        })
                    })
                });
        });
});

router.post('/WB/comment/add', function (req, res) {
    Order.getOrder(req).then(function (order) {
        User.open().findById(req.session.passport.user)
            .then(function (user) {
                var orderIns = Order.wrapToInstance(order);
                orderIns.checkRandomStr(req).then(function() {
                    orderIns.createOne(user, {type: 'WBcomment'})
                        .then(function () {
                            if(global.orderCheckIsOpen == 'yes'){
                                socketIO.emit('updateNav', {checkOrder: 1});
                            }
                            res.redirect('/tasker/WB/comment');
                        }, function() {
                            res.send('<h1>您的余额不足，请充值！ 顺便多说一句，请不要跳过页面非法提交数据。。。不要以为我不知道哦！！</h1>')
                        });
                }, function(msg) {
                    res.redirect('/tasker/WB/comment');
                })
            });
    }, function(err) {
        res.end('提交表单失败： ',err); //各种错误
    });
});


router.get('/order/on/top', function (req, res) {
    if(/^[0-9]+.?[0-9]*$/.test(req.query.info)){
        var onTop = parseFloat(req.query.info);
        if(onTop >= 1) {
            User.open().findById(req.session.passport.user)
                .then(function (user) {
                    if(user.funds >= onTop) {
                        Order.open().findById(req.query.id).then(function(order) {
                            Order.open().updateById(order._id, {$set: {
                                onTop: order.onTop ? (order.onTop + onTop) : onTop
                            }}).then(function() {
                                User.open().updateById(user._id, {$set: {
                                    funds: (user.funds - onTop).toFixed(4)
                                }}).then(function() {
                                    User.open().findOne({username: 'admin'})
                                        .then(function (admin) {
                                            User.open().updateById(admin._id, {
                                                $set: {
                                                    funds:(parseFloat(admin.funds) + onTop).toFixed(4)
                                                }
                                            }).then(function() {
                                                res.redirect(req.query.path);
                                            })
                                        });
                                })
                            })
                        })
                    }else{
                        res.send('<h1>账户余额不足，请 </h1><a href="/user/recharge"> 充值 !</a>');
                    }
                });
        }else{
            res.send('<h1>置顶价格不能小于１！</h1>');
        }
    }else{
        res.send('<h1>请输入合法的置顶的价格！必须是正数！</h1>');
    }
});

router.get('/order/details', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Task.open().findPages({
                    orderId: req.query.orderId
                }, (req.query.page ? req.query.page : 1))
                .then(function (obj) {
                    res.render('taskerOrderDetails', {
                        title: '任务进度详情',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages,
                        msg: req.query.msg, //当发布任务者取消任务时，如果还有未审核任务存在，则显示此信息
                        witchPage: req.query.witchPage
                    })
                });
        });
});

router.get('/check', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Task.open().findPages({
                    userId: user._id,
                    taskStatus: '待审核'
                }, (req.query.page ? req.query.page : 1))
                .then(function (obj) {
                    res.render('taskerCheck', {
                        title: '人工平台 / 待验收任务',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages,
                        path: '/tasker/check'
                    })
                });
        });
});

router.get('/check/success', function (req, res) {
    Task.open().findById(req.query.taskId).then(function(task) {
        var taskIns = Task.wrapToInstance(task);
        taskIns.success().then(function() {
            res.redirect('/tasker/check');
        })
    })
});

router.get('/check/complaints', function (req, res) {
    var info = req.query;
    Task.open().findById(info.taskId).then(function(task) {
        Task.open().updateById(task._id, {
            $set: {
                taskStatus: '被投诉',
                complaintsInfo: info.info,
                complaintsTime: moment().format('YYYY-MM-DD HH:mm:ss')
            }
        }).then(function () {
            socketIO.emit('updateNav', {complaintTask: 1});
            socketIO.emit('navUpdateNum', {'complaints': 1, 'orderUser': task.taskUser});
            res.redirect('/tasker/check');
        });
    })

});

router.get('/complaint', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Task.open().findPages({
                    userId: user._id,
                    taskStatus: {$in: ['被投诉', '投诉成立', '投诉不成立']}
                }, (req.query.page ? req.query.page : 1))
                .then(function (obj) {
                    res.render('taskerComplaints', {
                        title: '我投诉的任务',
                        user: user,
                        orders: obj.results,
                        pages: obj.pages
                    })
                });
        });
});

router.get('/order/pause', function (req, res) {
    Order.open().updateById(req.query.id, {$set: {
        status: '已暂停'
    }}).then(function() {
        res.redirect(req.query.path);
    })
});

router.get('/order/start', function (req, res) {
    Order.open().updateById(req.query.id, {$set: {
        status: '已发布'
    }}).then(function() {
        res.redirect(req.query.path);
    })
});

router.get('/order/refund', function (req, res) {
    Task.open().find({
        orderId: req.query.id,
        taskStatus: {$in: ['待审核', '被投诉']}
    }).then(function(tasks) {
        if(tasks.length > 0) {
            res.redirect('/tasker/order/details?orderId=' + req.query.id + encodeURI('&msg=存在待审核或被投诉未处理任务，不能取消当前发布的任务！'));
        }else {
            Order.open().findById(req.query.id).then(function(order) {
                Order.open().updateById(order._id, {$set: {
                    status: '已退款',
                    surplus: 0
                }}).then(function() {
                    User.open().findById(order.userId).then(function(user) {
                        User.open().updateById(user._id, {$set: {
                            funds: (parseFloat(user.funds) + parseFloat(order.surplus)).toFixed(4),
                            freezeFunds: (parseFloat(user.freezeFunds) - parseFloat(order.surplus)).toFixed(4)
                        }}).then(function() {
                            Consume.open().insert({
                                orderId: order._id,
                                type: order.type,
                                typeName: order.typeName,
                                userName: order.user,
                                userId: order.userId,
                                createTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                                price: +order.surplus,
                                description: order.typeName + '取消执行' + (order.num - order.taskNum)
                            }).then(function () {
                                res.redirect(req.query.path);
                            });
                        })
                    })
                })
            })
        }
    })
});

router.get('/look', function (req, res) {
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            res.render('taskerLook', {
                title: '发布必看',
                user: user
            });
        }, function (error) {
            res.send('获取用户详细信息失败： ' + error);
        });
});


module.exports = router;