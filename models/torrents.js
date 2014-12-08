
var util = require('util'),
    validator = require('validator');
var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;

const onePage = 30;

function Torrents(torrent) {
    ModelBase.call(this);

    if (torrent) {
        if (torrent._id) this._id = torrent._id;
        this.title = torrent.title;
        this.introduction = torrent.introduction;
        this.tags = torrent.tags;   //tags id
        if (torrent.bangumi_id) {
            this.bangumi_id = ObjectID(torrent.bangumi_id);
        }
        //downloads
        //finished
        //leechers
        //seeders
        if (this.team_id) {
            this.team_id = ObjectID(torrent.team_id);
        }
        if (this.author_id) {
            this.author_id = ObjectID(torrent.author_id);
        }
        //publish_time
        //magnet
        //file
        //content
    }
}

util.inherits(Torrents, ModelBase);

Torrents.prototype.set = function (t) {
    if (t) {
        this._id = t._id;
        this.title = t.title;
        this.introduction = t.introduction;
    } else {
        this._id = this.title = this.introduction = undefined;
    }
    return u;
};

Torrents.prototype.valueOf = function () {
    return {
        _id: this._id,
        title: this.title,
        introduction: this.introduction,
    };
};

Torrents.prototype.getPageCount = function *() {
    return (yield this.count()) / onePage;
};

Torrents.prototype.getByPage = function *(page) {
    if (page <= 0) {
        return [];
    }
    page--; //for index
    return yield this.collection.find({})
        .sort({publish_time: -1}).skip(page * onePage).limit(onePage).toArray();
};

module.exports = Torrents;

ModelBase.register('torrents', Torrents);
