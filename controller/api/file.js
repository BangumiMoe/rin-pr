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

    api.get('/file/all/:type', function *(next) {
        if (this.user
            && this.params && this.params.type) {
            this.body = yield new Files().getAll(
                {uploader_id: this.user._id, type: this.params.type});
        } else {
            this.body = [];
        }
    });

    api.post('/file/upload/:type', function *(next) {
        if (this.user && this.user.isActive()) {
            if (this.request.files && this.request.files.file
                && this.params && this.params.type)
            var f = new Files();
            f.load(this.params.type, this.request.files.file, this.user._id);
            if (f.valid()) {
                var file = yield f.save();
                if (file) {
                    var r = { success: true, file: file };
                    if (this.query && this.query.for == 'redactor') {
                        r.filelink = file.savepath;
                    }
                    this.body = r;
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
