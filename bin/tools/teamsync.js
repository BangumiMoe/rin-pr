
var co = require('./.co');

var validator = require('validator');
var config = require('./../../config');
var models = require('./../../models'),
  Files = models.Files,
  Teams = models.Teams,
  Tags = models.Tags,
  Torrents = models.Torrents;

var TeamSync = require('./../../lib/teamsync');

var torrent_id;
if (process.argv.length > 2) {
  torrent_id = process.argv[2];
  if (!validator.isMongoId(torrent_id)) {
    torrent_id = '';
  }
}

if (torrent_id) {
  console.log('Torrent id:', torrent_id);
} else {
  console.log('Please provide torrent id.');
  process.exit(1);
}

var main = function *() {
  var torrent = new Torrents();
  var to = yield torrent.find(torrent_id);
  if (to && to.team_id) {
    var te = yield new Teams().find(to.team_id);
    var f = yield new Files().find(to.file_id);
    if (te && f) {
      console.log('Start TeamSync...');
      if (!to.teamsync) {
        yield torrent.update({teamsync: true});
      }
      TeamSync(te, to, f.savepath, to.category_tag_id);
      return;
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
