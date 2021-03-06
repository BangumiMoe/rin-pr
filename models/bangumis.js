"use strict";

/**
 * models/bangumis.js
 * Rin prpr!
 *
 * rin-pr Bangumis model
 */

var util = require('util'),
    validator = require('validator'),
    _ = require('underscore');
var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;


function Bangumis(bangumi) {
    ModelBase.call(this);

    if (bangumi) {
        if (bangumi._id) this._id = bangumi._id;
        if (bangumi.name) {
            this.name = validator.trim(bangumi.name);
        }
        if (bangumi.credit) {
            this.credit = validator.trim(bangumi.credit);
        }
        this.startDate = new Date(bangumi.startDate).getTime();
        this.endDate = new Date(bangumi.endDate).getTime();
        this.showOn = parseInt(bangumi.showOn);
        if (bangumi.tag_id) {
            this.tag_id = new ObjectID(bangumi.tag_id);
        }
        this.icon = bangumi.icon;
        this.cover = bangumi.cover;
        if (bangumi.acgdb_id) {
            this.acgdb_id = bangumi.acgdb_id;
        }
    }
}

util.inherits(Bangumis, ModelBase);

Bangumis.prototype.set = function (bangumi) {
    if (bangumi) {
        this._id = bangumi._id;
        this.name = bangumi.name;
        this.credit = bangumi.credit;
        this.startDate = bangumi.startDate;
        this.endDate = bangumi.endDate;
        this.showOn = bangumi.showOn;
        this.tag_id = bangumi.tag_id;
        this.icon = bangumi.icon;
        this.cover = bangumi.cover;
        this.acgdb_id = bangumi.acgdb_id;
    } else {
        this._id = this.name = this.credit = this.startDate
          = this.endDate = this.showOn = this.tag_id
          = this.icon = this.cover = this.acgdb_id = undefined;
    }
};

Bangumis.prototype.valueOf = function () {
    return {
        _id: this._id,
        name: this.name,
        credit: this.credit,
        startDate: this.startDate,
        endDate: this.endDate,
        showOn: this.showOn,
        tag_id: this.tag_id,
        icon: this.icon,
        cover: this.cover,
        acgdb_id: this.acgdb_id
    };
};

Bangumis.prototype.ensureIndex = function *() {
  yield this.collection.ensureIndex({
    startDate: 1, endDate: 1
  }, { background: true, w: 1 });
};

Bangumis.prototype.save = function *() {
    var newBgm = {
        name: this.name,
        credit: this.credit,
        startDate: this.startDate,
        endDate: this.endDate,
        showOn: this.showOn,
        tag_id: this.tag_id,
        icon: this.icon,
        cover: this.cover,
        acgdb_id: this.acgdb_id
    };

    var t = yield this.insert(newBgm, { safe: true });
    if (t) {
        return t;
    }
    return null;
};

Bangumis.prototype.getRecent = function *(fortimeline) {
    var day = new Date().getDay();
    var today = new Date().getTime();
    var k = fortimeline ? 'recent/tl' : 'recent';
    var r = yield this.cache.get(k);
    if (r === null) {
        var days = [day - 2, day - 1, day, day + 1];
        for (var i = 0; i < days.length; i++) {
            if (days[i] < 0) {
                days[i] += 7;
            } else if (days[i] > 6) {
                days[i] -= 7;
            }
        }
        var q = {
            showOn: { $in: days },
            startDate: { $lte: today + 60 * 60 * 24 * 1000 }
        };
        if (fortimeline) {
            q.endDate = { $gte: today - 60 * 60 * 24 * 2 * 1000 };
        } else {
            q.endDate = { $gte: today - 60 * 60 * 24 * 7 * 1000 };
        }
        r = yield this.collection.find(q).toArray();
        yield this.cache.set(k, r);
    }
    return r;
};

Bangumis.prototype.getCurrent = function *() {
    var today = new Date().getTime();
    var r = yield this.cache.get('current');
     if (r === null) {
        r = yield this.collection.find({
            startDate: { $lte: today + 60 * 60 * 24 * 3 * 1000 }, // 3 days before first show
            endDate: { $gte: today - 60 * 60 * 24 * 7 * 1000 } // Ended bangumis last for 1 week
        }).toArray();
        yield this.cache.set('current', r);
    }
    return r;
};

Bangumis.prototype.getByName = function *(name) {
    return yield this.collection.findOne({name: name});
};

Bangumis.prototype.getByTagId = function *(tag_id) {
  if (tag_id instanceof Array) {
    var tag_ids = _.map(tag_id, function (t) { return new ObjectID(t); });
    return yield this.collection.find({tag_id: { $in: tag_ids }}).toArray();
  } else {
    return yield this.collection.findOne({tag_id: new ObjectID(tag_id)});
  }
};

module.exports = Bangumis;

ModelBase.register('bangumis', Bangumis);
