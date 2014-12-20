
var config = require('./../config');

var util = require('util'),
    fs = require('fs'),
    validator = require('validator'),
    readTorrent = require('read-torrent');
var tracker = require('./../lib/tracker');
var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;

const onePage = 30;

function Torrents(torrent) {
    ModelBase.call(this);

    if (torrent) {
        if (torrent._id) this._id = torrent._id;
        if (torrent.title) {
            this.title = validator.trim(torrent.title);
            this.titleIndex = Torrents.makeIndexArray(this.title);
        }
        this.introduction = torrent.introduction;
        this.tag_ids = torrent.tag_ids;   //tags id
        if (torrent.bangumi_id) {
            this.bangumi_id = new ObjectID(torrent.bangumi_id);
        }
        //downloads

        if (!torrent.downloads) {
            this.downloads = 0;
        }
        //finished
        if (!torrent.finished) {
            this.finished = 0;
        }
        //leechers
        if (!torrent.leechers) {
            this.leechers = 0;
        }
        //seeders
        if (torrent.seeders) {
            this.seeders = 0;
        }
        if (torrent.uploader_id) {
            this.uploader_id = new ObjectID(torrent.uploader_id);
        }
        if (torrent.team_id) {
            this.team_id = new ObjectID(torrent.team_id);
        }
        //publish_time
        this.magnet = torrent.magnet;
        this.infoHash = torrent.infoHash;
        if (torrent.file_id) {
            this.file_id = new ObjectID(torrent.file_id);
        }
        this.teamsync = torrent.teamsync;
        this.content = torrent.content;
    }
}

util.inherits(Torrents, ModelBase);

Torrents.parseTorrent = function *(torrentPath) {
    var torrentInfo = function (file) {
        return function (callback) {
            readTorrent(file, callback);
        };
    };
    return (yield torrentInfo(torrentPath));
};

Torrents.generateMagnet = function (infoHash) {
    //or we can use base32 infoHash instead
    return 'magnet:?xt=urn:btih:' + infoHash;
};

Torrents.addToTrackerWhitelist = function (infoHash) {
    tracker.whitelist_add(infoHash);
    return true;
};

Torrents.checkAnnounce = function (announce) {
    if (!(announce instanceof Array && announce.length > 0)) {
        return false;
    }
    if (config['tracker'].contains && config['tracker'].contains.length > 0) {
        //need check
        var found = false;
        config['tracker'].contains.forEach(function (ann) {
            if (found) return;
            if (announce.indexOf(ann) >= 0) {
                found = true;
            }
        });
        return found;
    }
    return true;
};

Torrents.prototype.set = function (t) {
    if (t) {
        this._id = t._id;
        this.title = t.title;
        this.introduction = t.introduction;
        this.tag_ids = t.tag_ids;
        this.uploader_id = t.uploader_id;
        this.team_id = t.team_id;
        this.magnet = t.magnet;
        this.infoHash = t.infoHash;
        this.file_id = t.file_id;
        this.content = t.content;
        this.teamsync = t.teamsync;
        this.titleIndex = t.titleIndex;
    } else {
        this._id = this.title = this.introduction
            = this.tag_ids = this.uploader_id = this.team_id
            = this.magnet = this.file_id = this.content
            = this.teamsync = this.titleIndex = undefined;
    }
    return t;
};

Torrents.prototype.valueOf = function () {
    return {
        _id: this._id,
        title: this.title,
        introduction: this.introduction,
        tag_ids: this.tag_ids,
        uploader_id: this.uploader_id,
        team_id: this.team_id,
        magnet: this.magnet,
        infoHash: this.infoHash,
        file_id: this.file_id,
        teamsync: this.teamsync,
        content: this.content
    };
};

Torrents.prototype.ensureIndex = function () {
    var ge_tagid = this.collection.ensureIndex({
        tag_ids: 1
    }, { background: true, w: 1 });
    var ge_infoHash = this.collection.ensureIndex({
        infoHash: 1
    }, { background: true, w: 1 });
    var ge_title = this.collection.ensureIndex({
        titleIndex: 1
    }, { background: true, w: 1 });
    ge_tagid(function (err) {
        if (err) {
            console.log('Torrents tag ID ensureIndex failed!');
        }
    });
    ge_infoHash(function (err) {
        if (err) {
            console.log('Torrents infoHash ensureIndex failed!');
        }
    });
    ge_title(function (err) {
        if (err) {
            console.log('Torrents title ensureIndex failed!');
        }
    });
};

Torrents.prototype.save = function *() {
    var nt = {
        title: this.title,
        introduction: this.introduction,
        tag_ids: this.tag_ids,
        downloads: 0,
        finished: 0,
        leechers: 0,
        seeders: 0,
        uploader_id: this.uploader_id,
        team_id: this.team_id,
        publish_time: new Date(),
        magnet: this.magnet,
        infoHash: this.infoHash,
        file_id: this.file_id,
        teamsync: this.teamsync,
        content: this.content,
        titleIndex: this.titleIndex
    };

    var ts = yield this.collection.insert(nt, { safe: true });
    if (ts && ts[0]) {
        this.set(ts[0]);
        yield this.cache.del('page/0');
        return ts[0];
    }
    return null;
};

