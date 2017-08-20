/**
 * Created by ubuntu64 on 2/26/16.
 */
var Utils = require('utils');

$(function() {
    $('#commit').click(function(e) {
        e.stopPropagation();
        e.preventDefault();
        var $alipayNum = $('#rechargeNum');
        var alipayNum = $alipayNum.val();
        var numLen = alipayNum.length;
        if(Utils.isNum(alipayNum) && (numLen == 32 || numLen == 28)){
            $.post('/user/recharge', {
                alipayId: alipayNum
            }).then(function(data) {
                if(data.isOK) {
                    $('<a href="' + data.path + '" ></a>').get(0).click();
                }else{
                    layer.msg(data.message);
                }
            });
        }else{
            layer.tips('请输入合法的支付宝交易号!', '#rechargeNum', {
                tips: [1, '#f00'],
                time: 4000
            });
        }
    })
})