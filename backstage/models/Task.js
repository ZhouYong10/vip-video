/**
 * Created by ubuntu64 on 5/31/16.
 */
var db = require('../dbWrap');
var Class = require('./Class');
var Order = require('./Order');
var User = require('./User');
var Profit = require('./Profit');
var moment = require('moment');


var Task = new Class();

Task.extend(db);
Task.extend({
    getRandomStr: function(req) {
        return new Promise(function(resolve, reject) {
            var str = Math.random().toString(36).substr(2);
            req.session.orderFlag = str;
            resolve(str);
        })
    },
    checkRandomStr: function(req, info) {
        return new Promise(function(resolve, reject) {
            if(info.orderFlag == req.session.orderFlag) {
                req.session.orderFlag = '';
                resolve();
            }else {
                reject('订单已经提交了，请勿重复提交！');
            }
        })
    },
    getTaskFreezeFunds: function() {
        return new Promise(function(resolve, reject) {
            Task.open().find({
                taskStatus: {$in: ['待审核', '被投诉']}
            }).then(function(tasks) {
                var count = 0;
                tasks.forEach(function (task) {
                    count += parseFloat(task.releasePrice);
                });
                resolve(count.toFixed(4));
            })
        })
    },
    createTask: function(info) {
        return new Promise(function(resolve, reject) {
            User.open().findById(info.userId)
                .then(function (user) {
                    Order.open().findOne({
                        _id: db.toObjectID(info.orderId),
                        status: '已发布'
                    }).then(function(order) {
                        if(order) {
                            var flag = true;
                            for(var i = 0; i < order.taskUsers.length; i++) {
                                var taskUser = order.taskUsers[i];
                                if ((taskUser + '') == (user._id + '')) {
                                    flag = false;
                                    break;
                                }
                            }
                            if(flag) {
                                order.orderId = order._id + '';
                                delete order._id;
                                order.taskAccount = user.taskAccount;
                                order.taskName = user.taskName;
                                order.taskUserId = user._id;
                                order.taskUser = user.username;
                                order.taskPhoto = info.taskPhoto;
                                order.taskCreateTime = moment().format('YYYY-MM-DD HH:mm:ss');
                                order.taskStatus = '待审核';
                                order.taskUserParentId = user.parentID;
                                profitFreezeFunds(order).then(function() {
                                    Task.open().insert(order).then(function(tasks) {
                                        var updateInfo = {
                                            $set: {surplus: (parseFloat(order.surplus) -
                                            (parseFloat(order.price) + parseFloat(order.price2 ? order.price2 : 0))).toFixed(4)},
                                            $inc: {taskNum: 1},
                                            $push: {taskUsers: user._id}
                                        };
                                        if((order.num - (order.taskNum ? order.taskNum : 0)) == 1) {
                                            updateInfo.$set.status = '已完成';
                                        }
                                        Order.open().updateById(info.orderId, updateInfo)
                                            .then(function() {
                                                resolve(tasks[0]);
                                            })
                                    })
                                })
                            }else{
                                reject('您已经做过该任务了，不要以为我不知道哦！！！');
                            }
                        }else {
                            reject('不好意思，任务已经结束了，下次动作要快点哦！');
                        }
                    })
                });
        })
    }
});

