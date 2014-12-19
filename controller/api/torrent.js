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
    TeamAccounts = Models.TeamAccounts,
    Torrents = Models.Torrents;

var config = require('./../../config'),
    validator = require('validator'),
    readTorrent = require('read-torrent'),
    xss = require('./../../lib/xss'),
    TeamSync = require('./../../lib/teamsync');

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

    api.get('/torrent/my', function *(next) {
        if (this.user && this.user.isActive()) {
            var t = new Torrents();
            var r = {
              torrents: yield t.getByUser(this.user._id)
            };
            this.body = r;
            return;
        }
        this.body = {};
    });

    api.get('/torrent/team', function *(next) {
        if (this.user && this.user.isActive() && this.user.team_id) {
            var t = new Torrents();
            var r = {
              torrents: yield t.getByTeam(this.user.team_id)
            };
            this.body = r;
            return;
        }
        this.body = {};
    });

    api.post('/torrent/add', function *(next) {
        var r = { success: false };
        if (this.user && this.user.isActive()) {
            var body = this.request.body;
            var files = this.request.files;
            if (body.title && typeof body.title == 'string') {
                body.title = validator.trim(body.title);
            } else {
                body.title = '';
            }
            if (body.introduction && typeof body.introduction == 'string') {
                body.introduction = xss(body.introduction);
            } else {
                body.introduction = '';
            }
            var tag_ids = [];
            if (typeof body.tag_ids == 'string') {
                body.tag_ids = body.tag_ids.split(',');
            } else if (!(body.tag_ids instanceof Array)) {
                body.tag_ids = [];
            }
            body.tag_ids.forEach(function (tag_id) {
                if (validator.isMongoId(tag_id)) {
                    tag_ids.push(new ObjectID(tag_id));
                }
            });
            if (body && body.title && body.introduction
                && body.title.length <= 128
                && body.introduction.length <= 32768
                && files && files.file) {
                var f = new Files();
                f.load('torrent', files.file, this.user._id);
                if (f.valid()) {
                    var pt = yield Torrents.parseTorrent(files.file.savepath);
                    if (pt && !Torrents.checkAnnounce(pt.announce)) {
                        r.message = 'not contains specified announce';
                        pt = null;
                    }
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
                            var tmpInfo = {};
                            if (body.inteam && this.user.team_id) {
                                var team = new Teams({_id: this.user.team_id});
                                var tt = yield team.find();
                                if (tt) {
                                    tmpInfo.team = tt;
                                    nt.team_id = this.user.team_id;
                                    if (tag_ids.indexOf(team.tag_id) < 0) {
                                        tag_ids.push(new ObjectID(team.tag_id));
                                    }
                                    if (body.teamsync) {
                                        var ena = yield new TeamAccounts().enableSync(nt.team_id);
                                        if (ena) {
                                            nt.teamsync = true;
                                        }
                                    }
                                }
                            }
                            nt.tag_ids = tag_ids;
                            var t = new Torrents(nt);
                            var torrent = yield t.save();
                            if (torrent) {
                                Torrents.addToTrackerWhitelist(pt.infoHash);
                                if (nt.teamsync) {
                                    //do sync job
                                    TeamSync(tmpInfo.team, torrent, cf.savepath);
                                }
                                this.body = { success: true, torrent: torrent };
                                return;
                            }
                        }
                    }
                }
            }
        }
        this.body = r;
    });

    api.post('/torrent/update', function *(next) {
        if (this.user && this.user.isActive()) {
            var body = this.request.body;
            if (!body._id && validator.isMongoId(body._id)) {
                this.body = { success: false };
                return;
            }
            var canedit = false;
            var torrent = new Torrents({_id: body._id});
            var t = yield torrent.find()
            if (t) {
                canedit = (t.uploader_id.toString() == this.user._id) || this.user.isAdmin();
                if (!canedit && t.team_id.toString() == this.user.team_id) {
                    var team = yield new Teams().find(this.user.team_id);
                    if (team.admin_id == this.user._id) {
                        canedit = true;
                    }
                }
            }
            if (!canedit) {
                this.body = { success: false };
                return;
            }

            if (body.title && typeof body.title == 'string') {
                body.title = validator.trim(body.title);
            } else {
                body.title = '';
            }
            if (body.introduction && typeof body.introduction == 'string') {
                body.introduction = xss(body.introduction);
            } else {
                body.introduction = '';
            }
            var tag_ids = [];
            if (typeof body.tag_ids == 'string') {
                body.tag_ids = body.tag_ids.split(',');
            } else if (!(body.tag_ids instanceof Array)) {
                body.tag_ids = [];
            }
            body.tag_ids.forEach(function (tag_id) {
                if (validator.isMongoId(tag_id)) {
                    tag_ids.push(new ObjectID(tag_id));
                }
            });
            if (body && body.title && body.introduction
                && body.title.length <= 128
                && body.introduction.length <= 32768) {
                var nt = {
                    title: body.title,
                    introduction: body.introduction
                };
                if (body.inteam && this.user.team_id) {
                    var team = new Teams({_id: this.user.team_id});
                    if (yield team.find()) {
                        nt.team_id = this.user.team_id;
                        if (tag_ids.indexOf(team.tag_id) < 0) {
                            tag_ids.push(new ObjectID(team.tag_id));
                        }
                    }
                }
                nt.tag_ids = tag_ids;
                t = yield torrent.update(nt);
                //, torrent: torrent.valueOf()
                if (t) {
                    this.body = { success: true };
                    return;
                }
            }
        }
        this.body = { success: false };
    });

    api.post('/torrent/remove', function *(next) {
        if (this.user) {
            var body = this.request.body;
            if (body && validator.isMongoId(body._id)) {
                var torrent = new Torrents();
                var t = yield torrent.find(body._id);
                if (t) {
                    var candel = (t.uploader_id.toString() == this.user._id) || this.user.isAdmin();
                    if (!candel && t.team_id.toString() == this.user.team_id) {
                        var team = yield new Teams().find(this.user.team_id);
                        if (team.admin_id == this.user._id) {
                            candel = true;
                        }
                    }
                    if (candel) {
                        //TODO: del torrent file and remove from whitelist
                        var r = yield torrent.remove();
                        if (r) {
                            this.body = { success: true };
                            return;
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

    api.post('/torrent/search/title', function *(next) {
        if (this.request.body) {
            var body = this.request.body;
            if (body.title && typeof body.title == 'string') {
                body.title = validator.trim(body.title);
                if (body.title) {
                    this.body = yield new Torrents().getByTitle(body.title);
                    return;
                }
            }
        }
        this.body = [];
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
