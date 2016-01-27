
var _ = require('underscore'),
  filesize = require('filesize'),
  common = require('./common');

var Models = require('./../models'),
  Torrents = Models.Torrents,
  Users = Models.Users,
  Teams = Models.Teams,
  Tags = Models.Tags;

function *get_objects_tags(objs) {
  var tag_ids = [];
  for (var i = 0; i < objs.length; i++) {
    if (objs[i].tag_id) {
      tag_ids.push(objs[i].tag_id.toString());
    }
  }
  tag_ids = _.uniq(tag_ids);
  if (tag_ids.length) {
    var tags = yield new Tags().find(tag_ids);
    for (var i = 0; i < objs.length; i++) {
      if (objs[i].tag_id) {
        objs[i].tag = _.find(tags, function (t) {
          return t._id.toString() === objs[i].tag_id.toString();
        });
      }
    }
  }
}

function *get_working_teams(tag_ids, querytags) {
  var r = {};
  if (tag_ids.length > 0) {
      var torrents = new Torrents();
      var teams = new Teams();
      teams.cache.ttl = 24 * 60 * 60; //cache for 1 day

      tag_ids = _.uniq(tag_ids);
      var k = 'working';
      if (querytags) {
        k += '-v2';
      }
      k += '/hash/' + common.md5(tag_ids.slice().sort().join());
      r = yield teams.cache.get(k);
      if (r !== null) {
          return r;
      }
      r = {};
      var ts = yield torrents.getInTags(tag_ids);
      if (ts.length > 0) {
          var torrentTags = [];
          ts.forEach(function(t) {
              torrentTags = torrentTags.concat(t.tag_ids);
          });
          var teamTags = yield new Tags().getTeamInTags(torrentTags);
          if (teamTags.length > 0) {
              var ttagids = _.map(teamTags, _.iteratee('_id'));
              var tms = yield teams.getByTagId(ttagids);
              if (tms.length > 0) {
                  if (querytags) {
                    yield get_objects_tags(tms);
                  }
                  tag_ids.forEach(function (btid) {
                      var _tms = [];
                      ts.forEach(function(t) {
                          if (_.find(t.tag_ids, function (oid) {
                              return oid.toString() == btid;
                          })) {
                              var ttms = _.filter(tms, function (tm) {
                                  return !!_.find(t.tag_ids, function (oid) {
                                      return oid.toString() == tm.tag_id.toString();
                                  });
                              });
                              _tms = _.uniq(_tms.concat(ttms));
                          }
                      });
                      if (_tms.length > 0) {
                          r[btid] = _tms;
                      }
                  });
              }
          }
      }
      yield teams.cache.set(k, r);
  }   //if (tag_ids.length > 0)
  return r;
}

function *get_torrents_info(torrents, getalltags) {
  var user_ids = [], team_ids = [], tag_ids = [];
  for (var i = 0; i < torrents.length; i++) {
    if (torrents[i].uploader_id) {
      user_ids.push(torrents[i].uploader_id.toString());
    }
    if (torrents[i].team_id) {
      team_ids.push(torrents[i].team_id.toString());
    }
    if (torrents[i].category_tag_id) {
      tag_ids.push(torrents[i].category_tag_id.toString());
    }
    if (getalltags && torrents[i].tag_ids) {
      tag_ids = tag_ids.concat(torrents[i].tag_ids);
    }
  }
  user_ids = _.uniq(user_ids);
  team_ids = _.uniq(team_ids);
  tag_ids = _.uniq(tag_ids);

  // fill
  var users = [], teams = [], tags = [];
  if (user_ids.length) {
    users = yield new Users().getUsernameByIds(user_ids);
  }
  if (team_ids.length) {
    teams = yield new Teams().getNameByIds(team_ids);
  }
  if (tag_ids.length) {
    tags = yield new Tags().find(tag_ids);
  }
  for (var i = 0; i < torrents.length; i++) {
    if (torrents[i].uploader_id) {
      var u = _.find(users, function (u) {
          return u._id.toString() === torrents[i].uploader_id.toString();
      });
      if (u) {
        torrents[i].uploader = u;
      }
    }
    if (torrents[i].team_id) {
      var team = _.find(teams, function (team) {
          return team._id.toString() === torrents[i].team_id.toString();
      });
      if (team) {
        torrents[i].team = team;
      }
    }
    if (torrents[i].category_tag_id) {
      var tag = _.find(tags, function (tag) {
          return tag._id.toString() === torrents[i].category_tag_id.toString();
      });
      if (tag) {
        torrents[i].category_tag = tag;
      }
    }
    if (getalltags && torrents[i].tag_ids) {
      for (var j = 0; j < torrents[i].tag_ids.length; j++) {
        var tag_id = torrents[i].tag_ids[j].toString();
        var tag = _.find(tags, function (tag) {
            return tag._id.toString() === tag_id;
        });
        if (tag) {
          if (!torrents[i].tags) torrents[i].tags = [];
          torrents[i].tags.push(tag);
        }
      }
    }
  }
}

