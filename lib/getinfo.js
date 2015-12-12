
var _ = require('underscore'),
  common = require('./common');

var Models = require('./../models'),
  Torrents = Models.Torrents,
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

exports.get_objects_tags = get_objects_tags;
exports.get_working_teams = get_working_teams;
