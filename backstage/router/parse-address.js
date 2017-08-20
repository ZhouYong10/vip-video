/**
 * Created by ubuntu64 on 3/11/16.
 */
var Address = require('../models/Address');
var User = require('../models/User');

var router = require('express').Router();


router.post('/wx/title/by/address', function (req, res) {
    var address = req.body.address;
    Address.parseWxTitle(address)
        .then(function (obj) {
            res.send(obj);
        }, function (obj) {
            res.send(obj);
        });
});

router.post('/title/by/address', function (req, res) {
    var address = req.body.address;
    Address.parseMpTitle(address)
        .then(function (obj) {
            res.send(obj);
        }, function (obj) {
            res.send(obj);
        });
});

router.post('/forum/title/by/address', function (req, res) {
    var address = req.body.address;
    User.open().findById(req.session.passport.user)
        .then(function (user) {
            Address.parseForumTitle(address, user.role)
                .then(function (obj) {
                    res.send(obj);
                }, function (obj) {
                    res.send(obj);
                });
        });
});

router.post('/flow/forum/address', function (req, res) {
    var address = req.body.address;
    Address.judgeForumAddress(address)
        .then(function (obj) {
            res.send(obj);
        });
});

module.exports = router;



