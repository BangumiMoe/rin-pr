"use strict";

/**
 * controller/api/team.js
 * Rin prpr!
 *
 * team api controller
 */

var Models = require('./../../models'),
    Teams = Models.Teams;

var validator = require('validator');

module.exports = function (api) {

    api.get('/team/all', function *(next) {
        this.body = yield new Teams().getAll();
    });

    api.post('/team/add', function *(next) {
        if (this.user && this.user.isAdmin()) {
            var newTeam = {
                name: this.body.name,
                admin: this.body.admin,
                tag: this.body.tag
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

    api.post('/team/update', function *(next) {
        if (this.user) {
            var newTeam = {
                name: this.body.name,
                admin: this.body.admin,
                tag: this.body.tag
            };
            if (isValid(newTeam)) {
                var team = new Teams({_id: this.body._id});
                var t = yield team.find();
                if (t && (t._id == this.user._id || this.user.isAdmin())) { 
                    t = yield team.update(newTeam);
                    if (t) {
                        this.body = { success: true };
                        return;
                    }
                }
            }
        }
        this.body = { success: false };
    });

    api.post('/team/remove', function *(next) {
        if (this.user && this.user.isAdmin()) {
            yield new Teams().remove(this.body._id);
            this.body = { success: true };
            return;
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
    if (!validator.isMongoId(team.admin)) {
        return false;
    }
    if (!team.tag || !validator.isMongoId(team.tag)) {
        return false;
    }
    return true;
};
