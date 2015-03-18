
var config = require('../config');

var co = require('./../node_modules/koa/node_modules/co');

var Models = require('./../models'),
  Tags = Models.Tags,
  Teams = Models.Teams,
  Users = Models.Users,
  Torrents = Models.Torrents;
var ObjectID = require('mongodb').ObjectID;

if (!Array.from) {
  Array.from = function (alo, mapFn) {
    //arrlikeobject, only support Set
    var r = [];
    for (var a of alo) {
      r.push(mapFn ? mapFn(a) : a);
    }
    return r;
  };
}

function *main() {
  var d = new Date(), d2 = new Date();
  d.setDate(d.getDate() - 7); // 7 days torrent
  d2.setDate(d2.getDate() - 5); // 5 days tag

  var torrents = yield new Torrents().getAll({ publish_time: { $gte: d } });
  var tag_ids = new Set();
  for (var i = 0; i < torrents.length; i++) {
    if (!torrents[i].tag_ids) {
      continue;
    }
    for (var j = 0; j < torrents[i].tag_ids.length; j++) {
      tag_ids.add(torrents[i].tag_ids[j].toString());
    }
  }

  //for (var tag_id of tag_ids.values())
  //no need for ObjectID transfrom, find will do it
  var arr_tag_ids = Array.from(tag_ids);
  tag_ids.clear(); tag_ids = null;

  var otags = new Tags();
  var tags = yield otags.find(arr_tag_ids);
  var m_tags = {}; //new Map();
  for (var i = 0; i < tags.length; i++) {
    m_tags[tags[i]._id.toString()] = tags[i];
  }

  var team_tag_ids = new Set();
  for (var i = 0; i < torrents.length; i++) {
    if (!torrents[i].tag_ids) {
      continue;
    }
    for (var j = 0; j < torrents[i].tag_ids.length; j++) {
      var tag = m_tags[torrents[i].tag_ids[j].toString()];
      if (tag && tag.type === 'team') {
        team_tag_ids.add(tag._id.toString());
      }
    }
  }

  var arr_team_tag_ids = Array.from(team_tag_ids);
  team_tag_ids.clear(); team_tag_ids = null;

  var oteams = new Teams();
  var teams = yield oteams.getByTagId(arr_team_tag_ids);
  var m_teams = {};
  var m_team_tag = {};
  for (var i = 0; i < teams.length; i++) {
    if (!teams[i].tag_id) {
      continue;
    }
    m_teams[teams[i]._id.toString()] = teams[i];
    m_team_tag[teams[i].tag_id.toString()] = teams[i];
  }

  // reset all team's activity
  yield otags.collection.update({type: 'bangumi'}, {$set: {activity: 0}}, {multi: true});
  yield oteams.collection.update({}, {$set: {activity: 0}}, {multi: true});

  var m_teams_c = {}, m_tags_c = {};
  for (var i = 0; i < torrents.length; i++) {
    if (!torrents[i].tag_ids) {
      continue;
    }
    for (var j = 0; j < torrents[i].tag_ids.length; j++) {
      var tag = m_tags[torrents[i].tag_ids[j].toString()];
      if (tag) {
        if (tag.type === 'team') {
          var team = m_team_tag[tag._id.toString()];
          var stid = team._id.toString();
          if (!m_teams_c[stid]) {
            m_teams_c[stid] = {
              finish: torrents[i].finished,
              publish: 1
            };
          } else {
            m_teams_c[stid].finish += torrents[i].finished;
            m_teams_c[stid].publish++;
          }
        } else if (tag.type === 'bangumi' && torrents[i].publish_time > d2) {
          var stagid = tag._id.toString();
          if (!m_tags_c[stagid]) {
            m_tags_c[stagid] = {
              finish: torrents[i].finished
            };
          } else {
            m_tags_c[stagid].finish += torrents[i].finished;
          }
        }
      }
    }
  }

  for (var stid in m_teams_c) {
    var c = m_teams_c[stid];
    var team = m_teams[stid];
    var activity = c.publish * c.finish;

    oteams = new Teams({_id: new ObjectID(stid)});
    yield oteams.update({activity: activity});

    console.log('team', team.name, 'publish:', c.publish,
      'finished:', c.finish,
      'activity:', activity);
  }

  console.log('');

  for (var stagid in m_tags_c) {
    var c = m_tags_c[stagid];
    var tag = m_tags[stagid];

    otags = new Tags({_id: new ObjectID(stagid)});
    yield otags.update({activity: activity});

    console.log('tag', tag.name,
      'finished:', c.finish,
      'activity:', activity);
  }

  console.log('done.');
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