function profitFreezeFunds(task) {
    return new Promise(function (done) {
        User.open().findOne({username: 'admin'})
            .then(function (admin) {
                var adminFreezeFunds = admin.freezeFunds;
                var price;

                handerParent().then(function () {
                    handerSelf().then(function () {
                        taskerParent().then(function () {
                            taskerSelf().then(function () {
                                adminSelf().then(function () {
                                    done();
                                });
                            });
                        });
                    });
                });

                //做任务者的父级
                function handerParent() {
                    return new Promise(function (resolve) {
                        if (task.taskUserParentId) {
                            price = task.handerChildPrice;

                            User.open().findById(task.taskUserParentId)
                                .then(function (taskUserParent) {
                                    if (taskUserParent && taskUserParent.role != 'admin') {
                                        User.open().updateById(taskUserParent._id, {
                                            $set: {
                                                freezeFunds: (parseFloat(taskUserParent.freezeFunds) +
                                                parseFloat(task.handerParentProfit)).toFixed(4)
                                            }
                                        }).then(function() {
                                            resolve();
                                        })
                                    } else {
                                        adminFreezeFunds = (parseFloat(adminFreezeFunds) +
                                        parseFloat(task.handerParentProfit)).toFixed(4);
                                        resolve();
                                    }
                                });
                        } else {
                            price = task.handerParentPrice;
                            resolve();
                        }
                    });
                }

                //做任务者自己
                function handerSelf() {
                    return new Promise(function (resolve) {
                        User.open().findById(task.taskUserId)
                            .then(function (taskUser) {
                                if (taskUser) {
                                    User.open().updateById(taskUser._id, {
                                        $set: {
                                            freezeFunds: (parseFloat(taskUser.freezeFunds) + parseFloat(price)).toFixed(4)
                                        }
                                    }).then(function() {
                                        resolve();
                                    })
                                } else {
                                    adminFreezeFunds = (parseFloat(adminFreezeFunds) + parseFloat(price)).toFixed(4);
                                    resolve();
                                }
                            });
                    });
                }

                //发布任务者的父级
                function taskerParent() {
                    return new Promise(function (resolve) {
                        if(task.userParentId) {
                            User.open().findById(task.userParentId)
                                .then(function (orderUserParent) {
                                    if(orderUserParent && orderUserParent.role != 'admin') {
                                        User.open().updateById(orderUserParent._id, {
                                            $set: {
                                                freezeFunds: (parseFloat(orderUserParent.freezeFunds) +
                                                parseFloat(task.taskerParentProfit)).toFixed(4)
                                            }
                                        }).then(function() {
                                            resolve();
                                        })
                                    }else{
                                        adminFreezeFunds = (parseFloat(adminFreezeFunds) +
                                        parseFloat(task.taskerParentProfit)).toFixed(4);
                                        resolve();
                                    }
                                });
                        }else{
                            resolve();
                        }
                    });
                }

                //发布任务者自己
                function taskerSelf() {
                    return new Promise(function (resolve) {
                        User.open().findById(task.userId)
                            .then(function (orderUser) {
                                var taskPrice = (parseFloat(task.price) + parseFloat(task.price2 ? task.price2 : 0)).toFixed(4);
                                if(orderUser) {
                                    User.open().updateById(orderUser._id, {
                                        $set: {
                                            freezeFunds: parseFloat(orderUser.freezeFunds) > parseFloat(taskPrice) ?
                                                (parseFloat(orderUser.freezeFunds) - parseFloat(taskPrice)).toFixed(4) : 0
                                        }
                                    }).then(function() {
                                        resolve();
                                    })
                                }else{
                                    adminFreezeFunds = parseFloat(adminFreezeFunds) > parseFloat(taskPrice) ?
                                        (parseFloat(adminFreezeFunds) - parseFloat(taskPrice)).toFixed(4) : 0;
                                    resolve();
                                }
                            });
                    });
                }

                //平台管理员
                function adminSelf() {
                    return new Promise(function (resolve) {
                        adminFreezeFunds = (parseFloat(adminFreezeFunds) + parseFloat(task.taskerAdminProfit) +
                        parseFloat(task.handerAdminProfit)).toFixed(4);

                        User.open().updateById(admin._id, {
                            $set: {
                                freezeFunds: adminFreezeFunds
                            }
                        }).then(function() {
                            resolve();
                        })
                    });
                }
            });
    });
}

