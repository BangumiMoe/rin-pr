
var validator = require('validator');
var Models = require('./../../models'),
  Users = Models.Users;

module.exports = function (api) {

api.post('/user/signin', function *(next) {
  this.body = {};
});

api.get('/user/signout', function *(next) {
  this.session = null;
  this.user = null;
  this.body = { success: true };
});

};