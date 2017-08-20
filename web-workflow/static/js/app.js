$(function () {
    //读取body data-type 判断是哪一个页面，标记相应的菜单栏
    var dataType = $('body').attr('data-type');
    switch (dataType) {
        case 'feedback':
        case 'vipVideo':
        case 'userHome':
        case 'recharge':
        case 'withdraw':
        case 'adminHome':
            $('#' + dataType).addClass('active');
            break;
        default:
            $('#' + dataType)
                .addClass('sub-active')
                .parent()
                .parent()
                .css('display', 'block')
                .prev()
                .addClass('active');
    }

    autoLeftNav();
    $(window).resize(function () {
        //autoLeftNav();
    });
});


// 侧边菜单开关
function autoLeftNav() {
    $('.tpl-header-switch-button').on('click', function () {
        if ($('.left-sidebar').is('.active')) {
            if ($(window).width() > 1024) {
                $('.tpl-content-wrapper').removeClass('active');
            }
            $('.left-sidebar').removeClass('active');
        } else {

            $('.left-sidebar').addClass('active');
            if ($(window).width() > 1024) {
                $('.tpl-content-wrapper').addClass('active');
            }
        }
    });

    if ($(window).width() < 1024) {
        $('.left-sidebar').addClass('active');
    } else {
        $('.left-sidebar').removeClass('active');
    }
}


// 侧边菜单
$('.sidebar-nav-sub-title').on('click', function () {
    $(this).siblings('.sidebar-nav-sub').slideToggle(80)
        .end()
        .find('.sidebar-nav-sub-ico').toggleClass('sidebar-nav-sub-ico-rotate');
    var otherBar = $(this).parent().siblings();
    otherBar.children('.sidebar-nav-sub')
        .slideUp(80);
    otherBar.find('.sidebar-nav-sub-ico').removeClass('sidebar-nav-sub-ico-rotate');
});