/**
 * prpr.js
 * Rin prpr!
 *
 * rin-pr project main app
 */
var koa = require('koa'),
    mount = require('koa-mount');

var api = require('./controller/api'),
    Middlewares = require('./lib/middlewares');

var app = module.exports = koa();

Middlewares(app);
app.use(mount('/api', api.middleware()));
