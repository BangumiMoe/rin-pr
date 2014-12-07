"use strict";

/**
 * controller/api/torrent.js
 * Rin prpr!
 *
 * torrent api controller
 */

var Models = require('./../../models'),
    Torrents = Models.Torrents;

var validator = require('validator');

module.exports = function (api) {

    api.get('/torrent/latest', function *(next) {
        this.body = [];
    });

};
