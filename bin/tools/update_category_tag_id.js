
var _ = require('underscore');
var co = require('./../../node_modules/koa/node_modules/co');
var config = require('./../../config');
var models = require('./../../models'),
  Tags = models.Tags,
  Torrents = models.Torrents;
var ObjectID = require('mongodb').ObjectID;

var main = module.exports = function *() {
  var tag = new Tags();
  var torrent = new Torrents();
  var torrents = yield torrent.getAll();
  var tag_ids = [];
  for (var i = 0; i < torrents.length; i++) {
    var t = torrents[i];
    if (!t.category_tag_id && t.tag_ids) {
      tag_ids = tag_ids.concat(_.map(t.tag_ids, function (tag_id) {
        return tag_id.toString();
      }));
    }
  }
  tag_ids = _.uniq(tag_ids);

  var tags = yield tag.find(tag_ids);
  var _tags = {};
  for (var i = 0; i < tags.length; i++) {
    _tags[tags[i]._id.toString()] = tags[i];
  }
  for (var i = 0; i < torrents.length; i++) {
    var t = torrents[i];
    var category_tag_id;
    /*if (!t.category_tag_id)*/ {
      if (t.tag_ids) {
        for (var j = 0; j < t.tag_ids.length; j++) {
          var _t = _tags[t.tag_ids[j].toString()];
          if (_t && _t.type == 'misc') {
            category_tag_id = new ObjectID(_t._id);
            break;
          }
        }
      }
      if (!category_tag_id) {
        category_tag_id = new ObjectID('549ef207fe682f7549f1ea90'); //donga
      }

      var upd = {category_tag_id: category_tag_id};
      var str_tag_ids = _.map(t.tag_ids, function (tag_id) {
        return tag_id.toString();
      });
      if (str_tag_ids.indexOf(category_tag_id.toString()) < 0) {
        var tag_ids = _.map(t.tag_ids, function (tag_id) {
          return new ObjectID(tag_id);
        });
        tag_ids.push(new ObjectID(category_tag_id));
        upd.tag_ids = tag_ids;
      }

      torrent._id = t._id;
      //yield torrent.update(upd);

      var _t2 = _tags[category_tag_id.toString()];
      console.log(t.title, _t2 ? _t2.name : category_tag_id);
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
  var fn = co(main);
  fn.call(ctx, onerror);
}, 800);


