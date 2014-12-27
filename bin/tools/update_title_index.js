
var co = require('./../../node_modules/koa/node_modules/co');
var config = require('./../../config');
var models = require('./../../models'),
  Torrents = models.Torrents;

var main = module.exports = function *() {
  var torrent = new Torrents();
  var torrents = yield torrent.getAll();
  for (var i = 0; i < torrents.length; i++) {
    var t = torrents[i];
    if (t.title) {
      var titleIndex = Torrents.makeIndexArray(t.title);
      torrent._id = t._id;
      yield torrent.update({titleIndex: titleIndex});
      console.log(t.title, titleIndex.join());
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
  var fn = co(main);
  fn.call(ctx, onerror);
}, 800);


