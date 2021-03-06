"use strict";

/**
 * controller/api/bangumi.js
 * Rin prpr!
 *
 * bangumi api controller
 */

var Models = require('./../../models'),
    Files = Models.Files,
    Tags = Models.Tags,
    Archives = Models.Archives,
    Bangumis = Models.Bangumis;

var validator = require('validator'),
    _ = require('underscore'),
    images = require('./../../lib/images'),
    getinfo = require('./../../lib/getinfo');

var ObjectID = require('mongodb').ObjectID;

module.exports = function (api) {

    api.get('/bangumi/timeline', function *(next) {
        /*
            TODO: timeline

            return recent days bangumis

            asset refer hot resource
                media refer to its poster
                credit refer to its subs' name

            headline refer to bangumi's name
            text refer to ?

            remove main headline/asset?
        */
        var rbgms = yield new Bangumis().getRecent(true);
        var tag_ids = [];
        rbgms.forEach(function (bgm) {
            tag_ids.push(bgm.tag_id);
        });

        if (tag_ids.length > 0) {
            var tags = yield new Tags().find(tag_ids);
            var loc = this.locale;
            tags.forEach(function (t) {
                var localeName;
                if (t.locale && t.locale[loc]) {
                    localeName = t.locale[loc];
                } else {
                    return;
                }
                for (var i = 0; i < rbgms.length; i++) {
                    if (rbgms[i].tag_id &&
                        rbgms[i].tag_id.toString() == t._id.toString()) {
                        rbgms[i].name = localeName;
                        break;
                    }
                }
            });
        }

        var dbgms = [];
        var now = new Date();
        var wday = now.getDay();
        var weekStartDate = now.getDate() - wday;
        rbgms.forEach(function (bgm) {
            var date = new Date(now);
            //is last week when (wday + 1 < bgm.showOn)
            date.setDate(weekStartDate + (bgm.showOn) - (wday + 1 < bgm.showOn ? 7 : 0));
            var sdate = date.toDateString();
            var tldate = timelineDateTime(bgm.startDate, sdate);

            dbgms.push({
                startDate: tldate,
                endDate: tldate,
                headline: "<a href=\"/tag/" + bgm.tag_id + "\">" + bgm.name + "</a>",
                text: bgm.credit,
                asset: {
                    media: bgm.cover,
                    thumbnail: bgm.icon,
                    //credit: bgm.credit
                }
            });
        });

        if (dbgms.length <= 0) {
            dbgms.push({
                startDate: now,
                "headline": "Bangumi.moe",
                "text": "<p>A next-generation BT site.</p>",
                "asset": {
                    "media":"/images/bg/testbg1.png",
                    "credit":"power by rin-pr",
                    //"caption":"Caption text goes here"
                }
            });
        }
        this.body = { "timeline": {
            "type": "default",
            "date": dbgms
        }};
    });

    api.get('/bangumi/current', function *(next) {
        this.body = yield new Bangumis().getCurrent();
    });

    api.get('/v2/bangumi/current', function *(next) {
        var b = new Bangumis();
        var r = yield b.cache.get('current-v2');
        if (r !== null) {
          this.body = r;
          return;
        }

        var current_bgms = yield b.getCurrent();
        yield getinfo.get_objects_tags(current_bgms);

        var tag_ids = [];
        for (var i = 0; i < current_bgms.length; i++) {
          if (current_bgms[i].tag_id) {
            tag_ids.push(current_bgms[i].tag_id.toString());
          }
        }
        var working_teams = yield getinfo.get_working_teams(tag_ids, true);
        r = {
          bangumis: current_bgms,
          working_teams: working_teams
        };

        b.cache.ttl = 1 * 60 * 60; //cache for 1 hour
        yield b.cache.set('current-v2', r);
        this.body = r;
    });

    api.get('/bangumi/recent', function *(next) {
        this.body = yield new Bangumis().getRecent();
    });

    api.get('/v2/bangumi/recent', function *(next) {
        var b = new Bangumis();
        var r = yield b.cache.get('recent-v2');
        if (r !== null) {
          this.body = r;
          return;
        }

        var recent_bgms = yield b.getRecent();
        yield getinfo.get_objects_tags(recent_bgms);
        r = getinfo.get_bgms_showlist(recent_bgms);

        b.cache.ttl = 30 * 60; //cache for half an hour
        yield b.cache.set('recent-v2', r);
        this.body = r;
    });

    api.get('/v2/bangumi/user/:user_id', function *(next) {
      var userId = this.params.user_id;
      var r = [];
      if (userId && validator.isMongoId(userId)) {
        var k = 'user/recent/' + userId;
        var b = new Bangumis();
        r = yield b.cache.get(k);
        if (r == null) {
          r = yield getinfo.get_working_bgms_by_user(userId);
          b.cache.ttl = 1 * 60 * 60; //cache for 1 hour
          yield b.cache.set(k, r);
        }
      }
      this.body = r;
    });

    api.get('/v2/bangumi/team/:team_id', function *(next) {
      var teamId = this.params.team_id;
      var r = [];
      if (teamId && validator.isMongoId(teamId)) {
        var k = 'team/recent/' + teamId;
        var b = new Bangumis();
        r = yield b.cache.get(k);
        if (r == null) {
          r = yield getinfo.get_working_bgms_by_team(teamId);
          b.cache.ttl = 1 * 60 * 60; //cache for 1 hour
          yield b.cache.set(k, r);
        }
      }
      this.body = r;
    });

    /* api.get('/bangumi/all', function *(next) {
        this.body = yield new Bangumis().getAll();
    }); */

    api.post('/bangumi/add', function *(next) {
        if (this.user && this.user.isStaff()) {
            var body = this.request.body;
            var files = this.request.files;
            if (isValid(body, files)) {
                var tag = new Tags();
                var tagfound = false;
                var bname = validator.trim(body.name);
                var _t = yield tag.matchTags([bname]);
                if (_t && _t.length > 0 && _t[0] && _t[0]._id) {
                    if (_t[0].type !== 'bangumi') {
                        this.body = { success: false, message: 'tag exists!' };
                        return;
                    }
                    tagfound = true;
                } else {
                    tag = new Tags({name: bname, type: 'bangumi'});
                }
                //TODO: check Date type
                body.startDate = parseInt(body.startDate);
                body.endDate = parseInt(body.endDate);
                var nb = {
                    name: bname,
                    credit: body.credit,
                    startDate: body.startDate,
                    endDate: body.endDate,
                    showOn: body.showOn
                };
                if (tagfound || (tag && tag.valid())) {
                    var tag_id;

                    if (tagfound) {
                        tag_id = _t[0]._id;
                    } else {
                        var t = yield tag.save();
                        tag_id = t._id;
                    }

                    if (tag_id) {
                        nb.tag_id = tag_id;

                        var f1 = new Files();
                        var f2 = new Files();
                        f1.load('image', files.icon, this.user._id);
                        f2.load('image', files.cover, this.user._id);

                        if (f1.valid() && f2.valid()) {
                            //limit icon image size
                            yield images.thumb(files.icon.savepath, files.icon.savepath);
                            f1.extname = '.jpg';
                            yield images.small_cover(files.cover.savepath, files.cover.savepath);
                            f2.extname = '.jpg';

                            var file1 = yield f1.save();
                            var file2 = yield f2.save();
                            if (file1 && file2) {
                                nb.icon = file1.savepath;
                                nb.cover = file2.savepath;
                            }
                        }

                        var bangumi = new Bangumis(nb);
                        var b = yield bangumi.save();
                        if (b) {
                            this.body = { success: true, bangumi: b };
                            return;
                        }
                    }
                }
            }
        }
        this.body = { success: false };
    });

    api.post('/bangumi/update', function *(next) {
        if (this.user && this.user.isStaff()) {
            var body = this.request.body;
            var files = this.request.files;
            if (isValid(body) && validator.isMongoId(body._id)) {
                var bname = validator.trim(body.name);
                //TODO: check Date type
                body.startDate = parseInt(body.startDate);
                body.endDate = parseInt(body.endDate);
                var nb = {
                    name: bname,
                    credit: body.credit,
                    startDate: body.startDate,
                    endDate: body.endDate,
                    showOn: body.showOn
                };
                if (files && files.icon) {
                    var f1 = new Files();
                    f1.load('image', files.icon, this.user._id);
                    if (f1.valid()) {
                        //limit icon image size
                        yield images.thumb(files.icon.savepath, files.icon.savepath);
                        f1.extname = '.jpg';

                        var file1 = yield f1.save();
                        if (file1) {
                            nb.icon = file1.savepath;
                        }
                    }
                }
                if (files && files.cover) {
                    var f2 = new Files();
                    f2.load('image', files.cover, this.user._id);
                    if (f2.valid()) {
                        yield images.small_cover(files.cover.savepath, files.cover.savepath);
                        f2.extname = '.jpg';

                        var file2 = yield f2.save();
                        if (file2) {
                            nb.cover = file2.savepath;
                        }
                    }
                }

                var bangumi = new Bangumis({_id: body._id});
                var b = yield bangumi.find();
                if (b) {
                    if (b.name != bname) {
                        //Name change, and we need change tag
                        if (b.tag_id) {
                            var tag = new Tags({_id: b.tag_id});
                            var t = yield tag.find();
                            if (t) {
                                var i = tag.synonyms.indexOf(tag.name);
                                if (i >= 0) {
                                    tag.synonyms.splice(i, 1);
                                }
                                tag.name = body.name;
                                tag.synonyms.push(body.name);
                                tag.syn_lowercase = Tags.lowercaseArray(tag.synonyms);
                                yield tag.update();
                            }
                        }
                    }
                    b = yield bangumi.update(nb);
                    if (b) {
                        this.body = { success: true };
                        return;
                    }
                }
            }
        }
        this.body = { success: false };
    });

    api.post('/bangumi/remove', function *(next) {
        if (this.user && this.user.isStaff()) {
            var body = this.request.body;
            if (body && body._id && validator.isMongoId(body._id)) {
                var bangumi = new Bangumis({_id: body._id});
                var b = yield bangumi.find();
                if (b) {
                    // add removal log
                    console.log(this.user.username + ' removed bangumi: ' + body._id);

                    var archive = new Archives({
                        type: 'bangumi',
                        user_id: this.user._id,
                        data: b
                    });
                    yield archive.save();

                    yield bangumi.remove();
                    this.body = { success: true };
                    return;
                }
            }
        }
        this.body = { success: false };
    });

    api.post('/bangumi/search', function *(next) {
        var body = this.request.body;
        if (body && body.name) {
            body.name = validator.trim(body.name);
            if (body.name) {
                var t = yield new Tags().matchTags([body.name]);
                if (t && t[0] && t[0].type == 'bangumi') {
                    var b = yield new Bangumis().getByTagId(t[0]._id);
                    if (b) {
                        this.body = {success: true, found: true, bangumi: b};
                        return;
                    }
                }
                this.body = {success: true, found: false};
                return;
            }
        }
        this.body = {success: false};
    });

    api.post('/bangumi/fetch', function *(next) {
        var body = this.request.body;
        if (body) {
            if (body._ids && validator.isMongoIdArray(body._ids)) {
                this.body = yield new Bangumis().find(body._ids);
                return;
            } else if (body._id && validator.isMongoId(body._id)) {
                this.body = yield new Bangumis().find(body._id);
                return;
            }
        }
        this.body = '';
    });

    api.get('/v2/bangumi/:bangumi_id', function *(next) {
      var bangumiId = this.params.bangumi_id;
      var r = {};
      if (bangumiId && validator.isMongoId(bangumiId)) {
        var b = yield new Bangumis().find(bangumiId);
        if (b && b.tag_id) {
            b.tag = yield new Tags().find(b.tag_id);
            var working_teams = yield getinfo.get_working_teams([ b.tag_id ], true);
            var stag_id = b.tag_id.toString();
            if (working_teams && working_teams[stag_id]) {
                b.working_teams = working_teams[stag_id];
            } else {
                b.working_teams = [];
            }
        }
        r = b;
      }
      this.body = r;
    });
};

