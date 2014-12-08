var validator = require('validator');
var Models = require('./../../models'),
    Users = Models.Users;

module.exports = function (api) {

    api.post('/user/check', function *(next) {
        var body = this.request.body;
        //password already sha256
        if (body && body.username && body.password && body.email) {
            var user = new Users({
                username: body.username,
                password: body.password,
                email: body.email
            }, false);
            if (user.valid()) {
                var result = {};
                result.valid = true;
                result.exists = yield user.exists();
                this.body = result;
                return;
            }
        }
        this.body = {valid: false};
    });

    api.post('/user/register', function *(next) {
        var body = this.request.body;
        //password already sha256
        if (body && body.username && body.password && body.email) {
            var user = new Users({
                username: body.username,
                password: body.password,
                email: body.email
            }, false);
            if (user.valid()) {
                var isexists = yield user.exists();
                if (!isexists) {
                    var u = yield user.save();
                    if (u) {
                        var uv = user.valueOf();
                        this.session.user = uv;
                        this.body = {success: true, user: uv};
                        return;
                    }
                }
            }
        }
        this.body = {success: false};
    });

    api.post('/user/signin', function *(next) {
        var body = this.request.body;
        if (body && body.username && body.password) {
            var user = new Users();
            var u = yield user.getByUsername(body.username);
            if (u) {
                if (user.checkPassword(body.password, false)) {
                    this.body = {success: true, user: user.valueOf()};
                    this.session.user = user.valueOf();
                    return;
                }
            }
        }
        this.body = {success: false};
    });

    api.get('/user/signout', function *(next) {
        this.session = null;
        this.user = null;
        this.body = {success: true};
    });

    api.get('/user/session', function *(next) {
        if (this.session.user && this.user) {
            this.body = this.user.valueOf();
        } else {
            this.body = {};
        }
    });

    api.post('/user/fetch', function *(next) {
        var body = this.request.body;
        if (body) {
            var u = new Users();
            if (body._ids && body._ids instanceof Array) {
                var us = yield u.find(body._ids);
                var bus = [];
                us.forEach(function (_u) {
                    //remove sensitive field
                    u.set(_u);
                    bus.push(u.valueOf());
                });
                this.body = bus;
                return;
            } else if (body._id && validator.isMongoId(body._id)) {
                if (yield u.find(body._id)) {
                    this.body = u.valueOf();
                } else {
                    this.body = {};
                }
                return;
            }
        }
        this.body = '';
    });

};
