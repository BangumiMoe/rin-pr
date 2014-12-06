"use strict";

/**
 * models/tags.js
 * Rin prpr!
 *
 * rin-pr Tags model
 */

var util = require('util'),
    generator = require('./../lib/generator');
var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;

function Tags(tag) {
    ModelBase.call(this);

    if (tag) {
        this.name = tag.name;
        this.synonyms = tag.synonyms;
    }
}

util.inherits(Tags, ModelBase);

Tags.prototype.set = function (tag) {
    if (tag) {
        this._id = tag._id;
        this.name = tag.name;
        this.synonyms = tag.synonyms;
    } else {
        this._id = this.name = this.synonyms = undefined;
    }
};

Tags.prototype.valueOf = function () {
    return {
        _id: this._id,
        name: this.name,
        synonyms: this.synonyms,
    };
};

Tags.prototype.matchTags = function *() {
    return (yield this.collection.find({ synonyms: { $in: this.synonyms } })).toArray();
};

Tags.prototype.valid = function () {
    if (typeof this.name == 'string'
        && this.synonyms instanceof Array) {
        return true;
    }
    return false;
};

Tags.prototype.save = function *() {
    var tag = {
        name: this.name,
        synonyms: this.synonyms
    };

    if (tag.synonyms.indexOf(tag.name) === -1) {
        // Add tag name itself to synonyms
        tag.synonyms.push(tag.name);
    }

    var tag = yield this.collection.insert(tag, { safe: true });
    yield this.collection.ensureIndex({ synonyms: 1 }, { unique: true, background: true, w: 1 });

    if (tag && tag[0]) {
        this.set(tag[0]);
        return tag[0];
    }
    return null;
};

Tags.prototype.remove = function *() {
    var tagId = new ObjectID(this._id);
    return yield this.collection.remove({ _id: tagId }, {w: 1});
};

Tags.prototype.find = function *(id) {
    var _id = id ? id : this._id;
    var tagId = new ObjectID(_id);
    var tag = yield this.collection.findOne({ _id: tagId });
    this.set(tag);
    return tag;
};

Tags.prototype.update = function *() {
    return yield this.collection.update({ _id: new ObjectID(this._id) }, { $set: { name: this.name, synonyms: this.synonyms }});
};

Tags.prototype.getAll = function *() {
    var cur = yield this.collection.find({});
    return yield generator.create('toArray', cur.toArray, cur)();
};

module.exports = Tags;

ModelBase.register('tags', Tags);
