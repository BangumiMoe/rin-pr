
var util = require('util'),
    fs = require('fs'),
    validator = require('validator'),
    parseTorrent = require('parse-torrent');
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
        if (torrent.file_id) {
            this.file_id = new ObjectID(torrent.file_id);
        }
        this.content = torrent.content;
    }
}

util.inherits(Torrents, ModelBase);

Torrents.parseTorrent = function *(torrentPath) {
    var readFile = function (file) {
        return function (callback) {
            fs.readFile(file, callback);
        };
    };
    return parseTorrent(yield readFile(torrentPath));
};

Torrents.generateMagnet = function (infoHash) {
    //or we can use base32 infoHash instead
    return 'magnet:?xt=urn:btih:' + infoHash;
};

Torrents.addToTrackerWhitelist = function (infoHash) {
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
        this.file_id = t.file_id;
        this.content = t.content;
        this.titleIndex = t.titleIndex;
    } else {
        this._id = this.title = this.introduction
            = this.tag_ids = this.uploader_id = this.team_id
            = this.magnet = this.file_id = this.content = undefined;
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
        file_id: this.file_id,
        content: this.content
    };
};

Torrents.prototype.save = function *() {
    var t = {
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
        file_id: this.file_id,
        content: this.content,
        titleIndex: this.titleIndex
    };
    return yield this.collection.save(t);
};

Torrents.prototype.get = function *(limit) {
    return yield this.collection.find().sort({ publish_time: -1 }).limit(limit).toArray();
};

Torrents.prototype.getPageCount = function *() {
    return Math.ceil((yield this.count()) / onePage);
};

Torrents.prototype.getByPage = function *(page) {
    if (page <= 0) {
        return [];
    }
    page--; //for index
    return yield this.collection.find({})
        .sort({publish_time: -1}).skip(page * onePage).limit(onePage).toArray();
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

module.exports = Torrents;

ModelBase.register('torrents', Torrents);
