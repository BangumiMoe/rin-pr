var validator = require('validator');
var Models = require('./../../models'),
    Tags = Models.Tags;

module.exports = function (api) {

    api.post('/tag/add', function *(next) {
        if (this.user && this.user.isAdmin()) {
            var body = this.request.body;
            if (body && body.name && body.synonyms) {
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
        this.body = {success: false};
    });

    api.post('/tag/remove', function *(next) {
        if (this.user && this.user.isAdmin()) {
            var tag = new Tags({_id: body._id});
            yield tag.remove();
            this.body = {success: true};
            return;
        }
        this.body = {success: false};
    });

    api.get('/tag/all', function *(next) {
        this.body = yield new Tags().getAll();
    });

    api.get('/tag/suggest', function *(next) {
        var query = this.request.query;
        if (query.s) {
            this.body = query.s;
            return;
        }
        this.body = [];
    });

};