Torrents.prototype.getLatest = function *(limit) {
    var r = yield this.cache.get('latest/' + limit);
    if (!r) {
        r = yield this.collection.find().sort({ publish_time: -1 }).limit(limit).toArray();
        yield this.cache.set('latest/' + limit, r);
    }
    return r;
};

Torrents.prototype.getPageCount = function *() {
    return Math.ceil((yield this.count()) / onePage);
};

Torrents.prototype.getByPage = function *(page) {
    if (page <= 0) {
        return [];
    }
    page--; //for index
    var r = yield this.cache.get('page/' + page);
    if (r === null) {
        r = yield this.collection.find({})
            .sort({publish_time: -1}).skip(page * onePage).limit(onePage).toArray();
        yield this.cache.set('page/' + page, r);
    }
    return r;
};

Torrents.prototype.getByUser = function *(user_id, limit) {
    if (!limit) limit = onePage;
    return yield this.collection.find({ uploader_id: new ObjectID(user_id) })
        .sort({ publish_time: -1 }).limit(limit).toArray();
};

Torrents.prototype.getByTeam = function *(team_id, limit) {
    if (!limit) limit = onePage;
    return yield this.collection.find({ team_id: new ObjectID(team_id) })
        .sort({ publish_time: -1 }).limit(limit).toArray();
};

Torrents.prototype.getByTags = function *(tag_ids, limit) {
    if (!limit) {
        limit = onePage;
    }
    for (var i = 0; i < tag_ids.length; i++) {
        tag_ids[i] = new ObjectID(tag_ids[i]);
    }
    return yield this.collection.find({
        tag_ids: { $all: tag_ids }
    }).sort({ publish_time: -1 }).limit(limit).toArray();
};

Torrents.prototype.getByTitle = function *(title) {
    var title = title.toLowerCase();
    var r = yield this.cache.get('title/' + title);
    if (r === null) {
        var title_array = title.split('');
        r = yield this.collection.find({ titleIndex: { $all: title_array } }).sort({ publish_time: -1 }).toArray();
        yield this.cache.set('title/' + title, r);
    }
    return r;
};

Torrents.prototype.dlCount = function *(torrent_id) {
    if (!torrent_id) {
        torrent_id = this._id;
    }
    yield this.collection.update({
        _id: new ObjectID(torrent_id)
    }, {
        $inc: { downloads: 1 }
    }, { w: 1 });
};

Torrents.prototype.updateByInfoHash = function *(infoHash, set, inc) {
    var upd = { $set: set };
    if (inc) {
        upd.$inc = inc;
    }
    return yield this.collection.update({ infoHash: infoHash }, upd);
};

Torrents.prototype.setSyncStatus = function *(syncStatus) {
    return yield this.collection.update({ _id: new ObjectID(this._id) }, { $set: {sync: syncStatus} });
};

Torrents.prototype.getSuggest = function *(title, user_id, team_id) {
    var q;
    if (user_id && team_id) {
        q = { $or: [{uploader_id: new ObjectID(user_id)}, {team_id: new ObjectID(team_id)}] };
    } else if (user_id) {
        q = { uploader_id: new ObjectID(user_id) };
    } else {
        return {};
    }

    var rs = yield this.collection.find(q).sort({ publish_time: -1 }).limit(20).toArray();
    if (rs) {
        var torrent = {};
        var maxSim = 0;
        rs.forEach(function (t) {
            var s = calcSimilarityByTitle(title, t.title);
            if (s > maxSim) {
                maxSim = s;
                torrent = t;
            }
        });
        return torrent;
    }
    return {};
};

Torrents.makeIndexArray = function (text) {
    var title = text.toLowerCase().split('');
    var stripArray = ['[', ']', '「', '」', '【', '】', ' ', ''];
    title.forEach(function(t) {
        if (stripArray.indexOf(t) !== -1) {
            title.splice(title.indexOf(t), 1);
        }
    });
    return title;
};

var calcSimilarityByTitle = function (title1, title2) {
    var s = 0;
    var regexSplit = /[\[\]\&「」【】 _\/]/;
    var title1 = validator.trim(title1).toLowerCase();
    var title2 = validator.trim(title2).toLowerCase();
    var t1arr = title1.split(regexSplit);
    var t2arr = title2.split(regexSplit);
    if (t1arr && t2arr && t1arr.length && t2arr.length) {
        for (var i = 0; i < t1arr.length; i++) {
            if (t2arr.indexOf(t1arr[i]) >= 0) {
                s++;
            }
        }
    }
    return s;
};

module.exports = Torrents;

ModelBase.register('torrents', Torrents);
