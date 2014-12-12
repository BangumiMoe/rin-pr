"use strict";

/**
 * controller/download/torrent.js
 * Rin prpr!
 *
 * torrent download controller
 */

var Models = require('./../../models'),
    config = require('./../../config'),
    Torrents = Models.Torrents,
    Files = Models.Files;

var validator = require('validator');
var fs = require('fs');

module.exports = function (dl) {

    dl.get('/torrent/:torrent_id/:file_id/:filename', function *(next) {
        if (this.params && this.params.torrent_id && this.params.file_id) {
            var torrent_id = this.params.torrent_id;
            var file_id = this.params.file_id;
            if (validator.isMongoId(torrent_id) && validator.isMongoId(file_id)) {
                var file = yield downloadTorrent(file_id, torrent_id);
                if (file) {
                    this.type = 'application/x-bittorrent';
                    this.body = file;
                    return;
                }
            }
        }
        this.status = 404;
    });

};

var downloadTorrent = function *(file_id, torrent_id) {
    var torrent = new Torrents({ _id: torrent_id });
    var t = yield torrent.find();
    if (t.file_id == file_id) {
        var inc = yield torrent.dlCount();
        var fdata = yield new Files().find(file_id);
        return fs.readFileSync(config['sys'].public_dir + fdata.savepath);
    }
};
