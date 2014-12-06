/**
 * controller/api.js
 * Rin prpr!
 *
 * rin-pr api controller
 */

var Router = require('koa-router');

var api = new Router();

var Users = require('./../models').Users;

api.get('/', function *() {
    var u = new Users({name: 'teng', password: '123456', email: 'test@email.com'});
    var y = yield u.save();
    this.body = y;
});

module.exports = api;
