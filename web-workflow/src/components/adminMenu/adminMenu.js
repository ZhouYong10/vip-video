/**
 * Created by ubuntu64 on 3/3/16.
 */
$(function () {
    $.get('/admin/update/header/nav', function (obj) {
        updateNav(obj);
    });

    var socket = io();
    socket.on('updateNav', function (obj) {
        console.log(obj, '======================');
        updateNav(obj, true);
    });
});

function updateNav(obj, isAdd) {
    for(var key in obj) {
        if(isAdd) {
            obj[key] = parseInt(obj[key]) + parseInt($('.updateNum.' + key).text());
        }
        if(obj[key] > 0) {
            $('.updateNum.' + key).text(obj[key]).css('display', 'inline');
        }else {
            $('.updateNum.' + key).css('display', 'none');
        }
    }

    var feedback = parseInt($('.updateNum.feedback').text());
    if(feedback > 0) {
        $('.tips.feedback').css('display', 'inline');
    }else{
        $('.tips.feedback').css('display', 'none');
    }

    var recharge = parseInt($('.updateNum.recharge').text());
    var withdraw = parseInt($('.updateNum.withdraw').text());
    var mmNum = recharge + withdraw;
    if(mmNum > 0) {
        $('.tips.recharge.withdraw').css('display', 'inline');
    }else{
        $('.tips.recharge.withdraw').css('display', 'none');
    }
}