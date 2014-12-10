/**
 * controller/download/index.js
 * Rin prpr!
 *
 * rin-pr download controller
 */

var Router = require('koa-router');
var dl = new Router();

require('./torrent')(dl);

module.exports = dl;
