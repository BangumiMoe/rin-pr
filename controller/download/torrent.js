"use strict";

/**
 * controller/download/torrent.js
 * Rin prpr!
 *
 * torrent download controller
 */

var Models = require('./../../models'),
    Torrents = Models.Torrents,
    Files = Models.Files;

var validator = require('validator');

module.exports = function (dl) {

    dl.get('/torrent/:torrent_id', function *(next) {
        if (this.params && this.params.torrent_id) {
            var ts = this.params.torrent_id.split('.');
            if (ts.length === 1 || (ts.length === 2 && ts[1] === 'torrent')) {
                if (validator.isMongoId(ts[0])) {
                    var torrent = new Torrents({_id: ts[0]});
                    var t = yield torrent.find();
                    if (t) {
                        var f = yield new Files({_id: t.file_id}).find();
                        if (f) {
                            //TODO: use $inc
                            yield torrent.dlCount();
                            this.redirect('/' + f.savepath);
                            return;
                        }
                    }
                }
            }
        }
        this.status = 404;
    });

};
