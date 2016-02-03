
var config = require('../config');

var co = require('co');

var Models = require('./../models'),
  Tags = Models.Tags,
  Bangumis = Models.Bangumis,
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

  // reset all tag's activity
  yield otags.collection.update({}, {$set: {activity: 0}}, {multi: true});

  var m_tags_c = {};
  for (var i = 0; i < torrents.length; i++) {
    if (!torrents[i].tag_ids) {
      continue;
    }
    for (var j = 0; j < torrents[i].tag_ids.length; j++) {
      var tag = m_tags[torrents[i].tag_ids[j].toString()];
      if (tag) {
        if (tag.type === 'team') {
          var stid = tag._id.toString();
          if (!m_tags_c[stid]) {
            m_tags_c[stid] = {
              type: 'team',
              finish: torrents[i].finished,
              publish: 1
            };
          } else {
            m_tags_c[stid].finish += torrents[i].finished;
            m_tags_c[stid].publish++;
          }
        } else if (tag.type === 'bangumi' && torrents[i].publish_time > d2) {
          var stid = tag._id.toString();
          if (!m_tags_c[stid]) {
            m_tags_c[stid] = {
              type: 'bangumi',
              finish: torrents[i].finished
            };
          } else {
            m_tags_c[stid].finish += torrents[i].finished;
          }
        }
      }
    }
  }

  for (var stid in m_tags_c) {
    var c = m_tags_c[stid];
    if (c.type != 'team') continue;

    var tag = m_tags[stid];
    var activity = c.publish * c.finish;

    otags = new Tags({_id: new ObjectID(stid)});
    yield otags.update({activity: activity});

    console.log(c.type, tag.name, 'publish:', c.publish,
      'finished:', c.finish,
      'activity:', activity);
  }

  console.log('');

  for (var stid in m_tags_c) {
    var c = m_tags_c[stid];
    if (c.type != 'bangumi') continue;

    var tag = m_tags[stid];
    var activity = c.finish;

    otags = new Tags({_id: new ObjectID(stid)});
    yield otags.update({activity: activity});

    console.log(c.type, tag.name,
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
