"use strict";

/**
 * controller/api/torrent.js
 * Rin prpr!
 *
 * torrent api controller
 */

var Models = require('./../../models'),
    Files = Models.Files,
    Teams = Models.Teams,
    Torrents = Models.Torrents;

var config = require('./../../config'),
    validator = require('validator'),
    xss = require('./../../lib/xss');

var ObjectID = require('mongodb').ObjectID;

var fs = require('fs');

module.exports = function (api) {

    api.get('/torrent/latest', function *(next) {
        var t = new Torrents();
        var r = {
          page: yield t.getPageCount(),
          torrents: yield t.getByPage(1)
        };
        this.body = r;
    });

    api.get('/torrent/page/:pagenum', function *(next) {
        var pageNum = parseInt(this.params.pagenum);
        var r = {
          torrents: yield new Torrents().getByPage(pageNum)
        };
        this.body = r;
    });

    api.post('/torrent/add', function *(next) {
        if (this.user && this.user.isActive()) {
            var body = this.request.body;
            var files = this.request.files;
            if (body.title) {
                body.title = validator.trim(body.title);
            }
            if (body.introduction) {
                body.introduction = xss(body.introduction);
            }
            var tag_ids = [];
            if (body.tag_ids) {
                //TODO: check Array
                body.tag_ids = body.tag_ids.split(',');
                body.tag_ids.forEach(function (tag_id) {
                    if (validator.isMongoId(tag_id)) {
                        tag_ids.push(new ObjectID(tag_id));
                    }
                });
            }
            if (body && body.title && body.introduction
                && body.title.length <= 128
                && files && files.file) {
                var f = new Files();
                f.load('torrent', files.file, this.user._id);
                if (f.valid()) {
                    var pt = yield Torrents.parseTorrent(files.file.savepath);
                    if (pt && pt.files.length > 0) {
                        var cf = yield f.save();
                        if (cf) {
                            var tc = [];
                            pt.files.forEach(function (ptf) {
                                tc.push(ptf.path);
                            });

                            var nt = {
                                title: body.title,
                                introduction: body.introduction,
                                uploader_id: this.user._id,
                                file_id: cf._id,
                                content: tc,
                                magnet: Torrents.generateMagnet(pt.infoHash),
                                infoHash: pt.infoHash
                            };
                            if (body.inteam && this.user.team_id) {
                                var team = new Teams({_id: this.user.team_id});
                                if (yield team.find()) {
                                    nt.team_id = this.user.team_id;
                                    tag_ids.push(new ObjectID(team.tag_id));
                                }
                            }
                            nt.tag_ids = tag_ids;
                            var t = new Torrents(nt);
                            var torrent = yield t.save();
                            if (torrent) {
                                Torrents.addToTrackerWhitelist(pt.infoHash);
                                this.body = { success: true, torrent: torrent };
                                return;
                            }
                        }
                    }
                }
            }
        }
        this.body = { success: false };
    });

    api.post('/torrent/search', function *(next) {
        var tag_id = this.request.body.tag_id;
        if (tag_id instanceof Array) {
            this.body = yield new Torrents().getByTags(tag_id);
        } else if (validator.isMongoId(tag_id)) {
            this.body = yield new Torrents().getByTags([tag_id]);
        } else {
            this.body = [];
        }
    });

    /*
    api.post('/torrent/download', function *(next) {
        var torrent_id = this.request.body.torrent._id,
            file_id = this.request.body.torrent.file_id;
        if (validator.isMongoId(torrent_id) && validator.isMongoId(file_id)) {
            var file = yield downloadTorrent(file_id, torrent_id);
            if (file) {
                this.type = 'application/x-bittorrent';
                this.body = file;
                return;
            }
        }
        this.status = 404;
    });
    */

};
