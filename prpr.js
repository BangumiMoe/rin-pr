/**
 * prpr.js
 * Rin prpr!
 *
 * rin-pr project main app
 */

var koa = require('koa'),
    logger = require('koa-logger'),
    mount = require('koa-mount'),
    router = require('koa-router');

var app = koa();
var api = require('./controller/api');

app.use(logger());

app.use(mount('/api', api.middleware()));

module.exports = app;
