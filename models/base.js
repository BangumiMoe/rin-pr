"use strict"

var util = require('util'),
    co = require('./../node_modules/koa/node_modules/co'),
    generator = require('./../lib/generator'),
    cache = require('./../lib/cache');

var config = require('./../config'),
    MongoClient = require('mongodb'),
    ObjectID = MongoClient.ObjectID;

var models = {},
    collections = {};

function ModelBase() {
    //this.db = null;
    this.collection = null;
}

module.exports = ModelBase;

ModelBase.prototype.ensureIndex = function *() {
};

ModelBase.prototype.set = function () {
};

ModelBase.prototype.valueOf = function () {
    return {};
};

ModelBase.prototype.find = function *(id) {
    if (id instanceof Array) {
        //maybe we need cache ids
        var oids = [];
        id.forEach(function (_id) {
            oids.push(new ObjectID(_id));
        });
        return yield this.collection.find({ _id: {$in: oids} }).toArray();
    }
    var _id = id ? id : this._id;
    var r = yield this.cache.get('id/' + _id.toString());
    if (r === null) {
        r = yield this.collection.findOne({ _id: new ObjectID(_id) });
        if (r) {
            yield this.cache.set('id/' + _id.toString(), r);
        }
    }
    this.set(r);
    return r;
};

ModelBase.prototype.count = function* () {
    var c = yield this.cache.get('count');
    if (c === null) {
        c = yield this.collection.count();
        yield this.cache.set('count', c);
    }
    return c;
};

ModelBase.prototype.getAll = function *(query) {
    return yield this.collection.find(query ? query : {}).toArray();
};

ModelBase.prototype.remove = function *(id) {
    var _id = id ? id : this._id;
    yield this.cache.del('id/' + _id.toString());
    return yield this.collection.remove({ _id: new ObjectID(_id) }, { w: 1 });
};

ModelBase.prototype.update = function *(data) {
    if (!data) {
        data = this.valueOf();
        delete data._id;
    }
    var r = yield this.collection.update({ _id: new ObjectID(this._id) }, { $set: data }, { w: 1 });
    //TODO: r? or r[0]?
    //this.set(r);
    //OR: need to reload
    yield this.cache.del('id/' + this._id.toString());
    return r;
};

ModelBase.register = function (name, ModelClass, callback) {
    let authStr = '';
    callback = callback ? callback : function () {
    };

    if (models[name]) {
        return callback(new Error('already register'));
    }

    var o = {};
    var c = function () {
        //Objects to Array
        var args = Array.prototype.slice.call(arguments);
        ModelClass.apply(this, args);
        this.class = name;
        this.cache = new cache(name + '/');
        //this._collection = o._collection;
        this.collection = o.collection;
    };
    for (var f in ModelClass) {
        c[f] = ModelClass[f];
    }
    util.inherits(c, ModelClass);
    models[name] = c;

    if (!config['db'] || !config['db']['name']) {
        return callback(new Error('not found db config'));
    }

    if (config['db']['username'] && config['db']['password']) {
        authStr = config['db']['username'] + ':' + config['db']['password'] + '@';
    }

    MongoClient.connect('mongodb://' + authStr + config['db']['host'] + '/' + config['db']['name'], {w: 1}, function (err, db) {
        if (err) {
            console.error(err);
            return callback(err);
        }

        o._collection = db.collection(name);
        o.collection = new generator(o._collection,
            {wrapResult: ['find', 'limit', 'skip', 'sort']});

        //ensureIndex first time
        co(function *() {
          yield new c().ensureIndex();
        });

        callback(null, c);
    });
};

ModelBase.M = function (name) {
    return models[name];
};
