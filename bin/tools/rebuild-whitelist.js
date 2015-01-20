
var config = require('./../../config');

var co = require('./../../node_modules/koa/node_modules/co');
var tracker = require('./../../lib/tracker');

var Models = require('./../../models'),
  Torrents = Models.Torrents;

function *main() {
  var torrent = new Torrents();

  console.log('rebuilding...');

  var infohashs = [];
  var page_count = yield torrent.getPageCount();
  for (var i = page_count; i > 0; i--) {
    var ts = yield torrent.getByPage(i);
    for (var j = ts.length - 1; j >= 0; j--) {
      infohashs.push(ts[j].infoHash);
    }
  }

  console.log('infohash count:', infohashs.length);

  console.log('writing...');
  if (infohashs.length > 0) {
    tracker.whitelist_rebuild(infohashs, function (err) {
      if (err) {
        console.error(err);
      } else {
        console.log('done.');
      }
      process.exit(0);
    });
  }
}

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

tracker.init();
