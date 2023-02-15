var config = require('./../config');

var path = require('path'),
    fs = require('fs'),
    hat = require('hat');

var logger = require('koa-logger'),
    session = require('koa-session'),
    router = require('koa-router');

var parse = require('co-body'),
    multipartparse = require('co-busboy');

var Models = require('./../models'),
    Users = Models.Users;

Users.middleware = function () {
    return function *(next) {
        if (this.session.user && this.session.signTime) {
            var u = new Users({_id: this.session.user._id});
            var logged = false;

            if (yield u.find()) {
              //security check
              if (new Date().valueOf() - this.session.signTime < config['security']['maxAge']) {
                if (this.session.signHash === u.signHash()) {
                  logged = true;
                }
              }
            }

            if (logged) {
                this.user = u;
            } else {
                this.session = null;
            }
        }
        return yield next;
    };
};

module.exports = function (app) {

    // Set proxy = true to support nginx proxy
    app.proxy = true;

    app.keys = config['security']['keyGrip'];

    if (config['app']['dev_mode']) {
        app.use(logger());
    }

    app.use(session({maxAge: config['security']['maxAge']}, app));

    app.use(function *(next) {
        //check locale
        var needset = false;
        var locale = this.cookies.get('locale');
        if (!locale || config['app']['langs'].indexOf(locale) < 0) {
            needset = config['app']['override_lang'];
            var found = false;
            var langs = this.acceptsLanguages();
            if (langs && langs.length > 0) {
                for (var i = 0; i < langs.length; i++) {
                    var lang = langs[i]
                        .toLowerCase()
                        .replace('zh-Hans', 'zh')
                        .replace('-', '_');
                    if (config['app']['langs'].indexOf(lang) >= 0) {
                        locale = lang;
                        found = true;
                        break;
                    }
                }
            }
            if (!found) {
                locale = config['app']['def_lang'];
            }
        }
        if (needset) {
            this.cookies.set('locale', locale,
                {maxAge: config['security']['maxAge'], httpOnly: false, signed: false});
        }
        this.locale = locale;

        yield next;
    });

    app.use(function *(next) {
        var have_files = false;
        if (this.request.is('multipart/*')) {
            var parts = multipartparse(this);
            var part;
            var body = {};
            var files = {};
            while (part = yield parts()) {
                if (part.length) {
                    // arrays are busboy fields
                    body[part[0]] = part[1];
                } else {
                    // otherwise, it's a stream
                    var extName = path.extname(part.filename);
                    var tmpFileName = hat(96, 36);
                    var savepath = path.resolve(config['sys'].tmp_dir + tmpFileName);
                    part.pipe(fs.createWriteStream(savepath));

                    files[part.fieldname] = {
                        filename: part.filename,
                        mimeType: part.mimeType,
                        extname: extName.toLowerCase(),
                        savename: tmpFileName,
                        savepath: savepath
                    };

                    have_files = true;
                }
            }
            this.request.body = body;
            this.request.files = files;
        } else if ('POST' == this.method) {
            try {
              var body = yield parse.json(this); //, { limit: '1kb' }
              this.request.body = body;
            } catch (e) {
              this.request.body = {};
            }
        }

        yield next;

        if (have_files) {
          //delete tmp files
          var files = this.request.files;
          for (var k in files) {
            fs.unlink(files[k].savepath, function () {});
          }
        }
    });

    app.use(Users.middleware());

//JSON error handling
    app.use(function *pageNotFound(next) {
        yield next;
        if (404 != this.status) return;
        this.status = 404;
        this.body = {
            errno: 404,
            message: 'Page Not Found'
        };
    });

    app.use(function *(next) {
        try {
            yield next;
        } catch (err) {
            this.status = 500;
            //TODO: only for dev
            this.body = {
                errno: 500,
                message: err.toString()
            };
        }
    });

};