var isValid = function(bangumi, files) {
    bangumi.name = validator.trim(bangumi.name);
    bangumi.showOn = parseInt(bangumi.showOn);
    if (validator.isDate(bangumi.startDate) && validator.isDate(bangumi.endDate)) {
        return false;
    }
    //0 stand for Sunday
    if ([0, 1, 2, 3, 4, 5, 6].indexOf(bangumi.showOn) === -1) {
        return false;
    }
    if (typeof bangumi.name !== 'string' || !bangumi.name) {
        return false;
    }
    /* No need for create new bangumi
    if (!bangumi.tag_id || validator.isMongoId(bangumi.tag_id)) {
        return false;
    }*/
    if (files && (!files.cover || !files.icon)) {
        return false;
    }
    return true;
};

var timelineDateTime = function(startDate, sdate) {
    /*
    * startDate: bangumi.startDate should be a exact Date object (timestamp) of the first showTime begin
    * endDate: bangumi.endDate should be a exact Date object (timestamp) of the last showTime end
    * sdate: a Date object of most recent show date
    *
    * ok i give up. dont know how to calculate a bangumi that cross the night without add new property to bangumis model.
    * */

    sdate = new Date(sdate);
    var startTime = new Date(startDate);
    // var startDateString = sdate.getFullYear() + ',' + (sdate.getMonth() + 1) + ',' + sdate.getDate();

    // does timelinejs support date object?
    sdate.setHours(startTime.getHours());
    sdate.setMinutes(startTime.getMinutes());

    // return startDateString + ',' + startTime.getHours() + ',' + startTime.getMinutes()
    return sdate;
};
