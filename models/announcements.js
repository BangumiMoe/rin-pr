
var config = require('./../config');

var util = require('util'),
  _ = require('underscore'),
  validator = require('validator');

var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;

function Announcements(a) {
  ModelBase.call(this);

  if (a) {
    if (a._id) {
      this._id = new ObjectID(a._id);
    }
    this.user_id = new ObjectID(a.user_id);
    this.title = a.title;
    this.content = a.content;
  }
}

util.inherits(Announcements, ModelBase);

Announcements.prototype.set = function (a) {
  if (a) {
    this.user_id = a.user_id;
    this.title = a.title;
    this.content = a.content;
    this.createdAt = a.createdAt;
  } else {
    this.user_id = this.title =
      this.content = this.createdAt = undefined;
  }
  return a;
};

Announcements.prototype.ensureIndex = function *() {
  yield this.collection.ensureIndex({
        createdAt: -1
    }, { background: true, w: 1 });
};

Announcements.prototype.valueOf = function () {
  return {
    user_id: this.user_id,
    title: this.title,
    content: this.content,
    createdAt: this.createdAt
  };
};

Announcements.prototype.list = function *() {
  return yield this.collection.find().sort({ createdAt: -1 }).toArray();
};

Announcements.prototype.unread = function *(since, user_id) {
  //need cache?
  var unreadCount = yield this.collection.count({ createdAt: { $gt: since } });
  return unreadCount;
};

Announcements.prototype.save = function *() {
  var ann = {
    user_id: this.user_id,
    title: this.title,
    content: this.content,
    createdAt: new Date()
  };
  var a = yield this.collection.save(ann);
  if (a) {
    this.set(a);
    return a;
  }
  return null;
};

module.exports = Announcements;

ModelBase.register('announcements', Announcements);
