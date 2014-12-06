"use strict";

/**
 * models/bangumis.js
 * Rin prpr!
 *
 * rin-pr Bangumis model
 */

var util = require('util');
var ModelBase = require('./base');


function Bangumis(bangumi) {
    ModelBase.call(this);

    this.name = bangumi.name;
    this.startDate = new Date(bangumi.startDate).getTime();
    this.endDate = new Date(bangumi.endDate).getTime();
    this.showOn = new Date(bangumi.showOn).getDay();
    this.tag = bangumi.tag;
}

util.inherits(Bangumis, ModelBase);

Bangumis.prototype.save = function *() {
    var newBgm = {
        name: this.name,
        startDate: this.startDate,
        endDate: this.endDate,
        showOn: this.showOn,
        tag: this.tag
    };

    return (yield this.collection.insert(newBgm, { safe: true }));
};

Bangumis.prototype.getAll = function *() {
    return (yield this.collection.find({}).toArray());
};

Bangumis.prototype.getRecent = function *() {
    var day = new Date().getDay();
    var today = new Date().getTime();
    return (yield this.collection.find({
        $and: [
            { showOn: { $gte: day - 1 } },
            { showOn: { $lte: day + 1 } }
        ],
        startDate: { $lte: today },
        endDat: { $gte: today }
    }).toArray());
};

Bangumis.prototype.getCurrent = function *() {
    var today = new Date().getTime();
    return (yield this.collection.find({
        startDate: { $lte: today },
        endDate: { $gte: today }
    }).toArray());
};

Bangumis.prototype.update = function *() {
    return (yield this.collection.update({
        _id: new ObjectID(this._id)
    }, {
        $set: {
            name: this.name,
            startDate: this.startDate,
            endDate: this.endDate,
            showOn: this.showOn,
            tag: this.tag
        }
    }, { w: 1 }));
};

Bangumis.prototype.remove = function *() {
    return (yield this.collection.remove({ _id: new ObjectID(this._id) }, { w: 1 }));
};

module.exports = Bangumis;

ModelBase.register('bangumis', Bangumis);
