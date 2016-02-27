"use strict";

/**
 * models/query_archives.js
 * Rin prpr!
 *
 * rin-pr QueryArchives model
 */

var util = require('util'),
    validator = require('validator'),
    _ = require('underscore');
var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;
var db = require('mongodb');

function QueryArchives(qa) {
    ModelBase.call(this);

    if (qa) {
        if (qa._id) this._id = qa._id;
        if (qa.query) {
            this.query = validator.trim(qa.query);
        }
        this.collections = qa.collections;

    }
}

util.inherits(QueryArchives, ModelBase);

function addMonths(dateObj, num) {
    // This may solve the edge problem of month adding
    var currentMonth = dateObj.getMonth();
    dateObj.setMonth(dateObj.getMonth() + num)

    if (dateObj.getMonth() != ((currentMonth + num) % 12)){
        dateObj.setDate(0);
    }
    return dateObj;
}

QueryArchives.prototype.set = function (qa) {
    if (qa) {
        this._id = qa._id;
        this.query = qa.query;
        this.expireAt = qa.expireAt;
    } else {
        this._id = this.query = this.expireAt = undefined;
    }
};

QueryArchives.prototype.expose = function () {
    return {
        _id: this._id,
        query: this.query,
        expireAt: this.expireAt
    };
};


QueryArchives.prototype.valueOf = function () {
    return {
        _id: this._id,
        query: this.query,
        expireAt: this.expireAt
    };
};


QueryArchives.prototype.ensureIndex = function *() {
    var ge_query = this.collection.ensureIndex({ query: 1 },
        { background: true, w: 1 });
    var ge_expire = this.collection.ensureIndex( { expireAt: 1 },
        { expireAfterSeconds: 0 } );

    yield [ ge_query, ge_expire ];
};


QueryArchives.prototype.save = function *() {
    var today = new Date();
    var newQA = {
        query: this.query,
        expireAt: addMonths(today, 2)  //expires after 2 months
    };

    var t = yield this.insert(newQA, { safe: true });
    if (t) {
        this.set(t);
        return t;
    }
    return null;
};

QueryArchives.prototype.getSuggestions = function *(query , limit) {
    return yield this.aggregate([
        { $match: { query: RegExp(query) } },
        { $group: { _id: '$query', weight: { $sum: 1 } } },
        { $sort: { weight: -1 } },
        { $limit: limit }
    ]);
};

module.exports = QueryArchives;

ModelBase.register('query_archives', QueryArchives);
