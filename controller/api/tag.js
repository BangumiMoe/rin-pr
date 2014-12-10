var validator = require('validator');
var Models = require('./../../models'),
    Tags = Models.Tags;

module.exports = function (api) {

    api.post('/tag/add', function *(next) {
        if (this.user && this.user.isAdmin()) {
            var body = this.request.body;
            if (body && body.name && body.synonyms instanceof Array) {
                body.name = validator.trim(body.name);
                if (body.name) {
                    var tag = new Tags({
                        name: body.name,
                        synonyms: body.synonyms
                    });
                    if (tag.valid()) {
                        var t = yield tag.save();
                        if (t) {
                            this.body = {success: true, tag: tag.valueOf()};
                            return;
                        }
                    }
                }
            }
        }
        this.body = {success: false};
    });

    api.post('/tag/update', function *(next) {
        if (this.user && this.user.isAdmin()) {
            var body = this.request.body;
            if (body && body._id && body.name
                && body.synonyms instanceof Array
                && validator.isMongoId(body._id)) {
                body.name = validator.trim(body.name);
                if (body.name) {
                    var tag = new Tags({
                        _id: body._id,
                        name: body.name,
                        synonyms: body.synonyms
                    });
                    if (tag.valid()) {
                        var t = yield tag.update();
                        if (t) {
                            this.body = {success: true, tag: tag.valueOf()};
                            return;
                        }
                    }
                }
            }
        }
        this.body = {success: false};
    });

    api.post('/tag/remove', function *(next) {
        if (this.user && this.user.isAdmin()) {
            if (validator.isMongoId(this.request.body._id)) { 
                var tag = new Tags({_id: this.request.body._id});
                yield tag.remove();
                this.body = {success: true};
                return;
            }
        }
        this.body = {success: false};
    });

    api.get('/tag/all', function *(next) {
        this.body = yield new Tags().getAll();
    });

    api.post('/tag/search', function *(next) {
        var body = this.request.body;
        if (body && body.name) {
            body.name = validator.trim(body.name);
            if (body.name) {
                var t = yield new Tags().matchTags([body.name]);
                if (t && t[0]) {
                    this.body = {success: true, found: true, tag: t[0]};
                } else {
                    this.body = {success: true, found: false};
                }
                return;
            }
        }
        this.body = {success: false};
    });

    api.get('/tag/suggest', function *(next) {
        var query = this.request.query;
        if (query.s) {
            var sarr = query.s.split(/[\[\] 「」【】   ]/);
            this.body = yield new Tags().matchTags(sarr);
            return;
        }
        this.body = [];
    });

    api.post('/tag/fetch', function *(next) {
        var body = this.request.body;
        if (body) {
            if (body._ids && body._ids instanceof Array) {
                this.body = yield new Tags().find(body._ids);
                return;
            } else if (body._id && validator.isMongoId(body._id)) {
                this.body = yield new Tags().find(body._id);
                return;
            }
        }
        this.body = '';
    });

};
