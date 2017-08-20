/**
 * Created by Administrator on 2016/1/18.
 */
var mongoskin = require('mongoskin');
var dbConf = require('./db-conf');
var db = null;

require('./init-user').initUser(getCollection('User'));



function getCollection(collectionName) {
    if(!db) {
        //连接本机mongodb ,使用帐号密码连接 mongoskin.db('username:password@服务器ip/数据库名
        db = mongoskin.db('mongodb://' + dbConf.host + ':' + dbConf.port + '/' + dbConf.dbName);
    }
    return db.collection(collectionName);
}

module.exports = {
    getCollection: getCollection,
    toObjectID: mongoskin.helper.toObjectID
};










//mongoskin 通过单体模式连接访问数据库

//var mongoskin = require('mongoskin');
//var db = null;
//
//exports.getCollection = function (collectionName) {
//    if (!db) {
//        //连接本机mongodb ,使用帐号密码连接 mongoskin.db('username:password@服务器ip/数据库名
//        db = mongoskin.db('mongodb://127.0.0.1:27017/test?auto_reconnect=true&poolSize=3',
//            {numberOfRetries: 1, retryMiliSeconds: 500, safe: true, native_parser: true},
//            {socketOptions: {timeout: 5000}}
//        );
//    }
//    return db.collection(collectionName);
//}