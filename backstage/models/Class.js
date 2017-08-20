/**
 * Created by zhouyong10 on 2/4/16.
 */

module.exports = function() {
    var klass = function() {
        this.init.apply(this, arguments);
    };

    klass.fn = klass.prototype;

    klass.fn.init = function () {};

    klass.fn.parent = klass;

    klass.wrapToInstance = function(obj) {
        for(var key in klass.fn) {
            obj[key] = klass.fn[key];
        }
        return obj;
    };

    klass.extend = function(obj) {
        var extended = obj.extended;
        for(var key in obj) {
            klass[key] = obj[key];
        }
        if(extended) {
            extended(klass);
        }
    };

    klass.include = function(obj) {
        var included = obj.included;
        for(var key in obj) {
            klass.fn[key] = obj[key];
        }
        if(included) {
            included(klass);
        }
    };

    return klass;
};