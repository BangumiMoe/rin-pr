
var co = require('./../../node_modules/koa/node_modules/co');

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
  var to = torrent.find(torrent_id);
  if (to && to.team_id) {
    var te = new Teams().find(to.team_id);
    var f = new Files().find(to.file_id);
    console.log('Start TeamSync...');
    TeamSync(te, to, f.savepath, to.category_tag_id);
  }
  //process.exit(0);
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