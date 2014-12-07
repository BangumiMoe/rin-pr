
var util = require('util'),
    validator = require('validator');
var ModelBase = require('./base');

function Torrents(torrent) {
    ModelBase.call(this);

    if (torrent) {
        if (torrent._id) this._id = torrent._id;
        this.title = torrent.title;
    }
}

util.inherits(Torrents, ModelBase);

Torrents.prototype.set = function (t) {
    if (t) {
        this._id = t._id;
        this.title = t.title;
    } else {
        this._id = this.title = undefined;
    }
    return u;
};

Torrents.prototype.valueOf = function () {
    return {
        _id: this._id,
        title: this.title,
    };
};

module.exports = Torrents;

ModelBase.register('torrent', Torrents);
