"use strict";

/**
 * models/bangumis.js
 * Rin prpr!
 *
 * rin-pr Bangumis model
 */

var util = require('util');
var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;


function Bangumis(bangumi) {
    ModelBase.call(this);

    if (bangumi) {
        if (bangumi._id) this._id = bangumi._id;
        this.name = bangumi.name;
        this.startDate = new Date(bangumi.startDate).getTime();
        this.endDate = new Date(bangumi.endDate).getTime();
        this.showOn = parseInt(bangumi.showOn);
        if (bangumi.tag) {
            this.tag = new ObjectID(bangumi.tag);
        }
        this.cover = bangumi.cover;
        this.thumb = bangumi.thumb;
    }
}

util.inherits(Bangumis, ModelBase);

Bangumis.prototype.set = function (bangumi) {
    if (bangumi) {
        this._id = bangumi._id;
        this.name = bangumi.name;
        this.startDate = bangumi.startDate;
        this.endDate = bangumi.endDate;
        this.showOn = bangumi.showOn;
        this.tag = bangumi.tag;
        this.cover = bangumi.cover;
        this.thumb = bangumi.thumb;
    } else {
        this._id = this.name = this.startDate
          = this.endDate = this.showOn = this.tag = undefined;
    }
};

Bangumis.prototype.valueOf = function () {
    return {
        _id: this._id,
        name: this.name,
        startDate: this.startDate,
        endDate: this.endDate,
        showOn: this.showOn,
        tag: this.tag,
        cover: this.cover,
        thumb: this.thumb
    };
};

Bangumis.prototype.save = function *() {
    var newBgm = {
        name: this.name,
        startDate: this.startDate,
        endDate: this.endDate,
        showOn: this.showOn,
        tag: this.tag,
        cover: this.cover,
        thumb: this.thumb
    };

    return yield this.collection.insert(newBgm, { safe: true });
};

Bangumis.prototype.getRecent = function *() {
    var day = new Date().getDay();
    var today = new Date().getTime();
    return yield this.collection.find({
        $and: [
            { showOn: { $gte: day - 1 } },
            { showOn: { $lte: day + 1 } }
        ],
        startDate: { $lte: today },
        endDate: { $gte: today }
    }).toArray();
};

Bangumis.prototype.getCurrent = function *() {
    var today = new Date().getTime();
    return yield this.collection.find({
        startDate: { $lte: today },
        endDate: { $gte: today }
    }).toArray();
};

module.exports = Bangumis;

ModelBase.register('bangumis', Bangumis);
