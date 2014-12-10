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
        synonyms: this.synonyms
    };
};

Tags.prototype.matchTags = function *(tag_arr) {
    return yield this.collection.find({ synonyms: { $in: tag_arr } }).toArray();
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

    var tag = yield this.collection.insert(tag, { safe: true });
    yield this.collection.ensureIndex({ synonyms: 1 }, { unique: true, background: true, w: 1 });

    if (tag && tag[0]) {
        this.set(tag[0]);
        return tag[0];
    }
    return null;
};

module.exports = Tags;

ModelBase.register('tags', Tags);
