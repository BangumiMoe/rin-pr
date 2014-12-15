/**
 * prpr.js
 * Rin prpr!
 *
 * rin-pr project main app
 */

var config = require('./config');
var koa = require('koa');

var controller = require('./controller'),
    middlewares = require('./lib/middlewares'),
    tracker = require('./lib/tracker'),
    cache = require('./lib/cache');

var app = module.exports = koa();

middlewares(app);
controller(app);

/*
* Development static file server only.
* */
if (config['app'].dev_mode && config['web'].static_file_server) {
    var serve = require('koa-static');
    app.use(serve('public/'));
}

tracker.init();
cache.init();
