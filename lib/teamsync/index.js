
var config = require('./../../config');
var fs = require('fs');
var co = require('./../../node_modules/koa/node_modules/co'),
  _ = require('underscore');
var EventProxy = require('eventproxy');

var Models = require('./../../models'),
  Tags = Models.Tags,
  Files = Models.Files,
  TeamAccounts = Models.TeamAccounts,
  Torrents = Models.Torrents;

var BTSite = require('./bt-sites').BTSite;
var rawsTagId;

function publish(team_id, syncAccounts, title, intro, filepath, category) {
  var queue = [];
  var epName = [];
  for (var i = 0; i < syncAccounts.length; i++) {
    if (syncAccounts[i].enable && syncAccounts[i].site && syncAccounts[i].username
      && (syncAccounts[i].password || syncAccounts[i].cookie)) {
      queue.push({
        i: i,
        site: syncAccounts[i].site,
        account: syncAccounts[i]
      });
      epName.push(syncAccounts[i].site);
    }
  }
  if (epName.length <= 0) {
    return function (callback) {
      callback(null, {});
    };
  }
  return function (callback) {
    var ep = new EventProxy();
    //it will get from user upload
    ep.all(epName, function () {
      var bt_sites = {};
      for (var i = 0; i < arguments.length; i++) {
        if (typeof arguments[i] == 'object') {
          bt_sites[epName[i]] = JSON.stringify(arguments[i]);
        } else {
          bt_sites[epName[i]] = arguments[i];
        }
      }
      if (callback) callback(null, bt_sites);
    });
    ep.fail(function (err) {
      if (callback) callback(err);
    });
    ep.once('torrent_buf', function (tbuf) {
      epName.forEach(function (btsname, i) {
        var bts = BTSite(btsname, team_id, category);
        var q = queue[i];
        bts.init(q.account, function (err) {
          if (err) {
            console.error(err);
            ep.emit(btsname, 'failed');
            return;
          }
          bts.login(function (err, islogin) {
            if (err) {
              //console.error(err);
            }
            if(!err && islogin) {
              if (bts.dirty) {
                syncAccounts[q.i].dirty = true;
                syncAccounts[q.i].cookie = bts.m_cookie;
              }

              var fn_get_last = function () {
                bts.getlastpublish(function (err, last) {
                  if (err) {
                    ep.emit(btsname, 'published, but URL was not found');
                  } else {
                    ep.emit(btsname, last.url);
                  }
                });
              };

              var fn_start_upload = function (err, retries) {
                if (retries) {
                  if (retries >= 3) {
                    ep.emit(btsname, (err ? err : 'publish failed'));
                    return;
                  }
                } else {
                  retries = 0;
                }
                bts.upload(title, intro, tbuf, function (err, succeed) {
                  if (err) {
                    //console.error(err);
                    if ((typeof err == 'string' && err == 'unknown error')
                      || (typeof err == 'object' && err.code == 'ETIMEDOUT')) {
                      //retry
                      fn_start_upload(err, retries + 1);
                      return;
                    }
                    if (typeof err == 'string' && retries > 0 && (
                      (err.indexOf('请间隔一段时间再顶种') !== -1)
                      || (err.indexOf('上传的Torrent文件已存在') !== -1)
                      )) {
                      fn_get_last();
                      return;
                    }
                  }
                  if (succeed) {
                    fn_get_last();
                  } else {
                    ep.emit(btsname, (err ? err : 'publish failed'));
                  }
                });
              };

              try {
                fn_start_upload();
              } catch (err) {
                ep.emit(btsname, (err ? err : 'publish failed'));
              }
            } else {
              ep.emit(btsname, (err ? err : 'login failed'));
            }
          });
        }); //bts.init
      }); //_.each
    });
    fs.readFile(config['sys'].public_dir + filepath, ep.done('torrent_buf'));
  };
}

function *main(team, torrent, filepath, category_tag_id) {
  var ta = new TeamAccounts();
  var to = new Torrents({_id: torrent._id});
  var accounts = yield ta.getByTeamId(team._id);

  var cateName;
  if (!rawsTagId) {
    var rawsTag = yield new Tags().getByName('raws');
    if (rawsTag) {
      rawsTagId = rawsTag._id.toString();
    }
  }
  if (rawsTagId && torrent.tag_ids && torrent.tag_ids.length > 0) {
    if (_.find(torrent.tag_ids, function (oid) {
      return oid.toString() == rawsTagId;
    })) {
      cateName = 'raws';
    }
  }
  if (!cateName) {
    var tag = yield new Tags().find(category_tag_id);
    cateName = ((tag && tag.name) ? tag.name.toLowerCase() : null);
  }

  var content = torrent.introduction;
  if (team.signature) {
    content += '<br>' + team.signature;
  }

  var status = yield publish(team._id, accounts, torrent.title, content, filepath, cateName);
  yield to.setSyncStatus(status);

  for (var i = 0; i < accounts.length; i++) {
    if (accounts[i].dirty) {
      ta.set({_id: accounts[i]._id});
      yield ta.update({cookie: accounts[i].cookie});
    }
  }
}

function *fail(err, torrent_id) {
  var to = new Torrents({_id: torrent_id});
  if (typeof err == 'object') {
    err = JSON.stringify(err);
  }
  yield to.setSyncStatus({error: err});
}

function onerror(err) {
  //update torrent
  if (err) {
    var torrent_id = this.torrent_id;
    if (torrent_id) {
      setImmediate(function () {
        var ctx = new Object();
        var fn = co.wrap(fail);
        fn.call(ctx, err, torrent_id).catch(onerror);
      });

      console.error(torrent_id, err.stack);
    } else {
      console.error(err.stack);
    }
  }
}

function TeamSync(team, torrent, filepath, category_tag_id) {
  if (!team || !torrent || !team._id || !torrent._id) {
      return false;
  }
  setImmediate(function () {
    var ctx = new Object();
    ctx.torrent_id = torrent._id;

    var fn = co.wrap(main);
    fn.call(ctx, team, torrent, filepath, category_tag_id).catch(onerror);
  });
  return true;
}

module.exports = TeamSync;
