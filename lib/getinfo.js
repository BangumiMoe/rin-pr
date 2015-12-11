
var _ = require('underscore');

var Models = require('./../models'),
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

exports.get_objects_tags = get_objects_tags;
