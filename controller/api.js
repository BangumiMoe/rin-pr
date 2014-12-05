/**
 * controller/api.js
 * Rin prpr!
 *
 * rin-pr api controller
 */

var Router = require('koa-router');

var api = new Router();

api.get('/', function *() {
    this.body = 'prpr';
});

module.exports = api;
