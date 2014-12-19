
var co = require('./../../node_modules/koa/node_modules/co');

var Models = require('./../../models'),
  TeamAccounts = Models.TeamAccounts,
  Torrents = Models.Torrents;

function *main(team, torrent) {
  //console.log('main', team, torrent);

  //console.log('TeamSync done');
}

function TeamSync(team, torrent) {
  if (!team || !torrent || !team._id || !torrent._id) {
      return false;
  }
  setTimeout(function () {
    var ctx = new Object();
    var fn = co(main);
    fn.call(ctx, team, torrent, onerror);
  }, 8000);
  return true;
}

function onerror(err) {
  if (err) {
    console.error(err.stack);
  }
}

module.exports = TeamSync;