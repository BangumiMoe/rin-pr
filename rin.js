/**
 * prpr.js
 * Rin prpr!
 *
 * rin-pr project main app
 */

var config = require('./config');
var koa = require('koa'),
    mount = require('koa-mount');

var api = require('./controller/api'),
    Middlewares = require('./lib/middlewares');

var app = module.exports = koa();

Middlewares(app);
app.use(mount('/api', api.middleware()));

/*
* Development static file server only.
* */
if (config['app'].dev_mode && config['web'].staticFileServer) {
    var serve = require('koa-static');
    app.use(serve('public/'));
}