function profitFunds(task) {
    return new Promise(function(done) {
        User.open().findOne({username: 'admin'})
            .then(function (admin) {
                var adminFunds = admin.funds;
                var adminFreezeFunds = admin.freezeFunds;
                var price;

                handerParent().then(function () {
                    handerSelf().then(function () {
                        taskerParent().then(function () {
                            adminSelf().then(function () {
                                done();
                            });
                        });
                    });
                });

                //做任务者的父级
                function handerParent() {
                    return new Promise(function (resolve) {
                        if (task.taskUserParentId) {
                            price = task.handerChildPrice;
                            User.open().findById(task.taskUserParentId)
                                .then(function (taskUserParent) {
                                    if (taskUserParent && taskUserParent.role != 'admin') {
                                        User.open().updateById(taskUserParent._id, {
                                            $set: {
                                                freezeFunds: parseFloat(taskUserParent.freezeFunds) > parseFloat(task.handerParentProfit) ?
                                                    (parseFloat(taskUserParent.freezeFunds) - parseFloat(task.handerParentProfit)).toFixed(4) : 0,
                                                funds: (parseFloat(taskUserParent.funds) +
                                                parseFloat(task.handerParentProfit)).toFixed(4)
                                            }
                                        }).then(function () {
                                            Profit.open().insert({
                                                orderId: task.orderId,
                                                type: task.type,
                                                typeName: task.typeName,
                                                title: task.title,
                                                createTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                                                taskId: task._id,
                                                username: taskUserParent.username,
                                                userId: taskUserParent._id,
                                                childName: task.taskUser,
                                                childId: task.taskUserId,
                                                price: +task.handerParentProfit
                                            }).then(function () {
                                                resolve();
                                            });
                                        })
                                    } else {
                                        adminFunds = (parseFloat(adminFunds) +
                                        parseFloat(task.handerParentProfit)).toFixed(4);
                                        adminFreezeFunds = parseFloat(adminFreezeFunds) > parseFloat(task.handerParentProfit) ?
                                            (parseFloat(adminFreezeFunds) - parseFloat(task.handerParentProfit)).toFixed(4) : 0;
                                        resolve();
                                    }
                                });
                        } else {
                            price = task.handerParentPrice;
                            resolve();
                        }
                    });
                }

                //做任务者自己
                function handerSelf() {
                    return new Promise(function (resolve) {
                        User.open().findById(task.taskUserId)
                            .then(function (taskUser) {
                                if (taskUser) {
                                    User.open().updateById(taskUser._id, {
                                        $set: {
                                            freezeFunds: parseFloat(taskUser.freezeFunds) > parseFloat(price) ?
                                                (parseFloat(taskUser.freezeFunds) - parseFloat(price)).toFixed(4) : 0,
                                            funds: (parseFloat(taskUser.funds) + parseFloat(price)).toFixed(4)
                                        }
                                    }).then(function() {
                                        resolve();
                                    })
                                } else {
                                    adminFunds = (parseFloat(adminFunds) + parseFloat(price)).toFixed(4);
                                    adminFreezeFunds = parseFloat(adminFreezeFunds) > parseFloat(price) ?
                                        (parseFloat(adminFreezeFunds) - parseFloat(price)).toFixed(4) : 0;
                                    resolve();
                                }
                            });
                    });
                }

                //发布任务者的父级
                function taskerParent() {
                    return new Promise(function(resolve) {
                        if(task.userParentId) {
                            User.open().findById(task.userParentId)
                                .then(function (orderUserParent) {
                                    if(orderUserParent && orderUserParent.role != 'admin') {
                                        User.open().updateById(orderUserParent._id, {
                                            $set: {
                                                freezeFunds: parseFloat(orderUserParent.freezeFunds) > parseFloat(task.taskerParentProfit) ?
                                                    (parseFloat(orderUserParent.freezeFunds) - parseFloat(task.taskerParentProfit)).toFixed(4) : 0,
                                                funds: (parseFloat(orderUserParent.funds) +
                                                parseFloat(task.taskerParentProfit)).toFixed(4)
                                            }
                                        }).then(function () {
                                            Profit.open().insert({
                                                orderId: task.orderId,
                                                type: task.type,
                                                typeName: task.typeName,
                                                title: task.title,
                                                createTime: moment().format('YYYY-MM-DD HH:mm:ss'),
                                                taskId: task._id,
                                                username: orderUserParent.username,
                                                userId: orderUserParent._id,
                                                childName: task.user,
                                                childId: task.userId,
                                                price: +task.taskerParentProfit
                                            }).then(function () {
                                                resolve();
                                            });
                                        });
                                    }else{
                                        adminFunds = (parseFloat(adminFunds) + parseFloat(task.taskerParentProfit)).toFixed(4);
                                        adminFreezeFunds = parseFloat(adminFreezeFunds) > parseFloat(task.taskerParentProfit) ?
                                            (parseFloat(adminFreezeFunds) - parseFloat(task.taskerParentProfit)).toFixed(4) : 0;
                                        resolve();
                                    }
                                });
                        }else{
                            resolve();
                        }
                    })
                }

                //发布任务者自己不需要操作
                //平台管理员
                function adminSelf() {
                    return new Promise(function (resolve) {
                        var adminProfit = (parseFloat(task.taskerAdminProfit) + parseFloat(task.handerAdminProfit)).toFixed(4);
                        adminFunds = (parseFloat(adminFunds) + parseFloat(adminProfit)).toFixed(4);
                        adminFreezeFunds = parseFloat(adminFreezeFunds) > parseFloat(adminProfit) ?
                            (parseFloat(adminFreezeFunds) - parseFloat(adminProfit)).toFixed(4) : 0;
                        User.open().updateById(admin._id, {
                            $set: {
                                funds: adminFunds,
                                freezeFunds: adminFreezeFunds
                            }
                        }).then(function () {
                            resolve();
                        });
                    });
                }
            });
    })
}

