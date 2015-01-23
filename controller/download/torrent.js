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

var validator = require('validator'),
    generator = require('./../../lib/generator');
var fs = require('fs');

module.exports = function (dl) {

    dl.get('/torrent/:torrent_id/:filename', function *(next) {
        if (this.params && this.params.torrent_id) {
            var torrent_id = this.params.torrent_id;
            if (validator.isMongoId(torrent_id)) {
                var file = yield downloadTorrent(torrent_id);
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

var downloadTorrent = function *(torrent_id) {
    var torrent = new Torrents({ _id: torrent_id });
    var t = yield torrent.find();
    if (t.file_id) {
        var inc = yield torrent.downloadCount();
        var fdata = yield new Files().find(t.file_id);
        if (fdata) {
            var fread = generator.create('readFile', fs.readFile, fs);
            return yield fread(config['sys'].public_dir + fdata.savepath);
        }
    }
    return null;
};
