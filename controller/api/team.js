"use strict";

/**
 * controller/api/team.js
 * Rin prpr!
 *
 * team api controller
 */

var Models = require('./../../models'),
    Files = Models.Files,
    Users = Models.Users,
    Tags = Models.Tags,
    Torrents = Models.Torrents,
    Teams = Models.Teams,
    TeamAccounts = Models.TeamAccounts;
var ObjectID = require('mongodb').ObjectID;

var _ = require('underscore'),
    validator = require('validator'),
    xss = require('xss'),
    images = require('./../../lib/images');

module.exports = function (api) {

    api.get('/team/all/:type', function *(next) {
        if (this.params && this.params.type === 'pending') {
            if (this.user && this.user.isAdmin()) {
                this.body = yield new Teams().getAllPending();
            } else {
                this.body = [];
            }
        } else {
            this.body = yield new Teams().getAll({approved: true});
        }
    });

    api.get('/team/pending', function *(next) {
        if (this.user) {
            var t = yield new Teams().getPending(this.user._id);
            if (t) {
                this.body = t;
                return;
            }
        }
        this.body = {};
    });

    api.post('/team/register', function *(next) {
        if (this.user && this.user.isActive() && this.request.body) {
            var name = validator.trim(this.request.body.name);
            var certification = xss(this.request.body.certification);
            if (name && certification && certification.length < 32768) {
                var newTeam = {
                    name: name,
                    admin_id: this.user._id,
                    certification: certification,
                    approved: false
                };
                var team = new Teams(newTeam);
                var tp = yield team.getPending(this.user._id);
                if (!tp) {
                    var t = yield team.save();
                    if (t) {
                        this.body = { success: true, team: t };
                        return;
                    }
                }
            }
        }
        this.body = { success: false };
    });

    api.post('/team/approve', function *(next) {
        if (this.user && this.request.body) {
            var body = this.request.body;
            if (body.team_id && validator.isMongoId(body.team_id)) {
                var team = new Teams({_id: body.team_id});
                var t = yield team.find();
                if (t && body.type == 'member'
                    && this.user._id.toString() == t.admin_id.toString()) {
                    var u = new Users({_id: body.user_id});
                    if (yield u.find()) {
                        if (u.join_team_id.toString() == t._id) {
                            if (yield u.update({join_team_id: null, team_id: new ObjectID(t._id)})) {
                                this.body = { success: true };
                                return;
                            }
                        }
                    }
                } else if (t && this.user.isAdmin()) {
                    if (body.user_id == t.admin_id) {
                        var user = new Users({_id: t.admin_id});
                        yield user.update({team_id: new ObjectID(t._id)});
                        //TODO: create team tag
                        var tag = new Tags({name: team.name, type: 'team'});
                        var ta = yield tag.save();
                        if (ta) {
                            var te = yield team.update({approved: true, tag_id: ta._id});
                            if (te) {
                                this.body = { success: true };
                                return;
                            }
                        }
                    }
                }
            }
        }
        this.body = { success: false };
    });

    api.post('/team/reject', function *(next) {
        if (this.user && this.request.body) {
            var body = this.request.body;
            if (body.team_id && validator.isMongoId(body.team_id)) {
                var team = new Teams({_id: body.team_id});
                var t = yield team.find();
                if (t && body.type == 'member'
                    && this.user._id.toString() == t.admin_id.toString()) {
                    var u = new Users({_id: body.user_id});
                    if (yield u.find()) {
                        if (u.join_team_id.toString() == t._id) {
                            if (yield u.update({join_team_id: null})) {
                                this.body = { success: true };
                                return;
                            }
                        }
                    }
                } else if (t && this.user.isAdmin()) {
                    if (body.user_id == t.admin_id) {
                        if (yield team.update({rejected: true})) {
                            this.body = { success: true };
                            return;
                        }
                    }
                }
            }
        }
        this.body = { success: false };
    });

    api.get('/team/myteam', function *(next) {
        if (this.user && this.user.team_id) {
            var team = new Teams({_id: this.user.team_id});
            var t = yield team.find();
            if (t) {
                this.body = team.valueOf();
            }
            return;
        }
        this.body = {};
    });

    api.get('/team/myjoining', function *(next) {
        if (this.user && this.user.join_team_id) {
            var team = new Teams({_id: this.user.join_team_id});
            var t = yield team.find();
            if (t) {
                this.body = team.valueOf();
            }
            return;
        }
        this.body = {};
    });

    api.get('/team/members', function *(next) {
        if (this.user && this.user.team_id) {
            var us = yield new Users().getTeamMembers(this.user.team_id);
            this.body = Users.filter(us);
            return;
        }
        this.body = [];
    });

    api.get('/team/members/pending', function *(next) {
        if (this.user && this.user.team_id) {
            var us = yield new Users().getTeamMembers(this.user.team_id, 'pending');
            this.body = Users.filter(us);
            return;
        }
        this.body = [];
    });

    api.post('/team/add', function *(next) {
        if (this.user && this.user.isAdmin()
            && this.request.body) {
            var body = this.request.body;
            var newTeam = {
                name: body.name,
                admin_id: body.admin_id,
                tag_id: body.tag_id
            };
            if (isValid(newTeam)) {
                var team = new Teams(newTeam);
                var t = yield team.save();
                if (t) {
                    this.body = { success: true };
                    return;
                }
            }
        }
        this.body = { success: false };
    });

    api.post('/team/join', function *(next) {
        if (this.user && this.user.isActive() && !this.user.team_id && this.request.body) {
            var name = validator.trim(this.request.body.name);
            var tags = yield new Tags().matchTags([name]);
            if (tags && tags.length > 0) {
                var team = yield new Teams().getByTagId(tags[0]._id);
                if (team) {
                    yield this.user.update({join_team_id: new ObjectID(team._id)});
                    this.body = { success: true };
                    return;
                }
            }
        }
        this.body = { success: false };
    });

    api.post('/team/update', function *(next) {
        if (this.user && this.user.isActive() && this.request.body) {
            var body = this.request.body;
            var files = this.request.files;
            var newTeam = {
                //name: body.name
            };
            if (typeof body.signature == 'string') {
                if (body.signature.length >= 32768) {
                    this.body = { success: false };
                    return;
                }
                newTeam.signature = xss(body.signature);
            }
            if (body.admin_id) {
                newTeam.admin_id = new ObjectID(body.admin_id);
            }
            if (body.name && this.user.isAdmin()) {
                //only admin can do that
                body.name = validator.trim(body.name);
                if (body.name) {
                    newTeam.name = body.name;
                }
            }
            if (files && files.icon) {
                var file = new Files();
                file.load('image', files.icon, this.user._id);
                if (file.valid()) {
                    //limit image size
                    yield images.thumb(files.icon.savepath, files.icon.savepath);
                    file.extname = '.jpg';

                    var f = yield file.save();
                    if (f) {
                        newTeam.icon = f.savepath;
                    }
                }
            }
            if (validator.isMongoId(body._id)) {
                var team = new Teams({_id: body._id});
                var t = yield team.find();
                if (t && (t.admin_id.toString() == this.user._id || this.user.isAdmin())) {
                    var tu = yield team.update(newTeam);
                    if (tu) {
                        this.body = { success: true };
                        return;
                    }
                }
            }
        }
        this.body = { success: false };
    });

    api.post('/team/remove', function *(next) {
        if (this.user && this.user.isActive() && this.request.body) {
            var body = this.request.body;
            if (body && body.user_id && body.team_id
                && validator.isMongoId(body.user_id)) {
                var team = new Teams({_id: body.team_id});
                var u = new Users({_id: body.user_id});
                var tu = yield u.find();
                var t = yield team.find();
                if (tu && tu.team_id == body.team_id && t.admin_id != body.user_id) {
                    //couldn't delete admin
                    yield u.update({team_id: null});
                    this.body = { success: true };
                    return;
                }
            } else if (body._id && this.user.isAdmin()) {
                yield new Teams().remove(body._id);
                this.body = { success: true };
                return;
            }
        }
        this.body = { success: false };
    });

    api.get('/team/sync/get', function *(next) {
        if (this.user && this.user.isActive() && this.user.team_id) {
            var asn = yield new TeamAccounts().getByTeamId(this.user.team_id);
            var si = {};
            asn.forEach(function (a) {
                si[a.site] = {
                    enable: a.enable,
                    username: a.username
                };
            });
            this.body = si;
            return;
        }
        this.body = {};
    });

    api.post('/team/sync/update', function *(next) {
        if (this.user && this.user.isActive() && this.user.team_id) {
            var body = this.request.body;
            if (body && typeof body.sync == 'object') {
                yield new TeamAccounts().updateFromSyncInfo(
                    this.user.team_id, body.sync);
                this.body = { success: true };
                return;
            }
        }
        this.body = { success: false };
    });

    api.post('/team/fetch', function *(next) {
        var body = this.request.body;
        if (body) {
            var ts = null;
            if (body._ids && validator.isMongoIdArray(body._ids)) {
                ts = yield new Teams().find(body._ids);
            } else if (body._id && validator.isMongoId(body._id)) {
                ts = yield new Teams().find(body._id);
            }
            if (ts) {
                this.body = Teams.filter(ts);
                return;
            }
        }
        this.body = '';
    });

    api.post('/team/working', function *(next) {
        var body = this.request.body;
        if (body && body.tag_ids instanceof Array) {
            //bangumi tag_id
            var tag_ids = [];
            var torrents = new Torrents();
            var teams = new Teams();
            teams.cache.ttl = 24 * 60 * 60; //cache for 1 day
            for (var i = 0; i < body.tag_ids.length; i++) {
                if (typeof body.tag_ids[i] == 'string'
                    && validator.isMongoId(body.tag_ids[i])) {
                    tag_ids.push(body.tag_ids[i]);
                }
            }
            if (tag_ids.length > 0) {
                tag_ids = _.uniq(tag_ids);
                var k = 'working/' + tag_ids.slice().sort().join();
                var r = yield teams.cache.get(k);
                if (r !== null) {
                    this.body = r;
                    return;
                }
                r = {};
                var ts = yield torrents.getInTags(tag_ids);
                if (ts.length > 0) {
                    var torrentTags = [];
                    ts.forEach(function(t) {
                        torrentTags = torrentTags.concat(t.tag_ids);
                    });
                    var teamTags = yield new Tags().getTeamInTags(torrentTags);
                    if (teamTags.length > 0) {
                        var ttagids = _.map(teamTags, _.iteratee('_id'));
                        var tms = yield teams.getByTagId(ttagids);
                        if (tms.length > 0) {
                            tag_ids.forEach(function (btid) {
                                var _tms = [];
                                ts.forEach(function(t) {
                                    if (_.find(t.tag_ids, function (oid) {
                                        return oid.toString() == btid;
                                    })) {
                                        var ttms = _.filter(tms, function (tm) {
                                            return !!_.find(t.tag_ids, function (oid) {
                                                return oid.toString() == tm.tag_id.toString();
                                            });
                                        });
                                        _tms = _.uniq(_tms.concat(ttms));
                                    }
                                });
                                if (_tms.length > 0) {
                                    r[btid] = _tms;
                                }
                            });
                        }
                    }
                }
                yield teams.cache.set(k, r);
                this.body = r;
                return;
            }   //if (tag_ids.length > 0)
        }
        this.body = {};
    })

};

var isValid = function (team) {
    team.name = validator.trim(team.name);
    if (!team.name) {
        return false;
    }
    if (!validator.isMongoId(team.admin_id)) {
        return false;
    }
    if (!team.tag_id || !validator.isMongoId(team.tag_id)) {
        return false;
    }
    return true;
};
