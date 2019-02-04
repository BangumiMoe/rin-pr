
var fs = require('fs');
var co = require('co');

var validator = require('validator');
var config = require('./../../config');
var models = require('./../../models'),
  Files = models.Files,
  Teams = models.Teams,
  Tags = models.Tags,
  Torrents = models.Torrents,
  TeamAccounts = models.TeamAccounts;

var TeamSync = require('./../../lib/teamsync');
var BtSite = require('./../../lib/teamsync/bt-sites').BTSite;

var torrent_id, fromTime;
if (process.argv.length > 3 && process.argv[2] === '--from') {
  fromTime = new Date(process.argv[3]);
} else if (process.argv.length > 2) {
  torrent_id = process.argv[2];
  if (!validator.isMongoId(torrent_id)) {
    torrent_id = '';
  }
}

if (torrent_id) {
  console.log('Torrent id:', torrent_id);
} else if (fromTime) {
  console.log('From time:', fromTime);
} else {
  console.log('Please provide torrent id.');
  process.exit(1);
}

function publish(siteName, to, accounts, team, savepath) {
  return function (callback) {
    var tbuf = fs.readFileSync(config['sys'].public_dir + savepath)
    var bts = BtSite(siteName, to.team_id, to.category_tag_id)
    bts.init(accounts, function (err) {
      if (err) {
        return callback(err)
      }
      bts.login(function (err, islogin) {
        if (err) {
          return callback(err)
        }
        if (bts.dirty) {
          // relogined
          accounts.dirty = true
          accounts.cookie = bts.m_cookie
        }
        bts.upload(to.title, to.introduction, tbuf, function (err, succeed) {
          if (err) {
            return callback(err)
          }
          bts.getlastpublish(function (err, last) {
            if (err) {
              callback(null, 'published, but URL was not found')
            } else {
              callback(null, last.url)
            }
          })
        })
      })
    })
  }
}

function *update(torrents) {
  var oteams = new Teams()
  var ofiles = new Files()
  var otorrent = new Torrents()
  var ta = new TeamAccounts()
  var accountsList = {}
  var teamsList = {}
  for (var i = 0; i < torrents.length; i++) {
    var to = torrents[i]
    if (to && to.team_id) {
      if (to.sync) {
        var steam_id = to.team_id.toString()
        for (var siteName in to.sync) {
          var syncStatus = to.sync[siteName]
          if (typeof syncStatus === 'string') {
            if (!(/^https?:\/\//.test(syncStatus))) {
              var accounts, team
              if (accountsList[steam_id]) {
                accounts = accountsList[steam_id]
              } else {
                accounts = yield ta.getByTeamId(to.team_id);
                accountsList[steam_id] = accounts
              }
              if (teamsList[steam_id]) {
                team = teamsList[steam_id]
              } else {
                team = yield oteams.find(to.team_id)
                teamsList[steam_id] = team
              }
              var f = yield ofiles.find(to.file_id)
              var account = accounts.filter(function (acc) {
                return acc.site === siteName
              })[0]
              console.log('publishing', to.title, f.savepath)
              var lastUrl
              try {
                lastUrl = yield publish(siteName, to, account, team, f.savepath)
                console.log('succeed', lastUrl)
              } catch (e) {
                console.log('failed', e)
                if (typeof e === 'string') {
                  lastUrl = e
                }
              }
              if (lastUrl) {
                otorrent.set({ _id: to._id })
                yield otorrent.update({ ['sync.' + siteName]: lastUrl })
              }
            }
          }
        }
      } else {
        // need resync
        if (to.teamsync) {
          var team = new Teams({_id: to.team_id});
          var tt = yield team.find();
          var f = yield ofiles.find(to.file_id)
          console.log('restarting teamsync', to.title, f.savepath)
          yield function (cb) {
            TeamSync(tt, to, f.savepath, to.category_tag_id, f.filename, cb);
          }
        }
      }
    }
  }
}

var main = function *() {
  var otorrent = new Torrents()
  var torrent = yield otorrent.find(torrent_id)
  yield update.call(this, [ torrent ])
  process.exit(0)
};

var mainFromTime = function *() {
  var otorrent = new Torrents()
  var torrents = yield otorrent.getByQuery({ publish_time: { $gte: fromTime } })
  yield update.call(this, torrents)
  process.exit(0)
};

function onerror(err) {
  if (err) {
    console.error(err.stack);
  }
}

setTimeout(function () {
  var ctx = new Object();
  var fn = co.wrap(torrent_id ? main : mainFromTime);
  fn.call(ctx).catch(onerror);
}, 800);
