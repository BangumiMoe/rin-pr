/**
 * controller/rss/index.js
 * Rin prpr!
 *
 * rin-pr download controller
 */

var Router = require('koa-router');
var rss = new Router();

require('./rss')(rss);

module.exports = rss;
