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

tracker.init();
cache.init();
