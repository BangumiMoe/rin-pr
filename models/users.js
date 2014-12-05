
var util = require('util'),
  pw = require('./../lib/password');
var ModelBase = require('./base');

function Users(user) {
  ModelBase.call(this);

  this.name = user.name;
  this.email = user.email;
  this.password = user.password;
}

util.inherits(Users, ModelBase);

Users.prototype.check = function () {
};

Users.prototype.save = function* () {
  //TODO: this.collection
  var user = {
    name: this.name,
    email: this.email,
    password: pw.password_hash(this.password)
  };

  return yield this.collection.insert(user, {safe: true});
};

module.exports = Users;

ModelBase.register('users', Users);