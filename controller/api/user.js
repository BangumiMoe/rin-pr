
var config = require('./../../config');

var crypto = require('crypto'),
    validator = require('validator'),
    common = require('./../../lib/common'),
    mailer = require('./../../lib/mailer');

var Models = require('./../../models'),
    RssCollections = Models.RssCollections,
    Users = Models.Users,
    Teams = Models.Teams;

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
        var locale = this.locale ? this.locale : 'en';
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
                    if (yield common.ipflowcontrol('register', this.ip, 2)) {
                        this.body = {success: false, message: 'too frequently'};
                        return;
                    }
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
                } else {
                    this.body = {success: false, message: 'user already exists'};
                    return;
                }
            }
        }
        this.body = {success: false};
    });

    api.post('/user/update', function *(next) {
        if (this.user) {
            var body = this.request.body;
            if (body) {
              var updated = false;
              if (body.receive_email !== undefined) {
                var remail = !!body.receive_email;
                yield this.user.update({receive_email: remail});
                updated = true;
              }
              if (body.password && body.new_password
                && typeof body.new_password == 'string'
                && body.new_password.length >= 6) {
                var user = this.user;
                if (user.checkPassword(body.password, false)) {
                    yield user.setPassword(body.new_password);
                    this.session.signHash = user.signHash();
                    updated = true;
                }
              }
              if (updated) {
                this.body = { success: true };
                return;
              }
            }
        }
        this.body = {success: false};
    });

    api.post('/user/signin', function *(next) {
        var body = this.request.body;
        if (body && body.username && body.password) {
            if (yield common.ipflowcontrol('signin', this.ip, 5)) {
                this.body = {success: false, message: 'too frequently'};
                return;
            }
            var user = new Users();
            var u;
            if (validator.isEmail(body.username)) {
              u = yield user.getByEmail(body.username);
            } else {
              u = yield user.getByUsername(body.username);
            }
            if (u) {
                if (user.checkPassword(body.password, false)) {
                    this.body = {success: true, user: user.expose()};
                    this.session.user = user.valueOf();
                    this.session.signHash = user.signHash();
                    this.session.signTime = new Date().valueOf();
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
        if (this.session && this.session.user && this.user) {
            this.body = this.user.valueOf();
        } else {
            this.body = {};
        }
    });

    function get_sso_info(user) {
      var r = {};
      if (user && config['sso'] && config['sso'].disqus) {
        var message = {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          avatar: config['app'].base_url + '/avatar/' + common.md5(user.email)
        };
        var smsg = new Buffer(JSON.stringify(message)).toString('base64');
        var timestamp = Math.round(new Date().valueOf() / 1000).toString();
        var text = smsg + ' ' + timestamp;
        var hash = crypto.createHmac('sha1', config['sso'].disqus.secret_key)
          .update(text).digest('hex');
        r.remote_auth_s3 = smsg + ' ' + hash + ' ' + timestamp;
        r.api_key = config['sso'].disqus.public_key;
      }
      return r;
    }

    api.get('/v2/user/session', function *(next) {
        if (this.session && this.session.user && this.user) {
            var _id = this.user._id.toString();
            var r = yield this.user.cache.get('session-v2/' + _id);
            if (r !== null) {
              this.body = r;
              return;
            }
            var u = this.user.valueOf();
            var team = new Teams();
            var ts = yield team.getByUserMember(this.user._id);
            if (ts) {
              u.teams = Teams.filter(ts);
            }
            ts = yield team.getByUserAuditing(this.user._id);
            if (ts) {
              u.auditing_teams = Teams.filter(ts);
            }
            u.sso = get_sso_info(this.user);
            yield this.user.cache.set('session-v2/' + _id, u);
            this.body = u;
        } else {
            this.body = {};
        }
    });

    api.get('/user/sso/disqus', function *(next) {
      this.body = get_sso_info(this.user);
    });

    api.post('/user/fetch', function *(next) {
        var body = this.request.body;
        if (body) {
            var u = new Users();
            if (body._ids && validator.isMongoIdArray(body._ids)) {
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
        var locale = this.locale ? this.locale : 'en';

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
        if (this.request.body) {
            var resetKey = this.request.body.resetKey;
            var password = this.request.body.password;
            if (resetKey && password && Users.checkResetKey(resetKey)
              && typeof password === 'string') {
                var user = new Users();
                var u = yield user.getByResetKey(resetKey);
                if (u) {
                    yield user.setPassword(password);
                    this.body = { success: true };
                    return;
                }
            }
        }
        this.body = { success: false };
    });

    api.get('/user/subscribe/collections', function *(next) {
        if (this.user && this.user.isActive()) {
            var rc = yield new RssCollections().findByUserId(this.user._id);
            if (rc && rc.collections) {
                this.body = rc.collections;
                return;
            }
        }
        this.body = [];
    });

    api.post('/user/subscribe/update', function *(next) {
        var body = this.request.body;
        if (body && this.user && this.user.isActive()) {
            var rc = new RssCollections({
                user_id: this.user._id,
                collections: body.collections
            });
            if (rc.valid()) {
                var r = yield rc.save();
                if (r) {
                    this.body = { success: true };
                    return;
                }
            }
        }
        this.body = { success: false };
    });
};
