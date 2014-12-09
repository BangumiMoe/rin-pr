"use strict";

/**
 * controller/api/team.js
 * Rin prpr!
 *
 * team api controller
 */

var Models = require('./../../models'),
    Files = Models.Files;

var validator = require('validator');

module.exports = function (api) {

    api.get('/file/all', function *(next) {
        if (this.user) {
            this.body = yield new Teams().getAll();
        } else {
            this.body = [];
        }
    });

    api.post('/file/upload', function *(next) {
        if (this.user) {
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

    api.post('/file/remove', function *(next) {
        if (this.user) {
            var file = new Files({_id: this.body._id});
            var f = yield file.find();
            if (f && (f.uploader_id == this.user._id || this.user.isAdmin())) { 
                f = yield f.remove();
                if (f) {
                    this.body = { success: true };
                    return;
                }
            }
        }
        this.body = { success: false };
    });

    api.post('/file/fetch', function *(next) {
        var body = this.request.body;
        if (body) {
            if (body._ids && body._ids instanceof Array) {
                this.body = yield new Files().find(body._ids);
                return;
            } else if (body._id && validator.isMongoId(body._id)) {
                this.body = yield new Files().find(body._id);
                return;
            }
        }
        this.body = '';
    });

};
