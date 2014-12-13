"use strict";

/**
 * controller/api/tracker.js
 * Rin prpr!
 *
 * tracker api controller
 */

var Models = require('./../../models'),
    Torrents = Models.Torrents;

var config = require('./../../config'),
    validator = require('validator');

var ObjectID = require('mongodb').ObjectID;

module.exports = function (api) {

    api.post('/tracker/update', function *(next) {
        var td = this.request.body;
        if (td && td.infoHash && td.data) {
            var torrent = new Torrents();
            var infoHash = td.infoHash.toLowerCase();
            var t = yield torrent.getByInfoHash(infoHash);
            if (t) {
                var leechers = td.data.peers - td.data.seeds;
                if (leechers < 0) {
                    // possible?
                    leechers = 0;
                }
                var upd = {
                    seeders: td.data.seeds,
                    leechers: leechers
                };
                if (td.data.completed) {
                    upd.completed = t.completed + 1;
                }
                yield torrent.update(upd);
                this.body = { success: true };
                return;
            } else {
                this.body = { success: false };
                return;
            }
        }
        this.status = 404;
    });

};
