"use strict";

/**
 * controller/api/team.js
 * Rin prpr!
 *
 * team api controller
 */

var config = require('./../../config');

var Models = require('./../../models'),
    Files = Models.Files,
    Users = Models.Users,
    Tags = Models.Tags,
    Torrents = Models.Torrents,
    Teams = Models.Teams,
    TeamAccounts = Models.TeamAccounts,
    Archives = Models.Archives;
var ObjectID = require('mongodb').ObjectID;

var _ = require('underscore'),
    validator = require('validator'),
    xss = require('xss'),
    common = require('./../../lib/common'),
    mailer = require('./../../lib/mailer'),
    images = require('./../../lib/images'),
    getinfo = require('./../../lib/getinfo');

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
                      var locals = {
                        username: this.user.username,
                        team: newTeam.name
                      };
                      var mailresult = yield mailer(config['mail'].admin, this.locale, 'new_team_request', locals);
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
                if (t && body.type && team.isAdminUser(this.user._id)) {
                  if (body.type == 'member') {
                    if (team.isAuditingUser(body.user_id)) {
                      if (yield team.addMember(body.user_id)) {
                        this.body = { success: true };
                        return;
                      }
                    }
                  } else if (body.type == 'editor') {
                    if (team.isMemberUser(body.user_id)) {
                      if (yield team.addEditor(body.user_id)) {
                        this.body = { success: true };
                        return;
                      }
                    }
                  } else if (body.type == 'admin') {
                    if (team.isMemberUser(body.user_id)) {
                      if (yield team.addAdmin(body.user_id)) {
                        this.body = { success: true };
                        return;
                      }
                    }
                  }
                } else if (t && this.user.isAdmin()) {
                    if (body.user_id == t.admin_id) {
                        var tag = new Tags({name: team.name, type: 'team'});
                        var ta = yield tag.save();
                        var user = new Users({_id: t.admin_id});
                        var u = yield user.find();
                        if (ta) {
                            var te = yield team.update({approved: true, tag_id: ta._id});
                            if (te) {
                              if (u && u.email) {
                                var locals = {
                                  username: u.username,
                                  team: team.name
                                };
                                var mailresult = yield mailer(u.email, this.locale, 'new_team_confirmation', locals);
                              }
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
                if (t && body.type && team.isAdminUser(this.user._id)) {
                  if (body.type == 'member') {
                    if (team.isAuditingUser(body.user_id)) {
                      if (yield team.removeAuditing(body.user_id)) {
                        this.body = { success: true };
                        return;
                      }
                    }
                  }
                } else if (t && this.user.isAdmin()) {
                    if (body.user_id == t.admin_id) {
                        //TODO: send reject mail
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
        if (this.user) {
          var team = new Teams();
          var ts = yield team.getByUserMember(this.user._id);
          if (ts) {
            this.body = Teams.filter(ts);
          }
          return;
        }
        this.body = [];
    });

    api.get('/team/myjoining', function *(next) {
        if (this.user) {
            var team = new Teams();
            var ts = yield team.getByUserAuditing(this.user._id);
            if (ts) {
                this.body = Teams.filter(ts);
            }
            return;
        }
        this.body = [];
    });

    api.get('/team/members', function *(next) {
        if (this.user && this.query && this.query.team_id
          && validator.isMongoId(this.query.team_id)) {
          var team_id = this.query.team_id;
          var team = new Teams({_id: new ObjectID(team_id)});
          if (yield team.find()) {
            if (team.member_ids) {
              var us = yield new Users().find(team.member_ids);
              this.body = Users.filter(us);
              return;
            }
          }
        }
        this.body = [];
    });

    api.get('/team/members/pending', function *(next) {
        if (this.user && this.query && this.query.team_id
          && validator.isMongoId(this.query.team_id)) {
          var team_id = this.query.team_id;
          var team = new Teams({_id: new ObjectID(team_id)});
          if (yield team.find()) {
            if (team.isAdminUser(this.user._id) && team.auditing_ids) {
              var us = yield new Users().find(team.auditing_ids);
              this.body = Users.filter(us);
              return;
            }
          }
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
        if (this.user && this.user.isActive() && this.request.body) {
            var name = validator.trim(this.request.body.name);
            var tags = yield new Tags().matchTags([name]);
            if (tags && tags.length > 0) {
                var team = new Teams();
                var t = yield team.getByTagId(tags[0]._id);
                if (t) {
                  team.set(t);
                  if (!team.isMemberUser(this.user._id) && !team.isAuditingUser(this.user._id)) {
                    yield team.addAuditing(this.user._id);

                    if (team.admin_ids && team.admin_ids.length > 0) {
                      var u = yield new Users().find(team.admin_ids[0]);
                      if (u && u.email) {
                        var locals = {
                          username: u.username,
                          requester: this.user.username,
                          team: team.name
                        };
                        var mailresult = yield mailer(u.email, this.locale, 'new_membership_request', locals);
                      }
                    }

                    this.body = { success: true };
                    return;
                  }
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
            /*if (body.admin_id) {
                newTeam.admin_id = new ObjectID(body.admin_id);
            }*/
            if (body.name && this.user.isAdmin()) {
                //only admin can do that
                body.name = validator.trim(body.name);
                if (body.name) {
                    newTeam.name = body.name;
                }
            }
            if (validator.isMongoId(body._id)) {
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

                var team = new Teams({_id: body._id});
                var t = yield team.find();
                if (t && (team.isAdminUser(this.user._id) || this.user.isAdmin())) {
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
                //var u = new Users({_id: body.user_id});
                //var tu = yield u.find();
                var t = yield team.find();
                if (t && team.member_ids && team.member_ids.length > 1) {
                    //couldn't delete when only one member
                    var s = false;
                    if (body.type == 'member') {
                      if (team.isAdminUser(this.user._id)) {
                        yield team.removeMember(body.user_id);
                        s = true;
                      }
                    } else if (body.type == 'editor') {
                      if (team.isAdminUser(this.user._id)
                          || (this.user._id.toString() == body.user_id && team.isEditorUser(this.user._id))) {
                        yield team.removeEditor(body.user_id);
                        s = true;
                      }
                    } else if (body.type == 'admin'
                        && body.user_id != team.admin_id
                        && team.admin_ids && team.admin_ids.length > 1) {
                      // the creator can't be deleted
                      if (this.user.isAdmin() || team.isAdminUser(this.user._id)) {
                        yield team.removeAdmin(body.user_id);
                        s = true;
                      }
                    }
                    this.body = { success: s };
                    return;
                }
            } else if (body._id && this.user.isAdmin()) {
                if (validator.isMongoId(body._id)) {
                  var team = new Teams({_id: body.team_id});
                  var t = yield team.find()
                  if (t) {

                    var archive = new Archives({
                        type: 'team',
                        user_id: this.user._id,
                        data: t
                    });
                    yield archive.save();

                    yield new Tags().remove(team.tag_id);
                    yield team.remove();
                    this.body = { success: true };
                    return;
                  }
                }
            }
        }
        this.body = { success: false };
    });

    api.get('/team/sync/get', function *(next) {
        if (this.user && this.user.isActive()) {
          if (this.query && this.query.team_id
            && validator.isMongoId(this.query.team_id)) {
            var team_id = this.query.team_id;
            var team = new Teams({_id: team_id});
            var t = yield team.find();
            if (t && team.isMemberUser(this.user._id)) {
              var asn = yield new TeamAccounts().getByTeamId(team_id);
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
          }
        }
        this.body = {};
    });

    api.post('/team/sync/update', function *(next) {
        if (this.user && this.user.isActive()) {
            var body = this.request.body;
            if (body && typeof body.sync == 'object'
              && body.team_id && validator.isMongoId(body.team_id)) {
              var team = new Teams({_id: body.team_id});
              var t = yield team.find();
              if (t && team.isAdminUser(this.user._id)) {
                yield new TeamAccounts().updateFromSyncInfo(
                  body.team_id, body.sync);
                this.body = { success: true };
                return;
              }
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
            for (var i = 0; i < body.tag_ids.length; i++) {
                if (typeof body.tag_ids[i] == 'string'
                    && validator.isMongoId(body.tag_ids[i])) {
                    tag_ids.push(body.tag_ids[i]);
                }
            }
            this.body = yield getinfo.get_working_teams(tag_ids, false);
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
