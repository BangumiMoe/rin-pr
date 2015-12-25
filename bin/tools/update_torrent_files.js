
var _ = require('underscore');
var co = require('./../../node_modules/koa/node_modules/co');
var config = require('./../../config');
var models = require('./../../models'),
  Torrents = models.Torrents;
var ObjectID = require('mongodb').ObjectID;

function torrent_content_update(contents) {
  //_____padding_file_0_如果您看到此文件，请升级到BitComet(比特彗星)0.85或以上版本____
  const padding_file_regex = /^_____padding_file_\d+?_.+?____$/;
  var tc = [];
  for (var i = 0; i < contents.length; i++) {
    var cont = contents[i];
    var path;
    if (typeof cont === 'string') {
      path = cont;
    } else if (cont instanceof Array) {
      path = cont[0];
    }
    if (!path) continue;
    var filename;
    var hasSplash = (path.indexOf('/') >= 0 || path.indexOf('\\') >= 0);
    if (hasSplash) {
      var ti = path.lastIndexOf('/');
      if (ti < 0) {
        ti = path.lastIndexOf('\\');
      }
      if (ti >= 0) {
        filename = path.substr(ti + 1);
      } else {
        filename = path;
      }
    } else {
      filename = path;
    }
    if (!padding_file_regex.test(filename)) {
      tc.push(cont);
    }
  }
  return tc;
}

var main = module.exports = function *() {
  var torrent = new Torrents();
  var torrents = yield torrent.getAll();

  for (var i = 0; i < torrents.length; i++) {
    var t = torrents[i];
    if (t.content && t.content.length > 0) {
      var tc = torrent_content_update(t.content);
      if (tc && tc.length !== t.content.length) {
        console.log(t.title, JSON.stringify(tc));
        torrent._id = t._id;
        yield torrent.update({content: tc});
      }
    }
  }

  process.exit(0);
};

function onerror(err) {
  if (err) {
    console.error(err.stack);
  }
}

setTimeout(function () {
  var ctx = new Object();
  var fn = co.wrap(main);
  fn.call(ctx).catch(onerror);
}, 800);
