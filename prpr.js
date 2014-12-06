/**
 * prpr.js
 * Rin prpr!
 *
 * rin-pr project main app
 */
var config = require('./config');

var koa = require('koa'),
    logger = require('koa-logger'),
    mount = require('koa-mount'),
    session = require('koa-session'),
    router = require('koa-router');

var app = koa();
var api = require('./controller/api');

app.keys = config['security']['keyGrip'];

app.use(logger());

app.use(session({maxAge: config['security']['maxAge']}));

app.use(mount('/api', api.middleware()));

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

module.exports = app;