function refuseProfitFreezeFunds(task) {
    return new Promise(function (done) {
        User.open().findOne({username: 'admin'})
            .then(function (admin) {
                var adminFreezeFunds = admin.freezeFunds;
                var price;

                handerParent().then(function () {
                    handerSelf().then(function () {
                        taskerParent().then(function () {
                            taskerSelf().then(function () {
                                adminSelf().then(function () {
                                    done();
                                });
                            });
                        });
                    });
                });

                //做任务者的父级
                function handerParent() {
                    return new Promise(function (resolve) {
                        if (task.taskUserParentId) {
                            price = task.handerChildPrice;
                            User.open().findById(task.taskUserParentId)
                                .then(function (taskUserParent) {
                                    if (taskUserParent && taskUserParent.role != 'admin') {
                                        User.open().updateById(taskUserParent._id, {
                                            $set: {
                                                freezeFunds: parseFloat(taskUserParent.freezeFunds) > parseFloat(task.handerParentProfit) ?
                                                    (parseFloat(taskUserParent.freezeFunds) - parseFloat(task.handerParentProfit)).toFixed(4) : 0
                                            }
                                        }).then(function() {
                                            resolve();
                                        })
                                    } else {
                                        adminFreezeFunds = parseFloat(adminFreezeFunds) > parseFloat(task.handerParentProfit) ?
                                            (parseFloat(adminFreezeFunds) - parseFloat(task.handerParentProfit)).toFixed(4) : 0;
                                        resolve();
                                    }
                                });
                        } else {
                            price = task.handerParentPrice;
                            resolve();
                        }
                    });
                }

                //做任务者自己
                function handerSelf() {
                    return new Promise(function (resolve) {
                        User.open().findById(task.taskUserId)
                            .then(function (taskUser) {
                                if (taskUser) {
                                    User.open().updateById(taskUser._id, {
                                        $set: {
                                            freezeFunds: parseFloat(taskUser.freezeFunds) > parseFloat(price) ?
                                                (parseFloat(taskUser.freezeFunds) - parseFloat(price)).toFixed(4) : 0
                                        }
                                    }).then(function() {
                                        resolve();
                                    })
                                } else {
                                    adminFreezeFunds = parseFloat(adminFreezeFunds) > parseFloat(price) ?
                                        (parseFloat(adminFreezeFunds) - parseFloat(price)).toFixed(4) : 0;
                                    resolve();
                                }
                            });
                    });
                }

                //发布任务者的父级
                function taskerParent() {
                    return new Promise(function (resolve) {
                        if(task.userParentId) {
                            User.open().findById(task.userParentId)
                                .then(function (orderUserParent) {
                                    if(orderUserParent && orderUserParent.role != 'admin') {
                                        User.open().updateById(orderUserParent._id, {
                                            $set: {
                                                freezeFunds: parseFloat(orderUserParent.freezeFunds) > parseFloat(task.taskerParentProfit) ?
                                                    (parseFloat(orderUserParent.freezeFunds) - parseFloat(task.taskerParentProfit)).toFixed(4) : 0
                                            }
                                        }).then(function() {
                                            resolve();
                                        })
                                    }else{
                                        adminFreezeFunds = parseFloat(adminFreezeFunds) > parseFloat(task.taskerParentProfit) ?
                                            (parseFloat(adminFreezeFunds) - parseFloat(task.taskerParentProfit)).toFixed(4) : 0;
                                        resolve();
                                    }
                                });
                        }else{
                            resolve();
                        }
                    });
                }

                //发布任务者自己
                function taskerSelf() {
                    return new Promise(function (resolve) {
                        User.open().findById(task.userId)
                            .then(function (orderUser) {
                                if(orderUser) {
                                    User.open().updateById(orderUser._id, {
                                        $set: {
                                            freezeFunds: (parseFloat(orderUser.freezeFunds) +
                                            (parseFloat(task.price) + parseFloat(task.price2 ? task.price2 : 0))).toFixed(4)
                                        }
                                    }).then(function() {
                                        resolve();
                                    })
                                }else{
                                    adminFreezeFunds = (parseFloat(adminFreezeFunds) +
                                    (parseFloat(task.price) + parseFloat(task.price2 ? task.price2 : 0))).toFixed(4);
                                    resolve();
                                }
                            });
                    });
                }

                //平台管理员
                function adminSelf() {
                    return new Promise(function (resolve) {
                        var adminProfit = (parseFloat(task.taskerAdminProfit) + parseFloat(task.handerAdminProfit)).toFixed(4);
                        adminFreezeFunds = parseFloat(adminFreezeFunds) > parseFloat(adminProfit) ?
                            (parseFloat(adminFreezeFunds) - parseFloat(adminProfit)).toFixed(4) : 0;
                        User.open().updateById(admin._id, {
                            $set: {
                                freezeFunds: adminFreezeFunds
                            }
                        }).then(function() {
                            resolve();
                        })
                    });
                }
            });
    });
}

