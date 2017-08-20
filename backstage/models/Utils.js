/**
 * Created by ubuntu64 on 2/21/17.
 */
var crypto = require('crypto');


module.exports = {
    invitationKey: 'gao@chui&zi',
    cipher: function(buf, key) {
        var encrypted = '';
        var cip = crypto.createCipher('aes-256-cbc', key);
        encrypted += cip.update(buf, 'binary', 'hex');
        encrypted += cip.final('hex');
        return encrypted;
    },
    decipher: function(encrypted, key) {
        var decrypted = '';
        var decipher = crypto.createDecipher('aes-256-cbc', key);
        decrypted += decipher.update(encrypted, 'hex', 'binary');
        decrypted += decipher.final('binary');
        return decrypted;
    }
};