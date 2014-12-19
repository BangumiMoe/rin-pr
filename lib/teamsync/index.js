
var co = require('./../../node_modules/koa/node_modules/co');

function TeamSync(team, torrent) {
  if (!team || !torrent || !team._id || !torrent._id) {
      return false;
  }
  return true;
}

module.exports = TeamSync;