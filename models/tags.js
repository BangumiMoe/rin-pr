"use strict";

/**
 * models/tags.js
 * Rin prpr!
 *
 * rin-pr Tags model
 */

var util = require('util');
var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;

function Tags(tag) {
    ModelBase.call(this);

    this.name = tag.name;
    this.synonyms = tag.synonyms;
}

util.inherits(Tags, ModelBase);

Tags.prototype.matchTags = function *() {
    return yield this.collection.find({ synonyms: { $in: this.synonyms } }).toArray();
};

Tags.prototype.add = function *() {
    var tag = {
        name: this.name,
        synonyms: this.synonyms
    };

    if (tag.synonyms.indexOf(tag.name) === -1) {
        // Add tag name itself to synonyms
        tag.synonyms.push(tag.name);
    }

    yield this.collection.insert(tag, { safe: true });
    yield this.collection.ensureIndex({ synonyms: 1 }, { unique: true, background: true, w: 1 });
};

Tags.prototype.remove = function *() {
    var tagId = new ObjectID(this._id);
    return (yield this.collection.remove({ _id: tagId }, {w: 1}));
};

Tags.prototype.find = function *() {
    var tagId = new ObjectID(this.id);
    return (yield this.collection.findOne({ _id: tagId }));
};

Tags.prototype.update = function *() {
    return (yield this.collection.update({ _id: new ObjectID(this._id) }, { $set: { name: this.name, synonyms: this.synonyms }}));
};

Tags.getAll = function *() {
    return (yield this.collection.find({}).toArray());
};

module.exports = Tags;

ModelBase.register('tags', Tags);
