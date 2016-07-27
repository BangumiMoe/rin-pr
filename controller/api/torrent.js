"use strict";

/**
 * controller/api/torrent.js
 * Rin prpr!
 *
 * torrent api controller
 */

var Models = require('./../../models'),
    Files = Models.Files,
    Users = Models.Users,
    Teams = Models.Teams,
    Tags = Models.Tags,
    TeamAccounts = Models.TeamAccounts,
    RssCollections = Models.RssCollections,
    QueryArchives = Models.QueryArchives,
    Archives = Models.Archives,
    Torrents = Models.Torrents;

var config = require('./../../config'),
    validator = require('validator'),
    filesize = require('filesize'),
    common = require('./../../lib/common'),
    _ = require('underscore'),
    xss = require('./../../lib/xss'),
    getinfo = require('./../../lib/getinfo'),
    TeamSync = require('./../../lib/teamsync');

var ObjectID = require('mongodb').ObjectID;

var fs = require('fs');

function get_page_params(page, limit) {
  var p = 1;
  if (page) {
    p = parseInt(page);
    if (!p || p <= 0) {
      p = 1;
    }
  }
  var limit = parseInt(limit);
  if (!limit || limit <= 0 || limit > Torrents.MAX_LIMIT) {
    limit = Torrents.DEF_LIMIT;
  }
  return {
    page: p,
    limit: limit
  };
}

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
        var t = new Torrents();
        var pageCount = yield t.getPageCount();
        var pageNum = parseInt(this.params.pagenum);
        var r = {
          page_count: pageCount,
          torrents: []
        };
        if (pageNum > 0 && pageNum <= pageCount) {
          r.torrents = yield t.getByPage(pageNum);
        }
        this.body = r;
    });

    api.get('/v2/torrent/page/:pagenum', function *(next) {
        var params = get_page_params(this.params.pagenum, this.query.limit);
        var t = new Torrents();
        var page = params.page - 1;
        var k = 'page-v2-' + params.limit + '/' + page;
        var r = yield t.cache.get(k);
        if (r == null) {
          var pageCount = yield t.getPageCount(params.limit);
          r = {
            page_count: pageCount,
            torrents: []
          };
          if (params.page > 0 && params.page <= pageCount) {
            var torrents = yield t.getByPageV2(params.page, params.limit);
            yield getinfo.get_torrents_info(torrents);
            r.torrents = torrents;
          }
          yield t.cache.set(k, r);
        }
        this.body = r;
    });

    api.get('/v2/torrent/user/:user_id', function *(next) {
      var userId = this.params.user_id;
      var r = {};
      if (userId && validator.isMongoId(userId)) {
        var params = get_page_params(this.query.p, this.query.limit);
        var page = params.page - 1;
        var k = 'user-v2-' + params.limit + '/' + userId.toString() + '/' + page;
        var t = new Torrents();
        r = yield t.cache.get(k);
        if (r === null) {
          var pageCount = yield t.getPageCountByUser(userId, params.limit);
          r = {
            page_count: pageCount,
            torrents: []
          };
          if (params.page > 0 && params.page <= pageCount) {
            var torrents = yield t.getByUser(userId, params.page, params.limit);
            yield getinfo.get_torrents_info(torrents);
            r.torrents = torrents;
          }
          yield t.cache.set(k, r);
        }
      }
      this.body = r;
    });

    api.get('/v2/torrent/team/:team_id', function *(next) {
      var teamId = this.params.team_id;
      var r = {};
      if (teamId && validator.isMongoId(teamId)) {
        var params = get_page_params(this.query.p, this.query.limit);
        var page = params.page - 1;
        var k = 'team-v2-' + params.limit + '/' + teamId.toString() + '/' + page;
        var t = new Torrents();
        r = yield t.cache.get(k);
        if (r === null) {
          var pageCount = yield t.getPageCountByTeam(teamId, params.limit);
          r = {
            page_count: pageCount,
            torrents: []
          };
          if (params.page > 0 && params.page <= pageCount) {
            var torrents = yield t.getByTeam(teamId, params.page, params.limit);
            yield getinfo.get_torrents_info(torrents);
            r.torrents = torrents;
          }
          yield t.cache.set(k, r);
        }
      }
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

    function *new_torrent(user, body, tag_ids, pt, file_id, savepath, torrent_filename) {
      var tc = getinfo.torrent_content_filter(pt.files);
      var nt = {
          category_tag_id: body.category_tag_id,
          title: body.title,
          introduction: body.introduction,
          uploader_id: user._id,
          file_id: file_id,
          content: tc,
          magnet: Torrents.generateMagnet(pt.infoHash),
          infoHash: pt.infoHash,
          size: filesize(pt.length),
          btskey: body.btskey
      };
      var tmpInfo = {};
      if (body.team_id && validator.isMongoId(body.team_id)) {
          var team = new Teams({_id: body.team_id});
          var tt = yield team.find();
          if (tt && tt.approved && team.isMemberUser(user._id)) {
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
      var stag_ids = _.map(tag_ids, function (tag_id) {
          return tag_id.toString();
      });
      stag_ids = _.uniq(stag_ids);
      nt.tag_ids = _.map(stag_ids, function (tag_id) {
          return new ObjectID(tag_id);
      });
      var t = new Torrents(nt);
      var torrent = yield t.save();
      if (torrent) {
          Torrents.addToTrackerWhitelist(pt.infoHash);
          if (nt.teamsync) {
              //do sync job
              TeamSync(tmpInfo.team, torrent, savepath, body.category_tag_id, torrent_filename);
          }
          return torrent;
      }
      return null;
    }

    api.post('/torrent/add', function *(next) {
        var r = { success: false };
        if (this.user && this.user.isActive() && !this.user.isBan()) {
            var body = this.request.body;
            var files = this.request.files;
            if (validator.isAlphanumeric(body.btskey) && body.btskey !== 'undefined') {
                body.btskey += '';
            } else {
                body.btskey = '';
            }
            if (!(body.category_tag_id && validator.isMongoId(body.category_tag_id))) {
                body.category_tag_id = null;
            }
            if (!(body.file_id && validator.isMongoId(body.file_id))) {
                body.file_id = null;
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
                && ((files && files.file) || body.file_id)) {

              var pt, f, torrent_file;

              if (body.file_id) {
                torrent_file = yield new Files().find(body.file_id);
                if (torrent_file && torrent_file.savepath) {
                  pt = yield Torrents.parseTorrent(config['sys'].public_dir + torrent_file.savepath);
                }
              } else {
                f = new Files();
                f.load('torrent', files.file, this.user._id);
                if (f.valid()) {
                  pt = yield Torrents.parseTorrent(files.file.savepath);
                }
              }
              // pt is an array? callback ooops
              if (pt instanceof Array) {
                  pt = pt[0];
              }
              if (!body.file_id) {
                if (pt && !(yield Torrents.checkAndUpdateAnnounce(pt.announce, files.file.savepath))) {
                    r.message = 'torrent announce check or update failed';
                    pt = null;
                }
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
              var torrent_filename;
              if (pt && pt.files.length > 0) {
                  var savepath;
                  if (!body.file_id) {
                    // limit only in upload
                    if (yield common.ipflowcontrol('addtorrent', this.ip, 5)) {
                        this.body = {success: false, message: 'too frequently'};
                        return;
                    }
                    // change filename to torrent's infohash
                    f.setFilename(pt.infoHash.toLowerCase());
                    var cf = yield f.save();
                    if (cf) {
                      //if (cf.ops) cf = cf.ops[0];
                      body.file_id = cf._id;
                      savepath = cf.savepath;
                      torrent_filename = cf.filename;
                    }
                  } else {
                    savepath = torrent_file.savepath;
                    torrent_filename = torrent_file.filename;
                  }
                  if (body.file_id) {
                      var rtorrent = yield new_torrent(this.user, body, tag_ids, pt, body.file_id, savepath, torrent_filename);
                      if (rtorrent) {
                        this.body = { success: true, torrent: rtorrent };
                        return;
                      } else {
                        r.message = 'torrent save failed';
                      }
                  }
              }
            }
        }
        this.body = r;
    });

    api.post('/v2/torrent/upload', function *(next) {
      var r = { success: false };
      if (this.user && this.user.isActive() && !this.user.isBan()) {
        var body = this.request.body;
        var files = this.request.files;
        if (files && files.file) {
          var f = new Files();
          f.load('torrent', files.file, this.user._id);
          if (f.valid()) {
              var pt = yield Torrents.parseTorrent(files.file.savepath);
              // pt is an array? callback ooops
              if (pt instanceof Array) {
                  pt = pt[0];
              }
              if (pt && !(yield Torrents.checkAndUpdateAnnounce(pt.announce, files.file.savepath))) {
                  r.message = 'torrent announce check or update failed';
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
                  if (yield common.ipflowcontrol('addtorrent', this.ip, 5)) {
                      this.body = {success: false, message: 'too frequently'};
                      return;
                  }
                  // change filename to torrent's infohash
                  f.setFilename(pt.infoHash.toLowerCase());
                  var cf = yield f.save();
                  if (cf) {
                      var tc = getinfo.torrent_content_filter(pt.files);

                      var team_id;
                      var t = new Torrents();
                      if (body.team_id && validator.isMongoId(body.team_id)) {
                          team_id = body.team_id;
                      }
                      r.success = true;
                      r.file_id = cf._id;
                      r.content = tc;
                      r.torrents = yield t.getSuggestByFiles(tc, this.user._id, team_id);
                      if (r.torrents.length > 0) {
                        yield getinfo.get_torrents_info(r.torrents, true);
                      }
                  }
              }
          }
        }
      }
      this.body = r;
    });

    api.post('/v2/torrent/add', function *(next) {
      var r = { success: false };
      if (this.user && this.user.isActive() && !this.user.isBan()) {
          var body = this.request.body;
          if (body.title && typeof body.title == 'string') {
              body.title = validator.trim(body.title);
          } else {
              body.title = '';
          }
          if (!(body.templ_torrent_id && validator.isMongoId(body.templ_torrent_id))) {
              body.templ_torrent_id = null;
          }
          if (!(body.file_id && validator.isMongoId(body.file_id))) {
              body.file_id = null;
          }
          if (!(body.team_id && validator.isMongoId(body.team_id))) {
              body.team_id = null;
          }
          if (body && body.file_id
              && body.title && body.templ_torrent_id
              && body.title.length <= 128) {
            var t = new Torrents();
            var templ_torrent = yield t.find(body.templ_torrent_id);
            var torrent_file = yield new Files().find(body.file_id);
            if (!(templ_torrent && templ_torrent._id)
                || !(torrent_file && torrent_file.savepath)) {
              r.message = 'Can\'t find out the template torrent post or the torrent file';
            } else {
              var pt = yield Torrents.parseTorrent(config['sys'].public_dir + torrent_file.savepath);
              // pt is an array? callback ooops
              if (pt instanceof Array) {
                  pt = pt[0];
              }
              if (pt) {
                  //check same torrent
                  if (pt.infoHash) {
                      var to = yield t.getByInfoHash(pt.infoHash);
                      if (to && to._id) {
                          r.message = 'torrent same as ' + to._id;
                          pt = null;
                      }
                  } else {
                      pt = null;
                  }
              }
              if (pt && pt.files.length > 0) {
                var tc = getinfo.torrent_content_filter(pt.files);

                templ_torrent.title = body.title;
                templ_torrent.team_id = body.team_id;
                templ_torrent.teamsync = !!body.teamsync;
                var savepath = torrent_file.savepath;
                var rtorrent = yield new_torrent(this.user, templ_torrent, templ_torrent.tag_ids, pt, torrent_file._id, savepath, torrent_file.filename);
                if (rtorrent) {
                  yield getinfo.get_torrent_info(rtorrent);
                  this.body = { success: true, torrent: rtorrent };
                  return;
                } else {
                  r.message = 'torrent save failed';
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
            var t = yield torrent.find();
            if (t) {
                canedit = (t.uploader_id.toString() == this.user._id) || this.user.isStaff();
                if (!canedit && t.team_id) {
                    var team = new Teams();
                    var _t = yield team.find(t.team_id);
                    if (_t && (team.isAdminUser(this.user._id) || team.isEditorUser(this.user._id))) {
                        canedit = true;
                    }
                }
            }
            if (!canedit) {
                this.body = { success: false };
                return;
            }

            if (validator.isAlphanumeric(body.btskey) && body.btskey !== 'undefined') {
                body.btskey += '';
            } else {
                body.btskey = '';
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
                    introduction: body.introduction,
                    btskey: body.btskey
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
                } else if (this.user._id.toString() == t.uploader_id) {
                  nt.team_id = null;
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
                        if (_t && (team.isAdminUser(this.user._id) || team.isEditorUser(this.user._id))) {
                            candel = true;
                        }
                    }
                    if (candel) {
                        //TODO: del torrent file and remove from whitelist
                        var archive = new Archives({
                            type: 'torrent',
                            user_id: this.user._id,
                            data: t
                        });
                        yield archive.save();

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
                torrents: yield torrent.getByTags(tag_id, p)
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
                        torrents: yield torrent.getByTitle(body.title, p)
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
        this.body = {};
    });

    api.get('/v2/torrent/search', function *(next) {
      //if (this.request.body) {
      if (this.query) {
        var body = this.query;
        if (body.query && typeof body.query == 'string') {
          body.query = validator.trim(body.query);
          if (body.query) {
            // 20 queries max in one minute or 30 queries max for users
            var limitkey = 'hybridsearch';
            var limitcount = 20;
            if (this.user) {
              limitkey += '/' + this.user._id.toString();
              limitcount = 30;
            }
            if (yield common.ipflowcontrol(limitkey, this.ip, limitcount)) {
              this.body = {success: false, message: 'too frequently'};
              return;
            }

            var params = get_page_params(this.query.p, this.query.limit);
            var r = yield new Torrents().hybridSearch(body.query, params.page, params.limit);
            if (r.count > 0) {
              yield getinfo.get_torrents_info(r.torrents);
            }
            // Save query keyword for future suggestions
            var qa = new QueryArchives({query: body.query});
            yield qa.save();
            r.success = true;
            this.body = r;
            return;
          }
        }
      }
      this.body = {};
    });

    api.get('/v2/torrent/suggest', function *(next) {
      function *fetchTags(q){
        var tag_ids = [];
        var tags = [];
        var patterns = common.parse_search_query_patterns(q);
        if (patterns.length > 0) {
          for (var i = 0; i < patterns.length; i++) {
            var pat = patterns[i];
            var inq;
            if (pat.in_tag) {
              _.map(pat.words, function (tag_id) {
                tag_ids.push(tag_id);
              });
            }
          }
        }
        _.uniq(tag_ids);
        return yield new Tags().find(tag_ids);
      }

      if (this.query) {
        var body = this.query;
        if (body.query && typeof body.query == 'string') {
          body.query = validator.trim(body.query);
          if (body.query) {
            var results = yield new QueryArchives().getSuggestions(body.query, 5);
            // Populate result with result count and tag_ids
            var i = results.length;
            while(i--){
              results[i].query = results[i]._id; // Query must be in _id for aggregation but looks weired
              delete results[i]._id;
              var searchRes = yield new Torrents().hybridSearch(results[i].query, 1);
              if (searchRes.count) {
                results[i].count = searchRes.count;
                var tags = yield fetchTags(results[i].query);
                if(tags.length > 0){
                  results[i].tags = tags;
                }
                delete results[i].weight; // Unneeded because already sorted
              }else{
                results.splice(i,1); // Delete if no results found
              }
            }
            this.body = results;
            return;
          }
        }
      }
      this.body = {};
    });

    api.get('/v2/torrent/:torrent_id', function *(next) {
      var torrent = {};
      if (validator.isMongoId(this.params.torrent_id)) {
        var torrent_id = this.params.torrent_id;
        var t = new Torrents();

        // read from cache
        var r = yield t.cache.get('id-v2/' + torrent_id);
        if (r !== null) {
          this.body = r;
          return;
        }

        torrent = yield t.find(torrent_id);
        yield getinfo.get_torrent_info(torrent);
      }
      yield t.cache.set('id-v2/' + torrent_id, torrent);
      this.body = torrent;
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
