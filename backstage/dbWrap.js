/**
 * Created by zhouyong10 on 2/4/16.
 */
var db = require('./db');
var collection ;

function haveCollection(resolve, reject) {
    if(!collection) {
        reject(Error('数据库连接不存在。'));
    }
    resolve();
}

function findOne(obj) {
    return new Promise(function(resolve, reject) {
        haveCollection(function () {
            collection.findOne(obj, function (error, result) {
                if (error) {
                    reject(error);
                }
                resolve(result);
            })
        }, reject);
    })
}

function remove(obj) {
    return new Promise(function(resolve, reject) {
        haveCollection(function () {
            collection.remove(obj, function(error, result) {
                if(error) {
                    reject(error);
                }
                resolve(result);
            });
        }, reject);
    })
}

module.exports = {
    toObjectID: function(id) {
        return db.toObjectID(id);
    },
    openCollection: function(colName) {
        collection = db.getCollection((colName));
        return this;
    },
    findById: function(id) {
        return findOne({_id: db.toObjectID(id)});
    },
    findOne: function(obj) {
        return findOne(obj);
    },
    find: function(obj) {
        var userObj = obj ? obj : null;
        return new Promise(function(resolve, reject) {
            haveCollection(function () {
                collection.find(userObj)
                    .toArray(function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                })
            }, reject);
        })
    },
    newPlacard: function(obj) {
        return new Promise(function(resolve, reject) {
            haveCollection(function () {
                collection.find(obj)
                    .sort({'_id': -1})
                    .limit(2)
                    .toArray(function (error, result) {
                        if (error) {
                            reject(error);
                        }
                        resolve(result);
                    })
            }, reject);
        })
    },
    findPages: function(obj, page, sortObj) {
        var sortBy = sortObj ? sortObj : {'_id': -1};
        var userObj = obj ? obj : null;
        var pageCont = 10;
        return new Promise(function(resolve, reject) {
            haveCollection(function () {
                collection.count(userObj, function(err, total) {
                    collection.find(userObj)
                        .sort(sortBy)
                        .skip(((page ? page : 1) - 1) * pageCont)
                        .limit((page ? pageCont : 0))
                        .toArray(function (error, result) {
                            if (error) {
                                reject(error);
                            }
                            resolve({
                                results: result,
                                pages: parseInt(total / pageCont) + ((total % pageCont > 0) ? 1 : 0)
                            });
                        });

                    //collection.find(userObj, {
                    //    skip: ((page ? page : 1) - 1) * pageCont,
                    //    limit: (page ? pageCont : 0)
                    //}).toArray(function (error, result) {
                    //    if (error) {
                    //        reject(error);
                    //    }
                    //    resolve({
                    //        results: result,
                    //        pages: parseInt(total / pageCont) + ((total % pageCont > 0) ? 1 : 0)
                    //    });
                    //})
                })
            }, reject);
        })
    },
    insert: function(obj) {
        return new Promise(function(resolve, reject) {
            haveCollection(function () {
                collection.insert(obj, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                })
            }, reject);
        })
    },
    update: function(query, update, sort) {
        var sortBy = sort ? sort : [];
        return new Promise(function(resolve, reject) {
            haveCollection(function () {
                collection.findAndModify(query, sortBy, update, {new: true, upsert: true}, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                })
            }, reject);
        })
    },
    updateById: function(id, obj) {
        return new Promise(function(resolve, reject) {
            haveCollection(function () {
                collection.updateById(id, obj, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                })
            }, reject);
        })
    },
    removeById: function(id) {
        return remove({
            _id: db.toObjectID(id)
        });
    },
    remove: function(obj) {
        return remove(obj);
    },
    aggregate: function(arrObj) {
        return new Promise(function(resolve, reject) {
            haveCollection(function () {
                collection.aggregate(arrObj, function(error, result) {
                    if(error) {
                        reject(error);
                    }else {
                        resolve(result);
                    }
                })
            }, reject);
        })
    }
};

