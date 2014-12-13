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
        var torrent = new Torrents();
        var t = yield torrent.getByInfoHash(td.infoHash);
        if (t) {
            var seeders = t.seeders,
                leechers = t.peers - t.seeders,
                completed = t.completed;
            if (leechers < 0) {
                // possible?
                leechers = 0;
            }
            yield torrent.update({ seeders: seeders, leechers: leechers, completed: completed });
            return this.body = { success: true };
        }
        this.status = 404;
    });

};