Task.open = function() {
    return Task.openCollection('Task');
};

Task.include({
    refuse: function() {
        var self = this;
        return new Promise(function(resolve) {
            refuseProfitFreezeFunds(self).then(function() {
                Task.open().updateById(self._id, {
                    $set: {
                        taskStatus: '投诉成立'
                    }
                }).then(function () {
                    Order.open().findById(self.orderId).then(function(order) {
                        Order.open().updateById(self.orderId, {
                            $set: {
                                status: '已发布',
                                surplus: (parseFloat(order.surplus) +
                                (parseFloat(order.price) + parseFloat(order.price2 ? order.price2 : 0))).toFixed(4)
                            },
                            $inc: {taskNum: -1},
                            $pull: {taskUsers: self.taskUserId}
                        }).then(function () {
                            resolve();
                        });
                    })
                });
            })
        })
    },
    success: function() {
        var self = this;
        return new Promise(function (resolve, reject) {
            profitFunds(self).then(function () {
                Task.open().updateById(self._id, {
                    $set: {
                        taskStatus: '完成',
                        successTime: moment().format('YYYY-MM-DD HH:mm:ss')
                    }
                }).then(function() {
                    resolve();
                })
            });
        });
    }
});

(function() {
    setInterval(function() {
        console.log(moment().format('YYYY-MM-DD HH:mm:ss') + ': 扫描了一次人工任务审核。');
        Task.open().find({
            taskStatus: '待审核'
        }).then(function(tasks) {
            followedByPayment(tasks);
        })
    }, 1000 * 60 * 60);
})();

function followedByPayment(tasks) {
    if(tasks.length > 0) {
        var task = tasks.shift();
        var taskCreateTime = task._id.getTimestamp();
        var timeNow = new Date().getTime();
        if((timeNow - taskCreateTime) > 1000 * 60 * 60 * 12) {
            var taskIns = Task.wrapToInstance(task);
            taskIns.success().then(function () {
                console.log(moment().format('YYYY-MM-DD HH:mm:ss') + ': 自动审核通过了任务' + task._id);
                followedByPayment(tasks);
            });
        }else{
            console.log('没有过期的审核任务，继续循环下一个任务。---------------------------------');
            followedByPayment(tasks);
        }
    }
}

module.exports = Task;