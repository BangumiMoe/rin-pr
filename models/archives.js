
var config = require('./../config');

var util = require('util'),
  _ = require('underscore'),
  validator = require('validator');

var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;

function Archives(a) {
  ModelBase.call(this);

  if (a) {
    this.type = a.type;
    this.user_id = a.user_id;
    this.auditing = a.auditing;
    this.data = a.data;
  }
}

util.inherits(Archives, ModelBase);

Archives.prototype.set = function (a) {
  if (a) {
    this.type = a.type;
    this.user_id = a.user_id;
    this.auditing = a.auditing;
    this.data = a.data;
    this.createdAt = a.createdAt;
  } else {
    this.type = this.user_id = this.auditing = 
      this.data = this.createdAt = undefined;
  }
  return a;
};

Archives.prototype.ensureIndex = function *() {
  yield this.collection.ensureIndex({
        type: 1, createdAt: -1
    }, { background: true, w: 1 });
};

Archives.prototype.valueOf = function () {
  return {
    type: this.type,
    user_id: this.user_id,
    auditing: this.auditing,
    data: this.data,
    createdAt: this.createdAt
  };
};

Archives.prototype.save = function *() {
  var archive = {
    type: this.type,
    user_id: this.user_id,
    auditing: this.auditing,
    data: this.data,
    createdAt: new Date()
  };
  var a = yield this.collection.save(archive);
  if (a) {
    this.set(a);
    return a;
  }
  return null;
};

module.exports = Archives;

ModelBase.register('archives', Archives);