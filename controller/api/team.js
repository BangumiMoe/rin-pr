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

    api.get('/teams/all', function *(next) {
        return yield new Teams().getAll();
    });

    api.post('/teams/add', function *(next) {
        var newTeam = {
            name: this.body.name,
            tag: this.body.tag
        };
        if (isValid(newTeam)) {
            var t = yield newTeam.save();
            if (t) {
                this.body = { success: true };
                return;
            }
        }
    });

    api.post('/teams/update', function *(next) {
        var newTeam = {
            _id: this.body._id,
            name: this.body.name,
            tag: this.body.tag
        };
        if (isValid(newTeam)) {
            var t = yield newTeam.update();
            if (t) {
                this.body = { success: true };
                return;
            }
        }
    });

    api.post('/teams/remove', function *(next) {
        yield new Teams().remove(this.body._id);
        return this.body = { success: true };
    });

};

var isValid = function (team) {
    if (!team.name) {
        return false;
    }
    if (!team.tag || team.tag.length !== 24) {
        return false;
    }
    return true;
};
