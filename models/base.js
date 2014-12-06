"use strict"

var util = require('util'),
    generator = require('./../lib/generator');
var config = require('../config'),
    MongoClient = require('mongodb');

var models = {},
    collections = {};

function ModelBase() {
    //this.db = null;
    this.collection = null;
}

module.exports = ModelBase;

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
        //this._collection = o._collection;
        this.collection = o.collection;
    };
    util.inherits(c, ModelClass);
    models[name] = c;

    if (!config['db']) {
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
        o.collection = new generator(o._collection);

        callback(null, c);
    });
};

ModelBase.M = function (name) {
    return models[name];
};
