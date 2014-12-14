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
    Teams = Models.Teams;
var ObjectID = require('mongodb').ObjectID;

var validator = require('validator'),
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
                        var tag = new Tags({name: team.name, synonyms: []});
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
            this.body = yield new Users().getTeamMembers(this.user.team_id, 'pending');
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
            var team = yield new Teams().getByName(this.request.body.name);
            if (team) {
                yield this.user.update({join_team_id: new ObjectID(team._id)});
                this.body = { success: true };
                return;
            }
        }
        this.body = { success: false };
    });

    api.post('/team/update', function *(next) {
        if (this.user && this.user.isActive() && this.request.body) {
            var body = this.request.body;
            var files = this.request.files;
            if (!(typeof body.signature == 'string'
                && body.signature.length < 32768)) {
                this.body = { success: false };
                return;
            }
            var newTeam = {
                //name: body.name,
                //admin_id: body.admin_id,
                signature: xss(body.signature)
            };
            if (body.admin_id) {
                newTeam.admin_id = new ObjectID(body.admin_id);
            }
            if (body.name && this.user.isAdmin()) {
                //only can do that
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
                if (t && (t.admin_id == this.user._id || this.user.isAdmin())) { 
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
            if (body.user_id && body.team_id
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

    api.post('/team/fetch', function *(next) {
        var body = this.request.body;
        if (body) {
            if (body._ids && body._ids instanceof Array) {
                this.body = yield new Teams().find(body._ids);
                return;
            } else if (body._id && validator.isMongoId(body._id)) {
                this.body = yield new Teams().find(body._id);
                return;
            }
        }
        this.body = '';
    });

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