function *get_torrent_info(torrent) {
  if (torrent.uploader_id) {
    var u = new Users();
    if (yield u.find(torrent.uploader_id)) {
      torrent.uploader = u.expose();
    }
  }
  if (torrent.team_id) {
    var team = new Teams();
    if (yield team.find(torrent.team_id)) {
      torrent.team = team.expose();
    }
  }
  if (torrent.tag_ids) {
    if (torrent.tag_ids.length > 0) {
      var tag = new Tags();
      var tags = yield tag.find(torrent.tag_ids);
      // sort tags
      // `misc > team > bangumi > lang > resolution > format`
      const tag_sort = [ 'misc', 'team', 'bangumi', 'lang', 'resolution', 'format' ];
      torrent.tags = _.sortBy(tags, function (t) {
        var i = tag_sort.indexOf(t.type);
        // move unknow type to last
        if (i < 0) i = tag_sort.length;
        return i;
      });
      if (torrent.category_tag_id) {
        torrent.category_tag = _.find(torrent.tags, function (t) {
          return t._id.toString() === torrent.category_tag_id.toString();
        });
      }
    } else {
      torrent.tags = [];
    }
  }
}

function get_bgms_showlist(rbs) {
    var weekDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    //var showList = [];
    //var aDays = [];
    var tempList = {};
    var avdays = {};
    //var startSlide = 0;
    var theFirstDay = 0;
    var bgmList = {};
    rbs.forEach(function (rb) {
        if (tempList[rb.showOn]) {
            tempList[rb.showOn].push(rb);
        } else {
            tempList[rb.showOn] = [rb];
        }
        avdays[rb.showOn] = true;
    });
    //find the first day
    var maxCount = 0;
    for (var i = 0; i < weekDays.length; i++) {
        var count = 0;
        for (var j = i; j < i + 4; j++) {
            var k = j % weekDays.length;
            if (avdays[k]) {
                count++;
            }
        }
        if (count > maxCount) {
            maxCount = count;
            theFirstDay = i;
        }
    }
    for (var j = theFirstDay; j < theFirstDay + 4; j++) {
        var k = j % weekDays.length;
        //aDays.push(weekDays[k]);
        //showList.push(tempList[k]);
        bgmList[weekDays[k]] = tempList[k];
    }
    /*if (showList.length > 1 && showList[0] && showList[1]
        && showList[0].length > 0 && showList[1].length > 0) {
        startSlide = showList[0].length;
        if (showList[2] && showList[2].length > 0) {
            startSlide += showList[1].length;
            if (showList[3] && showList[3].length > 0) {
                //end on the third day (today)
                startSlide += 1;
            }
        }
    }*/
    return bgmList;
}

function torrent_content_filter(files) {
  //_____padding_file_0_如果您看到此文件，请升级到BitComet(比特彗星)0.85或以上版本____
  const padding_file_regex = /^_____padding_file_\d+?_.+?____$/;
  var tc = [];
  files.forEach(function (ptf) {
    var filename;
    var hasSplash = (ptf.path.indexOf('/') >= 0 || ptf.path.indexOf('\\') >= 0);
    if (hasSplash) {
      var ti = ptf.path.lastIndexOf('/');
      if (ti < 0) {
        ti = ptf.path.lastIndexOf('\\');
      }
      if (ti >= 0) {
        filename = ptf.path.substr(ti + 1);
      } else {
        filename = ptf.path;
      }
    } else {
      filename = ptf.path;
    }
    // check not a padding_file
    if (!padding_file_regex.test(filename)) {
      tc.push([ptf.path, filesize(ptf.length)]);
    }
  });
  // asc sorting
  tc = _.sortBy(tc, function (stc) { return stc[0]; });
  return tc;
}

exports.get_objects_tags = get_objects_tags;
exports.get_working_teams = get_working_teams;
exports.get_torrents_info = get_torrents_info;
exports.get_torrent_info = get_torrent_info;
exports.get_bgms_showlist = get_bgms_showlist;

exports.torrent_content_filter = torrent_content_filter;
