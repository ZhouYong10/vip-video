/**
 * Created by zhouyong10 on 2/3/16.
 */
var db = require('../dbWrap');
var User = require('./User');
var Product = require('./Product');
var Profit = require('./Profit');
var Consume = require('./Consume');
var Address = require('./Address');
var request = require('request');
var cheerio = require('cheerio');

var Class = require('./Class');

//var bcrypt = require('bcryptjs');
var moment = require('moment');

var Formidable = require('formidable');
var images = require('images');
var fs = require('fs');
var path = require('path');


var Order = new Class();


Order.extend(db);

Order.open = function() {
    return Order.openCollection('Order');
};


global.readSpeed = 1;
Order.extend({
    getRandomStr: function(req) {
        return new Promise(function(resolve, reject) {
            var str = Math.random().toString(36).substr(2);
            req.session.orderFlag = str;
            resolve(str);
        })
    },
    getOrderFreezeFunds: function() {
        return new Promise(function(resolve, reject) {
            Order.open().find({
                status: {$in: ['审核中', '已发布', '已暂停']}
            }).then(function(orders) {
                var count = 0;
                orders.forEach(function (order) {
                    count += parseFloat(order.surplus);
                });
                resolve(count.toFixed(4));
            })
        })
    },
    mkdirsSync: function(dirname) {
        if (fs.existsSync(dirname)) {
            return true;
        } else {
            if (Order.mkdirsSync(path.dirname(dirname))) {
                fs.mkdirSync(dirname);
                return true;
            }
        }
    },
    getOrder: function getOrder(req) {
        var picField;
        return new Promise(function(resolve, reject) {
            var order = {};
            var form = new Formidable.IncomingForm();
            form.maxFieldsSize = 1024 * 1024;
            form.encoding = 'utf-8';
            form.keepExtensions = true;
            form.hash = 'md5';
            var logoDir = form.uploadDir = global.handleExam + moment().format('YYYY-MM-DD') + '/';

            Order.mkdirsSync(logoDir);
            form.on('error', function(err) {
                reject(err);
            }).on('field', function(field, value) {
                order[field] = value;
            }).on('file', function(field, file) { //上传文件
                picField = field;
                var filePath = file.path;
                var fileExt = filePath.substring(filePath.lastIndexOf('.'));
                var newFileName = new Date().getTime() + '-' + file.hash + fileExt;
                var newFilePath = path.join(logoDir + newFileName);
                try{
                    fs.renameSync(filePath, newFilePath);
                    order[picField] = '/handle_example/' + moment().format('YYYY-MM-DD') + '/' + newFileName;
                }catch (e){
                    console.log('图片上传失败： ' + e);
                    reject('图片上传失败!');
                }
            }).on('end', function() {
                resolve(order);
            });
            form.parse(req);
        })
    },
    addSchedule: function(orders, speedNum) {
        for(var i in orders) {
            var order = orders[i];
            if(order.status == '已处理'){
                var dealTime = order.dealTime, num = (order.type == 'flow' ? order.realNum : order.num),
                    delay = 3 * 60 * 1000, speed = order.speed ? order.speed : speedNum;
                if(order.smallType == 'read'){
                    speed = global.readSpeed;
                }

                var allTimes = (parseInt(num / speed) + ((num % speed == 0) ? 0 : 1)) * 60 * 1000;
                var currentTimes = new Date().getTime() - new Date(dealTime).getTime() - delay;

                if(currentTimes > 0) {
                    var percent = (currentTimes / allTimes).toFixed(4);
                    if(percent < 1) {
                        percent = (percent * 100).toFixed(2) + '%';
                        order.status = '执行中';
                    }else {
                        percent = '100%';
                        order.status = '已完成';
                    }
                    order.schedule = percent;
                }else {
                    order.status = '未处理';
                }
            }
        }
        return orders;
    }
});

