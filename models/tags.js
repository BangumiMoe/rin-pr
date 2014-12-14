"use strict";

/**
 * models/tags.js
 * Rin prpr!
 *
 * rin-pr Tags model
 */

var util = require('util'),
    validator = require('validator');
var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;

function Tags(tag) {
    ModelBase.call(this);

    if (tag) {
        if (tag._id) this._id = tag._id;
        if (tag.name) {
            this.name = validator.trim(tag.name);
        }
        this.synonyms = tag.synonyms ? tag.synonyms : [];
        this.syn_lowercase = Tags.lowercaseArray(this.synonyms);
    }
}

util.inherits(Tags, ModelBase);

Tags.prototype.set = function (tag) {
    if (tag) {
        this._id = tag._id;
        this.name = tag.name;
        this.synonyms = tag.synonyms;
        this.syn_lowercase = tag.syn_lowercase;
    } else {
        this._id = this.name = this.synonyms = this.syn_lowercase = undefined;
    }
};

Tags.prototype.valueOf = function () {
    return {
        _id: this._id,
        name: this.name,
        synonyms: this.synonyms,
        syn_lowercase: this.syn_lowercase
    };
};

Tags.prototype.matchTags = function *(tag_arr) {
    var arr_lowercase = Tags.lowercaseArray(tag_arr);
    return yield this.collection.find({ syn_lowercase: { $in: arr_lowercase } }).toArray();
};

Tags.prototype.valid = function () {
    if (typeof this.name == 'string'
        && this.synonyms instanceof Array) {
        for (var i = 0; i < this.synonyms.length; i++) {
            this.synonyms[i] = validator.trim(this.synonyms[i]);
            if (!this.synonyms[i]) {
                return false;
            }
        }
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

    tag.syn_lowercase = Tags.lowercaseArray(tag.synonyms);

    var tagsave = yield this.collection.insert(tag, { safe: true });
    yield this.collection.ensureIndex({ syn_lowercase: 1 }, { unique: true, background: true, w: 1 });

    if (tag && tag[0]) {
        this.set(tag[0]);
        return tag[0];
    }
    return null;
};

Tags.prototype.getPop = function *() {
    return yield this.collection.find({}).limit(50).toArray();
};

Tags.lowercaseArray = function (arr) {
    var lowercaseArr = [];
    arr.forEach(function (a) {
        lowercaseArr.push(a.toLowerCase());
    });
    return lowercaseArr;
};

module.exports = Tags;

ModelBase.register('tags', Tags);
