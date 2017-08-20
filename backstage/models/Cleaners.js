/**
 * Created by ubuntu64 on 5/5/16.
 */
var Schedule = require('node-schedule');
var Feedback = require('./Feedback');
var Order = require('./Order');
var Task = require('./Task');
var Profit = require('./Profit');
var Withdraw = require('./Withdraw');
var Consume = require('./Consume');

var fs = require('fs');

function getDateStr(AddDayCount) {
    var dd = new Date();
    dd.setDate(dd.getDate()+AddDayCount);//获取AddDayCount天后的日期
    var y = dd.getFullYear();
    var m = (dd.getMonth()+1)<10?"0"+(dd.getMonth()+1):(dd.getMonth()+1);//获取当前月份的日期，不足10补0
    var d = dd.getDate()<10?"0"+dd.getDate():dd.getDate();//获取当前几号，不足10补0
    return y+"-"+m+"-"+d;
}

function removePhoto(path) {
    var photoPath = global.handleExam + '..' + path;
    fs.unlink(photoPath);
}

function remove(model, date) {
    model.open().find().then(function(results) {
        for(var i = 0; i < results.length; i++){
            var result = results[i];
            var ts = result._id.getTimestamp();
            if(ts < date){
                model.open().remove(result);
            }
        }
    })
}

function removeOrder(model, date) {
    model.open().find({status: {$in: ['已退款', '已完成']}}).then(function (results) {
        for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var ts = result._id.getTimestamp();
            if (ts < date) {
                if(result.codePhoto) {
                    removePhoto(result.codePhoto);
                }
                if(result.photo) {
                    removePhoto(result.photo);
                }
                model.open().removeById(result._id).then(function() {
                    Task.open().find({orderId: result._id + ''})
                        .then(function (tasks) {
                            for (var j = 0; j < tasks.length; j++) {
                                var task = tasks[j];
                                if (task.taskPhoto) {
                                    removePhoto(task.taskPhoto);
                                }
                                Task.open().removeById(task._id);
                            }
                        });
                });
            }
        }
    });
}

module.exports = {
    test: function() {
        var older = Date.parse(getDateStr(+1));
        console.log('开始清理数据了 ===============================================');
        removeOrder(Order, older);
        remove(Consume, older);
        remove(Feedback, older);
        remove(Profit, older);
        remove(Withdraw, older);
    },
    seconds: function () {
        var rule = new Schedule.RecurrenceRule();
        var times = [];

        for (var i = 1; i < 60; i++) {
            times.push(i);
        }

        rule.second = times;
        var c = 0;
        var j = Schedule.scheduleJob(rule, function () {
            c++;
            console.log(c, '---------------------==============================');
            console.log(getDateStr(-30), '---------------------==============================');
            //var older = Date.parse(getDateStr(-30));
            //remove(Feedback, older);
            //remove(Order, older);
            //remove(Profit, older);
            //remove(Recharge, older);
            //remove(Withdraw, older);
        });
    },
    timeOfDay: function() {
        var rule = new Schedule.RecurrenceRule();
        rule.dayOfWeek = [0, new Schedule.Range(1, 6)];
        rule.hour = 3;
        rule.minute = 30;

        Schedule.scheduleJob(rule, function() {
            var older = Date.parse(getDateStr(-30));
            console.log('开始清理数据了 ===============================================');
            removeOrder(Order, older);
            remove(Consume, older);
            remove(Feedback, older);
            remove(Profit, older);
            remove(Withdraw, older);
        })
    }
};