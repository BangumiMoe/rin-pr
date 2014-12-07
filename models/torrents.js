
var util = require('util'),
    validator = require('validator');
var ModelBase = require('./base');

const onePage = 30;

function Torrents(torrent) {
    ModelBase.call(this);

    if (torrent) {
        if (torrent._id) this._id = torrent._id;
        this.title = torrent.title;
        this.introduction = torrent.introduction;
        this.tags = torrent.tags;   //tags id
        this.bangumi_id = torrent.bangumi_id;
        //downloads
        //finished
        //leechers
        //seeders
        this.team_id = torrent.team_id;
        this.author = torrent.author;
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
