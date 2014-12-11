var validator = require('validator');
var Models = require('./../../models'),
    Users = Models.Users;

var config = require('./../../config');
var mailer = require('./../../lib/mailer');

module.exports = function (api) {

    api.post('/user/check', function *(next) {
        var body = this.request.body;
        //password already md5
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
        var localeStr = this.request.headers.cookie.match(/locale=\%22([a-z_]+?)\%22/);
        var locale = 'en';
        if (localeStr && localeStr[1]) {
            locale = localeStr[1];
        }
        //TODO: check locale in support list
        //password already hash
        if (body && body.username && body.password && body.email) {
            var user = new Users({
                username: body.username,
                password: body.password,
                email: body.email
            }, false);
            if (user.valid()) {
                var isexists = yield user.exists();
                if (!isexists) {
                    var count = yield user.count();
                    if (count <= 0) {
                        //make the first user is admin
                        user.group = 'admin';
                    }
                    var u = yield user.save();
                    if (u) {
                        var locals = {
                            username: user.username,
                            activationUrl: config['app'].api_domain_prefix + '/api/user/activate/' + u.activateKey
                        };
                        var mailresult = yield mailer(user.email, locale, 'reg_confirmation', locals);
                        this.session.user = user.valueOf();
                        this.body = {success: true, user: user.expose()};
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
                    this.body = {success: true, user: user.expose()};
                    this.session.user = user.valueOf();
                    return;
                }
            }
        }
        this.body = {success: false};
    });

    api.delete('/user/signout', function *(next) {
        this.session = null;
        this.user = null;
        this.body = {success: true};
    });

    api.get('/user/session', function *(next) {
        if (this.session.user && this.user) {
            this.body = this.user.expose();
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
                this.body = Users.filter(us);
                return;
            } else if (body._id && validator.isMongoId(body._id)) {
                if (yield u.find(body._id)) {
                    this.body = u.expose();
                } else {
                    this.body = {};
                }
                return;
            }
        }
        this.body = '';
    });

    api.get('/user/activate/:key', function *(next) {
        var activateKey = this.params.key;
        var user = new Users();
        var u = yield user.getByActivateKey(activateKey);
        if (u) {
            yield user.activate();
            this.redirect('/');
        } else {
            this.status = 400;
            this.redirect('/');
        }
    });

    api.post('/user/reset-password/request', function *(next) {
        var body = this.request.body;
        var cookies = this.request.headers.cookie;
        var localeStr = cookies.match(/locale=\%22([a-z_]+?)\%22/);
        var locale = 'en';
        if (localeStr && localeStr[1]) {
            locale = localeStr[1];
        }
        //TODO: check locale in support list
        if (body && body.username
            && body.email && validator.isEmail(body.email)) {
            var user = new Users();
            var u = yield user.getByUsername(body.username);
            if (!u || u.email !== body.email.toLowerCase()) {
                this.status = 403;
                return;
            }
            var info = yield user.updateResetKey();
            if (info) {
                var resetLink = config['web'].web_domain_prefix + '/user/reset-password/' + info.resetKey;
                this.body = yield mailer(u.email, locale, 'reset_password', { username: u.username, resetLink: resetLink });
            } else {
                this.body = { success: false };
            }
        } else {
            this.status = 403;
        }
    });

    api.post('/user/reset-password', function *(next) {
<<<<<<< HEAD
        if (this.request.body) {
            var resetKey = this.request.body.resetKey;
            var password = this.request.body.password;
            if (resetKey && password) {
                var user = new Users();
                var u = yield user.getByResetKey(resetKey);
                if (u) {
                    yield user.setPassword(password);
                    this.body = { success: true };
                    return;
                }
=======
        var resetKey = this.request.body.resetKey;
        var password = this.request.body.password;
        var now = new Date().getTime();
        if (resetKey && password) {
            var user = new Users();
            var u = yield user.getByResetKey(resetKey, now);
            if (u) {
                yield user.setPassword(password);
                this.body = { success: true };
            } else {
                this.body = { success: false };
>>>>>>> 7bdfdbb576c284a6a01e1ddc3a83e7570bda4b11
            }
        }
        this.body = { success: false };
    });
};