Order.include({
    checkRandomStr: function(req) {
        var self = this;
        return new Promise(function(resolve, reject) {
            if(self.orderFlag == req.session.orderFlag) {
                req.session.orderFlag = '';
                resolve();
            }else {
                console.log('订单已经提交了，请勿重复提交！');
                reject();
            }
        })
    },
    save: function(user) {
        var self = this;
        var sourcePath = path.join(global.handleExam, '../' + self.photo);
        var waterPath = path.join(global.handleExam, '../static/images/waterImg.jpg');
        var sourceImg = images(sourcePath);
        var waterImg = images(waterPath);
        waterImg.resize(sourceImg.width() / 5 * 2);
        images(sourceImg)
            .draw(waterImg, sourceImg.width() - waterImg.width() -20, sourceImg.height() -waterImg.height() - 20)
            .save(sourcePath);
        return new Promise(function (resolve) {
            Order.open().insert(self)
                .then(function (results) {
                    var order = results[0];
                    User.open().updateById(user._id, {
                        $set: {
                            funds: (parseFloat(user.funds) - parseFloat(order.totalPrice)).toFixed(4),
                            freezeFunds: (parseFloat(user.freezeFunds) + parseFloat(order.totalPrice)).toFixed(4)
                        }
                    }).then(function () {
                        Consume.open().insert({
                            orderId: order._id,
                            type: order.type,
                            typeName: order.typeName,
                            userName: order.user,
                            userId: order.userId,
                            createTime: order.createTime,
                            price: -order.totalPrice,
                            description: order.description
                        }).then(function () {
                            resolve(self);
                        });
                    });
                });
        });
    },
    createOne: function(user, info) {
        var self = this;
        return new Promise(function(resolve, reject) {
            Product.open().findOne(info)
                .then(function(result) {
                    var product = Product.wrapToInstance(result);
                    //设定发布者提交的价格不能低于平台控制价格，并验证发布者有足够的金额发布任务
                    var myPrice = product.getPriceByUser(user);
                    if(!self.price || parseFloat(self.price) < parseFloat(myPrice)) {
                        self.price = myPrice;
                    }
                    self.taskerPrice = parseFloat(self.price);
                    self.totalPrice = (self.price * self.num).toFixed(4);
                    if((self.totalPrice - user.funds) > 0) {
                        return reject();
                    }

                    if(user.parent) {
                        //计算发布者给上级的返利
                        var taskerProfit = parseFloat(product.childPrice - product.superPrice);
                        self.taskerParentProfit = taskerProfit.toFixed(4);
                    }
                    //计算发布者给平台的返利
                    var adminProfit = parseFloat(product.superPrice - product.adminPrice);
                    self.taskerAdminProfit = adminProfit.toFixed(4);

                    //计算得到发布方返利后的价格
                    var releasePrice = parseFloat(self.price - adminProfit -
                            (taskerProfit ? taskerProfit : 0));
                    self.taskerReleasePrice = releasePrice.toFixed(4);

                    //计算做任务者为子级的价格
                    var childPrice = parseFloat(releasePrice * product.childPer);
                    self.handerChildPrice = childPrice.toFixed(4);
                    //计算做任务者为父级的价格
                    var superPrice = parseFloat(releasePrice * product.superPer);
                    self.handerParentPrice = superPrice.toFixed(4);
                    //计算做任务者给父级的返利
                    var superProfit = parseFloat(releasePrice * (product.superPer - product.childPer));
                    self.handerParentProfit = superProfit.toFixed(4);
                    //计算做任务者给平台的返利
                    var handerAdminProfit = parseFloat(releasePrice * (product.adminPer - product.superPer));
                    self.handerAdminProfit = handerAdminProfit.toFixed(4);
                    //给订单添加关联用户信息
                    self.surplus = self.totalPrice;  //任务结余金额
                    self.user = user.username;
                    self.userId = user._id;
                    self.userParent = user.parent;
                    self.userParentId = user.parentID;
                    self.name = product.name;
                    self.type = product.type;
                    self.typeName = product.typeName;
                    self.status = global.orderCheckIsOpen == 'yes' ?  '审核中' : '已发布';
                    self.createTime = moment().format('YYYY-MM-DD HH:mm:ss');
                    self.description = self.typeName + '执行' + self.num;
                    self.taskNum = 0;
                    self.taskUsers = [];

                    self.save(user).then(function(order) {
                        resolve(order);
                    })
                });
        });
    },
    createTwo: function(user, info1, info2) {
        var self = this;
        return new Promise(function(resolve, reject) {
            Product.open().findOne(info1)
                .then(function(result1) {
                    var product1 = Product.wrapToInstance(result1);
                    Product.open().findOne(info2)
                        .then(function (result2) {
                            var product2 = Product.wrapToInstance(result2);
                            //设定发布者提交的价格不能低于平台控制价格，并验证发布者有足够的金额发布任务
                            var myPrice1 = product1.getPriceByUser(user);
                            var myPrice2 = product2.getPriceByUser(user);
                            if(!self.price || parseFloat(self.price) < parseFloat(myPrice1)) {
                                self.price = myPrice1;
                            }
                            if(!self.price2 || parseFloat(self.price2) < parseFloat(myPrice2)) {
                                self.price2 = myPrice2;
                            }
                            self.taskerPrice = parseFloat(self.price) + parseFloat(self.price2);
                            self.totalPrice = (self.taskerPrice * self.num).toFixed(4);
                            if ((self.totalPrice - user.funds) > 0) {
                                return reject();
                            }

                            if(user.parent) {
                                self.userParent = user.parent;
                                self.userParentId = user.parentID;
                                //计算发布者给上级的返利
                                var taskerProfit = parseFloat(product1.childPrice - product1.superPrice),
                                    taskerProfit2 = parseFloat(product2.childPrice - product2.superPrice);
                                self.taskerParentProfit = (taskerProfit + taskerProfit2).toFixed(4);
                            }
                            //计算发布者给平台的返利
                            var adminProfit = parseFloat(product1.superPrice - product1.adminPrice),
                                adminProfit2 = parseFloat(product2.superPrice - product2.adminPrice);
                            self.taskerAdminProfit = (adminProfit + adminProfit2).toFixed(4);

                            //计算得到发布方返利后的价格
                            var releasePrice = parseFloat(self.price - adminProfit -
                                (taskerProfit ? taskerProfit : 0)),
                                releasePrice2 = parseFloat(self.price2 - adminProfit2 -
                                (taskerProfit2 ? taskerProfit2 : 0));
                            self.taskerReleasePrice = (releasePrice + releasePrice2).toFixed(4);

                            //计算做任务者为子级的价格
                            var childPrice = parseFloat(releasePrice * product1.childPer),
                                childPrice2 = parseFloat(releasePrice2 * product2.childPer);
                            self.handerChildPrice = (childPrice + childPrice2).toFixed(4);
                            //计算做任务者为父级的价格
                            var superPrice = parseFloat(releasePrice * product1.superPer),
                                superPrice2 = parseFloat(releasePrice2 * product2.superPer);
                            self.handerParentPrice = (superPrice + superPrice2).toFixed(4);
                            //计算做任务者给父级的返利
                            var superProfit = parseFloat(releasePrice * (product1.superPer - product1.childPer)),
                                superProfit2 = parseFloat(releasePrice2 * (product2.superPer - product2.childPer));
                            self.handerParentProfit = (superProfit + superProfit2).toFixed(4);
                            //计算做任务者给平台的返利
                            var handerAdminProfit = parseFloat(releasePrice * (product1.adminPer - product1.superPer)),
                                handerAdminProfit2 = parseFloat(releasePrice2 * (product2.adminPer - product2.superPer));
                            self.handerAdminProfit = (handerAdminProfit + handerAdminProfit2).toFixed(4);
                            //给订单添加关联用户信息
                            self.surplus = self.totalPrice; //任务结余金额
                            self.user = user.username;
                            self.userId = user._id;
                            self.name = product1.name;
                            self.type = product1.type;
                            self.typeName = product1.typeName;
                            self.status = global.orderCheckIsOpen == 'yes' ?  '审核中' : '已发布';
                            self.createTime = moment().format('YYYY-MM-DD HH:mm:ss');
                            self.description = self.typeName + '执行' + self.num + '; ' +
                                product2.typeName + '执行' + self.num;
                            self.taskNum = 0;
                            self.taskUsers = [];

                            self.save(user).then(function(order) {
                                resolve(order);
                            })
                        });
                });
        });
    },
    profitToParent: function() {
        var self = this;
        User.open().updateById(self.taskUserParentId,{$set: {

        }})
    },
    handleRelease: function() {
        var self = this;

        var sourcePath = path.join(global.handleExam, '../' + self.photo);
        var waterPath = path.join(global.handleExam, '../static/images/waterImg.jpg');
        var sourceImg = images(sourcePath);
        var waterImg = images(waterPath);
        waterImg.resize(sourceImg.width() / 5 * 2);
        images(sourceImg)
            .draw(waterImg, sourceImg.width() - waterImg.width() -20, sourceImg.height() -waterImg.height() - 20)
            .save(sourcePath);
        return new Promise(function(resolve, reject) {
            Order.open().updateById(self._id, {
                $set: {
                    status: '已发布',
                    releaseTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                    taskNum: 0,
                    taskUsers: []
                }
            }).then(function() {
                resolve();
            })
        })
    },
    complete: function(callback) {
        var self = this;
        User.open().findById(self.userId)
            .then(function(user) {
                self.profitToParent(user, user, function(order) {
                    if(self.remote){
                        Order.open().updateById(self._id, {
                            $set: {
                                startReadNum: self.startReadNum,
                                remote: self.remote,
                                status: '已处理',
                                dealTime:  moment().format('YYYY-MM-DD HH:mm:ss')
                            }
                        }).then(function () {
                            callback();
                        });
                    }else {
                        Order.open().updateById(self._id, {
                            $set: {
                                startReadNum: self.startReadNum,
                                status: '已处理',
                                dealTime:  moment().format('YYYY-MM-DD HH:mm:ss')
                            }
                        }).then(function () {
                            callback();
                        });
                    }
                });
            })
    },
    refund: function(info, callback) {
        var self = this;
        self.status = '已退款';
        self.error = '已处理';
        self.surplus = 0;
        self.refundInfo = info;
        Order.open().updateById(self._id, self)
            .then(function () {
                User.open().findById(self.userId)
                    .then(function (user) {
                        User.open().updateById(user._id, {$set: {
                            funds: (parseFloat(user.funds) + parseFloat(self.totalPrice)).toFixed(4),
                            freezeFunds: (parseFloat(user.freezeFunds) - parseFloat(self.totalPrice)).toFixed(4)
                        }}).then(function () {
                                callback();
                            });
                    });
            });
    },
    refundProfit: function(info, callback) {
        var self = this;
        self.refund(info, function() {
            Profit.open().find({orderId: self._id})
                .then(function(profits) {
                    profits.forEach(function(profit) {
                        User.open().findById(profit.userId)
                            .then(function(user) {
                                user.funds = (parseFloat(user.funds) - parseFloat(profit.profit)).toFixed(4);
                                User.open().updateById(user._id, {$set: {funds: user.funds}})
                                    .then(function() {
                                        Profit.open().updateById(profit._id, {$set: {status: 'refund'}});
                                    })
                            })
                    });
                    callback();
                })
        })
    },
    orderError: function(info, callback) {
        Order.open().updateById(this._id, {
            $set: {
                error: '未处理',
                errorInfo: info,
                errorTime: moment().format('YYYY-MM-DD HH:mm:ss')
            }
        }).then(function() {
            callback();
        })
    },
    dealError: function(info, callback) {
        Order.open().updateById(this._id, {$set: {error: '已处理', errorDealInfo: info}})
            .then(function() {
                callback();
            })
    }
});

module.exports = Order;
