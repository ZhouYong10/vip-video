/**
 * Created by ubuntu64 on 3/28/16.
 */
$(function () {
    $('#resetPassword').click(function (e) {
        e.stopPropagation();
        e.preventDefault();
        var id = $('input[name="id"]').val();
        $.get('/admin/user/edit/reset/password', {id: id}, function () {
            layer.msg('密码重置成功！');
        })
    })
});