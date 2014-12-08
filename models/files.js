"use strict";

var util = require('util');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;

function Files(file) {
  ModelBase.call(this);
  if (file) {
    if (file._id) this._id = file._id;
  }
}

util.inherits(Files, ModelBase);

Files.prototype.load = function (type, file, user_id) {
  this._valid = true;

  this.filename = file.filename;
  this.savename = file.savename;
  this.path = file.savepath;
  this.extname = file.extname;
  this.uploader_id = ObjectID(user_id);

  switch (this.extname) {
    case '.torrent':
      this.type = 'torrent';
      break;
    default:
      this._valid = false;
      break;
  }
  if (type && this.type !== type) {
    this._valid = false;
  }
};

Files.prototype.valid = function() {
  return this._valid;
};

Files.prototype.valueOf = function() {
  return {
    _id: this._id,
    type: this.type,
    filename: this.filename,
    filesize: this.filesize,
    savepath: this.savepath,
    uploader_id: this.uploader_id,
    uploadDate: this.uploadDate,
  };
};

Files.prototype.save = function *() {
  var date = new Date();
  var mm = String(date.getMonth() + 1);
  if (mm.length < 2) mm = '0' + mm;

  //use unix path format
  var savepath = 'data/' + this.type + 's/' + date.getFullYear().toString() + '/' + mm;
  var that = this;

  var presave = function () {
    return function (callback) {
      mkdirp('./public/' + savepath, function (err, md) {
        fs.stat(that.path, function (err, stat) {
          if (err) {
            return callback(err);
          }

          savepath = savepath + '/' + that.savename + that.extname;
          var newpath = path.join(sys_config.public_dir, savepath);

          fs.rename(this.path, newpath, function (err) {
          var f = {
            type: that.type,
            filename: that.filename,
            filesize: stat['size'],
            savepath: savepath,
          };

          callback(f);
        });
      });
    };
  };

  var f = yield presave();
  if (f) {
    f.uploader_id = this.uploader_id;
    f.uploadDate = new Date();
    return yield this.collection.save();
  }

  return null;
};

module.exports = Files;

ModelBase.register('files', Files);
