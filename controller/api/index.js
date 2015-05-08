/**
 * controller/api/index.js
 * Rin prpr!
 *
 * rin-pr api controller
 */

var Router = require('koa-router');
var api = new Router();

require('./announcement')(api);
require('./user')(api);
require('./tag')(api);
require('./bangumi')(api);
require('./torrent')(api);
require('./team')(api);
require('./file')(api);
require('./tracker')(api);

module.exports = api;
