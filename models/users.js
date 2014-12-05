
var util = require('util');
var ModelBase = require('./base');

function Users() {
  ModelBase.call(this);
}

util.inherits(Users, ModelBase);

Users.prototype.save = function () {
  //TODO: this.collection
};

module.exports = Users;

ModelBase.register('users', Users);