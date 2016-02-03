"use strict";

/**
 * models/tags.js
 * Rin prpr!
 *
 * rin-pr Tags model
 */

var util = require('util'),
    _ = require('underscore'),
    validator = require('validator'),
    common = require('./../lib/common');
var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;

function RssCollections(rc) {
    ModelBase.call(this);

    if (rc) {
        if (rc._id) this._id = rc._id;
        if (rc.user_id) {
            this.user_id = new ObjectID(rc.user_id);
        }
        this.collections = rc.collections;
    }
}

util.inherits(RssCollections, ModelBase);

RssCollections.prototype.set = function (rc) {
    if (rc) {
        this._id = rc._id;
        this.user_id = rc.user_id;
        this.collections = rc.collections;
    } else {
        this._id = this.user_id = this.collections = undefined;
    }
};

RssCollections.prototype.valueOf = function () {
    return {
        _id: this._id,
        user_id: this.user_id,
        collections: this.collections
    };
};

RssCollections.prototype.valid = function () {
    if (this.collections instanceof Array
        && this.collections.length < 256) {
        var cols = [];
        var sortedIndex = [];
        for (var i = 0; i < this.collections.length; i++) {
            if (!(this.collections[i] instanceof Array)) {
                return false;
            }

            var f = _.uniq(this.collections[i]);
            if (f.length > 16) {
                return false;
            } else if (f.length <= 0) {
                continue;
            }

            for (var j = 0; j < f.length; j++) {
                if (!validator.isMongoId(f[j])) {
                    return false;
                }
            }

            //uniq
            var sorted = f.slice(0).sort().join();
            if (sortedIndex.indexOf(sorted) >= 0) {
                continue;
            }
            sortedIndex.push(sorted);

            //make ObjectId
            for (var j = 0; j < f.length; j++) {
                f[j] = new ObjectID(f[j]);
            }
            if (f.length > 0) {
                cols.push(f);
            }
        }
        this.collections = cols;
        return true;
    }
    return false;
};

RssCollections.prototype.ensureIndex = function *() {
    yield this.collection.ensureIndex({ user_id: 1 },
        { unique: true, background: true, w: 1 });
};

RssCollections.prototype.findByUserId = function *(user_id) {
    var k = 'user/' + user_id;
    var r = yield this.cache.get(k);
    if (r === null) {
        r = yield this.collection.findOne({user_id: new ObjectID(user_id)});
        yield this.cache.set(k, r);
    }
    return r;
};

RssCollections.prototype.save = function *() {
    var k = 'user/' + this.user_id.toString();
    var r = null;
    var ex = yield this.findByUserId(this.user_id);
    if (ex && ex._id) {
        var t = yield this.collection.update({ user_id: this.user_id }, { $set: {collections: this.collections} });
        if (t) {
            ex.collections = this.collections;
            r = ex;
        }
    } else {
        var rc = {
            user_id: this.user_id,
            collections: this.collections
        };

        var ts = yield this.insert(rc, { safe: true });

        if (ts) {
            this.set(ts);
            r = ts;
        }
    }
    yield this.cache.del(k);
    return r;
};

module.exports = RssCollections;

ModelBase.register('rss_collections', RssCollections);
