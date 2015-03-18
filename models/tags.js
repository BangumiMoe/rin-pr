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

function Tags(tag) {
    ModelBase.call(this);

    if (tag) {
        if (tag._id) this._id = tag._id;
        if (tag.name) {
            this.name = validator.trim(tag.name);
        }
        this.type = tag.type;
        this.synonyms = tag.synonyms ? tag.synonyms : [];
        this.locale = tag.locale ? tag.locale : {};
        this.syn_lowercase = Tags.lowercaseArray(this.synonyms);
    }
}

util.inherits(Tags, ModelBase);

Tags.prototype.set = function (tag) {
    if (tag) {
        this._id = tag._id;
        this.name = tag.name;
        this.type = tag.type;
        this.synonyms = tag.synonyms;
        this.locale = tag.locale;
        this.syn_lowercase = tag.syn_lowercase;
    } else {
        this._id = this.name = this.type = this.synonyms =
            this.locale = this.syn_lowercase = undefined;
    }
};

Tags.prototype.valueOf = function () {
    return {
        _id: this._id,
        name: this.name,
        type: this.type,
        synonyms: this.synonyms,
        locale: this.locale,
        syn_lowercase: this.syn_lowercase
    };
};

Tags.prototype.matchTags = function *(tag_arr) {
    var arr_lowercase = Tags.lowercaseArray(tag_arr);
    return yield this.collection.find({ syn_lowercase: { $in: arr_lowercase } }).toArray();
};

Tags.prototype.searchByKeywords = function *(kw, type) {
    var typeList = ['team', 'bangumi', 'lang', 'resolution', 'format', 'misc'];
    if (type && typeList.indexOf(type) < 0) {
        return [];
    }

    var k = 'keywords/' + kw.toLowerCase();
    if (type) {
        k = 'type/' + type + '/' + k;
    }
    var r = yield this.cache.get(k);
    if (r == null) {
        var kw_reg = common.preg_quote(kw.toLowerCase());
        var sregex = new RegExp(kw_reg);
        //$in
        var q = { syn_lowercase: { $regex: sregex } };
        if (type) {
            q.type = type;
        }
        r = yield this.collection.find(q).limit(8).toArray();
        yield this.cache.set(k, r);
    }
    return r;
};

Tags.prototype.valid = function () {
    if (typeof this.name == 'string'
        && this.synonyms instanceof Array) {
        var typeList = ['team', 'bangumi', 'lang', 'resolution', 'format', 'misc'];
        if (typeList.indexOf(this.type) < 0) {
            return false;
        }
        for (var i = 0; i < this.synonyms.length; i++) {
            this.synonyms[i] = validator.trim(this.synonyms[i]);
            if (!this.synonyms[i]) {
                return false;
            }
        }
        for (var k in this.locale) {
            if (this.synonyms.indexOf(this.locale[k]) < 0) {
                return false;
            }
        }
        return true;
    }
    return false;
};

Tags.prototype.ensureIndex = function *() {
    var ge_syn = this.collection.ensureIndex({ syn_lowercase: 1 },
        { unique: true, background: true, w: 1 });
    var ge_type = this.collection.ensureIndex({ type: 1 },
        { background: true, w: 1 });
    var ge_activity = this.collection.ensureIndex({ activity: -1 },
        { background: true, w: 1 });

    yield [ ge_syn, ge_type, ge_activity ];
};

Tags.prototype.save = function *() {

    var tag = {
        name: this.name,
        type: this.type,
        synonyms: this.synonyms,
        locale: this.locale
    };

    if (tag.synonyms.indexOf(tag.name) === -1) {
        // Add tag name itself to synonyms
        tag.synonyms.push(tag.name);
    }

    tag.syn_lowercase = Tags.lowercaseArray(tag.synonyms);

    var ts = yield this.collection.insert(tag, { safe: true });

    if (ts && ts[0]) {
        this.set(ts[0]);
        return ts[0];
    }
    return null;
};

Tags.prototype.getPopBangumis = function *(limit) {
    if (!limit) {
        limit = 30;
    }
    var r = yield this.cache.get('pop/bangumi/' + limit);
    if (r === null) {
        r = yield this.collection.find({type: 'bangumi'})
                .sort({ activity: -1 }).limit(limit).toArray();
        yield this.cache.set('pop/bangumi/' + limit, r);
    }
    return r;
};

Tags.prototype.getPopTeams = function *(limit) {
    if (!limit) {
        limit = 20;
    }
    var r = yield this.cache.get('pop/team/' + limit);
    if (r === null) {
        r = yield this.collection.find({type: 'team'})
                .sort({ activity: -1 }).limit(limit).toArray();
        yield this.cache.set('pop/team/' + limit, r);
    }
    return r;
};

Tags.prototype.getByName = function *(name) {
  return yield this.collection.findOne({name: name});
};

Tags.prototype.getByType = function *(types) {
    var k = 'type/';
    if (types instanceof Array) {
        k += types.join();
    } else if (typeof types == 'string') {
        k += types;
    } else {
        return [];
    }
    var r = yield this.cache.get(k);
    if (r === null) {
        var q = (types instanceof Array) ? {type: {$in: types}} : {type: types};
        r = yield this.collection.find(q).toArray();
        yield this.cache.set(k, r);
    }
    return r;
};

Tags.prototype.getTeamInTags = function *(tag_ids) {
    var stag_ids = _.map(tag_ids, function (tag_id) {
      return tag_id.toString();
    });
    var utag_ids = _.uniq(stag_ids);

    var k = 'teams_tagin/hash/' + common.md5(utag_ids.slice().sort().join());
    var r = yield this.cache.get(k);
    if (r === null) {
        tag_ids = _.map(utag_ids, function (tag_id) {
          return new ObjectID(tag_id);
        });
        r = yield this.collection.find(
            {
                _id: { $in: tag_ids },
                type: 'team'
            }, {
                _id: 1
            }
        ).toArray();
        yield this.cache.set(k, r);
    }
    return r;
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
