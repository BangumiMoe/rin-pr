/**
 * controller/api/index.js
 * Rin prpr!
 *
 * rin-pr api controller
 */

var Router = require('koa-router');
var api = new Router();

api.get('', function *(next) {
  this.body = {success: true};
});

module.exports = api;
