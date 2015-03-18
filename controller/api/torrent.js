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
    RssCollections = Models.RssCollections,
    Torrents = Models.Torrents;

var config = require('./../../config'),
    validator = require('validator'),
    filesize = require('filesize'),
    common = require('./../../lib/common'),
    _ = require('underscore'),
    xss = require('./../../lib/xss'),
    TeamSync = require('./../../lib/teamsync');

var ObjectID = require('mongodb').ObjectID;

var fs = require('fs');

module.exports = function (api) {

    api.get('/torrent/latest', function *(next) {
        var t = new Torrents();
        var pageCount = yield t.getPageCount();
        var r = {
          //deprecated page: pageCount,
          page_count: pageCount,
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
            var p = 1;
            if (this.query && this.query.p) {
              p = parseInt(this.query.p);
              if (p <= 0) {
                p = 1;
              }
            }
            var t = new Torrents();
            var r = {
              torrents: yield t.getByUser(this.user._id, p)
            };
            if (p == 1) {
              r.page_count = yield t.getPageCountByUser(this.user._id);
            }
            this.body = r;
            return;
        }
        this.body = {};
    });

    api.get('/torrent/team', function *(next) {
        if (this.user && this.user.isActive()) {
            if (this.query && this.query.team_id
              && validator.isMongoId(this.query.team_id)) {
              var team_id = this.query.team_id;
              var p = 1;
              if (this.query.p) {
                p = parseInt(this.query.p);
                if (p <= 0) {
                  p = 1;
                }
              }

              var t = new Torrents();
              var r = {
                torrents: yield t.getByTeam(team_id, p)
              };
              if (p == 1) {
                r.page_count = yield t.getPageCountByTeam(team_id);
              }
              this.body = r;
              return;
            }
        }
        this.body = {};
    });

    api.get('/torrent/collections', function *(next) {
        var ts = [];
        if (this.user && this.user.isActive()) {
            var rc = yield new RssCollections().findByUserId(this.user._id);
            if (rc && rc.collections) {
                var torrent = new Torrents();
                ts = yield torrent.getByTagCollections(rc._id, rc.collections, 15);
            }
        }
        this.body = ts;
    });

    api.post('/torrent/add', function *(next) {
        var r = { success: false };
        if (this.user && this.user.isActive()) {
            var body = this.request.body;
            var files = this.request.files;
            if (!(body.category_tag_id && validator.isMongoId(body.category_tag_id))) {
                body.category_tag_id = null;
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
                    tag_ids.push(tag_id);
                }
            });
            if (body && body.category_tag_id
                && body.title && body.introduction
                && body.title.length <= 128
                && body.introduction.length <= 32768
                && files && files.file) {
                var f = new Files();
                f.load('torrent', files.file, this.user._id);
                if (f.valid()) {
                    var pt = yield Torrents.parseTorrent(files.file.savepath);
                    // pt is an array? callback ooops
                    if (pt instanceof Array) {
                        pt = pt[0];
                    }
                    if (pt && !Torrents.checkAnnounce(pt.announce)) {
                        r.message = 'not contains specified announce';
                        pt = null;
                    }
                    if (pt) {
                        //check same torrent
                        if (pt.infoHash) {
                            var to = yield new Torrents().getByInfoHash(pt.infoHash);
                            if (to && to._id) {
                                r.message = 'torrent same as ' + to._id;
                                pt = null;
                            }
                        } else {
                            pt = null;
                        }
                    }
                    if (pt && pt.files.length > 0) {
                        if (yield common.ipflowcontrol('addtorrent', this.ip, 3)) {
                            this.body = {success: false, message: 'too frequently'};
                            return;
                        }
                        var cf = yield f.save();
                        if (cf) {
                            var tc = [];
                            pt.files.forEach(function (ptf) {
                                tc.push([ptf.path, filesize(ptf.length)]);
                            });

                            var nt = {
                                category_tag_id: body.category_tag_id,
                                title: body.title,
                                introduction: body.introduction,
                                uploader_id: this.user._id,
                                file_id: cf._id,
                                content: tc,
                                magnet: Torrents.generateMagnet(pt.infoHash),
                                infoHash: pt.infoHash,
                                size: filesize(pt.length)
                            };
                            var tmpInfo = {};
                            if (body.team_id && validator.isMongoId(body.team_id)) {
                                var team = new Teams({_id: body.team_id});
                                var tt = yield team.find();
                                if (tt && tt.approved && team.isMemberUser(this.user._id)) {
                                    tmpInfo.team = tt;
                                    nt.team_id = new ObjectID(body.team_id);
                                    if (team.tag_id) {
                                      if (tag_ids.indexOf(team.tag_id.toString()) < 0) {
                                        tag_ids.push(team.tag_id.toString());
                                      }
                                    }
                                    if (body.teamsync) {
                                        var ena = yield new TeamAccounts().enableSync(nt.team_id);
                                        if (ena) {
                                            nt.teamsync = true;
                                        }
                                    }
                                }
                            }
                            tag_ids.push(body.category_tag_id);
                            tag_ids = _.uniq(tag_ids);
                            nt.tag_ids = _.map(tag_ids, function (tag_id) {
                                return new ObjectID(tag_id);
                            });
                            var t = new Torrents(nt);
                            var torrent = yield t.save();
                            if (torrent) {
                                Torrents.addToTrackerWhitelist(pt.infoHash);
                                if (nt.teamsync) {
                                    //do sync job
                                    TeamSync(tmpInfo.team, torrent, cf.savepath, body.category_tag_id);
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
            if (!(body._id && validator.isMongoId(body._id))) {
                this.body = { success: false };
                return;
            }
            var canedit = false;
            var torrent = new Torrents({_id: body._id});
            var t = yield torrent.find()
            if (t) {
                canedit = (t.uploader_id.toString() == this.user._id) || this.user.isStaff();
                if (!canedit && t.team_id) {
                    var team = new Teams();
                    var _t = yield team.find(t.team_id);
                    if (_t && team.isAdminUser(this.user._id)) {
                        canedit = true;
                    }
                }
            }
            if (!canedit) {
                this.body = { success: false };
                return;
            }

            if (!(body.category_tag_id && validator.isMongoId(body.category_tag_id))) {
                body.category_tag_id = null;
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
                    tag_ids.push(tag_id);
                }
            });
            if (body && body.category_tag_id
                && body.title && body.introduction
                && body.title.length <= 128
                && body.introduction.length <= 32768) {
                var nt = {
                    introduction: body.introduction
                };
                if (torrent.category_tag_id.toString() != body.category_tag_id) {
                    nt.category_tag_id = new ObjectID(body.category_tag_id);
                }
                if (torrent.title != body.title) {
                    nt.title = body.title;
                    nt.titleIndex = Torrents.makeIndexArray(body.title);
                }
                if (body.team_id && validator.isMongoId(body.team_id)
                    && this.user._id.toString() == t.uploader_id) {
                    var team = new Teams({_id: body.team_id});
                    var _t = yield team.find();
                    if (_t && _t.approved && team.isMemberUser(this.user._id)) {
                        nt.team_id = new ObjectID(body.team_id);
                        if (team.tag_id) {
                          if (tag_ids.indexOf(team.tag_id.toString()) < 0) {
                            tag_ids.push(team.tag_id.toString());
                          }
                        }
                    }
                }
                tag_ids.push(body.category_tag_id);
                tag_ids = _.uniq(tag_ids);
                nt.tag_ids = _.map(tag_ids, function (tag_id) {
                    return new ObjectID(tag_id);
                });
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
                    var candel = (t.uploader_id.toString() == this.user._id) || this.user.isStaff();
                    if (!candel && t.team_id) {
                        var team = new Teams();
                        var _t = yield team.find(t.team_id);
                        if (_t && team.isAdminUser(this.user._id)) {
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
      if (this.request.body) {
        var body = this.request.body;
        var tag_id = body.tag_id;
        var p = 1;
        if (body.p) {
          p = parseInt(body.p);
          if (p <= 0) {
            p = 1;
          }
        }
        if (tag_id instanceof Array) {
          if (validator.isMongoIdArray(tag_id)) {
            var torrent = new Torrents();
            var r = {
                torrents: yield torrent.getByTags(tag_id)
            };
            if (p == 1) {
                if (r.torrents.length < 30) {
                    r.count = r.torrents.length;
                } else {
                    r.count = yield torrent.getCountByTags(tag_id);
                }
                r.page_count = Math.ceil(r.count / 30);
            }
            this.body = r;
          } else {
            this.body = [];
          }
        } else if (validator.isMongoId(tag_id)) {
          if (body.type == 'tag') {
            var torrent = new Torrents();
            var r = {
              torrents: yield torrent.getByTag(tag_id, p)
            };
            if (p == 1) {
              r.page_count = yield torrent.getPageCountByTag(tag_id);
            }
            this.body = r;
          } else {
            this.body = yield new Torrents().getByTags([tag_id]);
          }
        } else {
            this.body = [];
        }
      }
    });

    api.post('/torrent/search/title', function *(next) {
        if (this.request.body) {
            var body = this.request.body;
            if (body.title && typeof body.title == 'string') {
                body.title = validator.trim(body.title);
                var p = 1;
                if (body.p) {
                  p = parseInt(body.p);
                  if (p <= 0) {
                    p = 1;
                  }
                }
                if (body.title) {
                    var torrent = new Torrents();
                    var r = {
                        torrents: yield torrent.getByTitle(body.title)
                    };
                    if (p == 1) {
                        if (r.torrents.length < 30) {
                            r.count = r.torrents.length;
                        } else {
                            r.count = yield torrent.getCountByTitle(body.title);
                        }
                        r.page_count = Math.ceil(r.count / 30);
                    }
                    this.body = r;
                    return;
                }
            }
        }
        this.body = [];
    });

    api.post('/torrent/fetch', function *(next) {
        var body = this.request.body;
        if (body) {
            if (body._ids && validator.isMongoIdArray(body._ids)) {
                this.body = yield new Torrents().find(body._ids);
                return;
            } else if (body._id && validator.isMongoId(body._id)) {
                this.body = yield new Torrents().find(body._id);
                return;
            }
        }
        this.body = '';
    });

    api.post('/torrent/suggest', function *(next) {
        var body = this.request.body;
        if (this.user && body && body.title) {
            var team_id;
            if (body.team_id) {
                team_id = body.team_id;
            }
            this.body = yield new Torrents().getSuggest(body.title, this.user._id, team_id);
            return;
        }
        this.body = {};
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
