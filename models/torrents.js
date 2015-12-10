
var config = require('./../config');

var util = require('util'),
    fs = require('fs'),
    _ = require('underscore'),
    validator = require('validator'),
    common = require('./../lib/common'),
    readTorrent = require('read-torrent'),
    rinTorrent = require('./../lib/torrent');
var tracker = require('./../lib/tracker');
var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;

const onePage = 30;

function Torrents(torrent) {
    ModelBase.call(this);

    if (torrent) {
        if (torrent._id) this._id = torrent._id;
        if (torrent.category_tag_id) {
            this.category_tag_id = new ObjectID(torrent.category_tag_id);
        }
        if (torrent.title) {
            this.title = validator.trim(torrent.title);
            this.titleIndex = Torrents.makeIndexArray(this.title);
        }
        this.introduction = torrent.introduction;
        this.tag_ids = torrent.tag_ids;   //tags id

        /* deprecated
        if (torrent.bangumi_id) {
            this.bangumi_id = new ObjectID(torrent.bangumi_id);
        }*/

        /*
        don't set here

        this.comments = 0;

        //downloads, finished, leechers, seeders
        this.downloads = torrent.downloads ? torrent.downloads : 0;
        this.finished = torrent.finished ? torrent.finished : 0;
        this.leechers = torrent.leechers ? torrent.leechers : 0;
        this.seeders = torrent.seeders ? torrent.seeders : 0;
        */

        if (torrent.uploader_id) {
            this.uploader_id = new ObjectID(torrent.uploader_id);
        }
        if (torrent.team_id) {
            this.team_id = new ObjectID(torrent.team_id);
        }
        //publish_time
        this.magnet = torrent.magnet;
        this.infoHash = torrent.infoHash;
        if (torrent.file_id) {
            this.file_id = new ObjectID(torrent.file_id);
        }
        if (torrent.teamsync) {
            this.teamsync = true;
        }
        this.content = torrent.content;
        this.size = torrent.size;
        this.btskey = torrent.btskey;
    }
}

util.inherits(Torrents, ModelBase);

Torrents.parseTorrent = function *(torrentPath) {
    var torrentInfo = function (file) {
        return function (callback) {
            readTorrent(file, callback);
        };
    };
    return (yield torrentInfo(torrentPath));
};

Torrents.generateMagnet = function (infoHash) {
    //or we can use base32 infoHash instead
    return 'magnet:?xt=urn:btih:' + infoHash;
};

Torrents.addToTrackerWhitelist = function (infoHash) {
    tracker.whitelist_add(infoHash);
    return true;
};

Torrents.updateAnnounce = function (filepath, announce, announce_list) {
  return function (callback) {
    fs.readFile(filepath, function (err, buf) {
      if (err) {
        return callback(err);
      }
      buf = rinTorrent.update_announce(buf, announce, announce_list);
      if (buf === false) {
        return callback(null, false);
      }
      fs.writeFile(filepath, buf, function (err) {
        if (err) {
          return callback(err);
        }
        return callback(null, true);
      });
    });
  };
};

Torrents.checkAndUpdateAnnounce = function *(announce, filepath) {
    if (!(announce instanceof Array && announce.length > 0)) {
        return false;
    }
    var conf_torrent = config['torrent'];
    if (conf_torrent.contains && conf_torrent.contains.length > 0) {
        //need check
        var found = false;
        conf_torrent.contains.forEach(function (ann) {
            if (found) return;
            if (announce.indexOf(ann) >= 0) {
                found = true;
            }
        });
        if (!found) {
          return false;
        }
    }
    if ((conf_torrent.add && conf_torrent.add.length)
      || (conf_torrent.remove && conf_torrent.remove.length)) {
      var main_announce = conf_torrent.add.length ? conf_torrent.add[0] : announce[0];
      if (conf_torrent.add.length) {
        announce = _.union(conf_torrent.add, announce);
      }
      if (conf_torrent.remove.length) {
        for (var i = 0; i < conf_torrent.remove; i++) {
          var ann_rm = conf_torrent.remove[i];
          var j = announce.indexOf(ann_rm);
          if (j >= 0) {
            announce.splice(j, 1);
          }
        }
      }
      return yield Torrents.updateAnnounce(filepath, main_announce, announce);
    }
    return true;
};

Torrents.prototype.set = function (t) {
    if (t) {
        this._id = t._id;
        this.category_tag_id = t.category_tag_id;
        this.title = t.title;
        this.introduction = t.introduction;
        this.tag_ids = t.tag_ids;
        this.uploader_id = t.uploader_id;
        this.team_id = t.team_id;
        this.magnet = t.magnet;
        this.infoHash = t.infoHash;
        this.file_id = t.file_id;
        this.content = t.content;
        this.size = t.size;
        this.teamsync = t.teamsync;
        this.titleIndex = t.titleIndex;
        this.btskey = t.btskey;
    } else {
        this._id = this.category_tag_id = this.title = this.introduction
            = this.tag_ids = this.uploader_id = this.team_id
            = this.magnet = this.file_id = this.content = this.size
            = this.teamsync = this.titleIndex = this.btskey = undefined;
    }
    return t;
};

Torrents.prototype.valueOf = function () {
    return {
        _id: this._id,
        category_tag_id: this.category_tag_id,
        title: this.title,
        introduction: this.introduction,
        tag_ids: this.tag_ids,
        uploader_id: this.uploader_id,
        team_id: this.team_id,
        magnet: this.magnet,
        infoHash: this.infoHash,
        file_id: this.file_id,
        teamsync: this.teamsync,
        content: this.content,
        size: this.size,
        btskey: this.btskey
    };
};

Torrents.prototype.ensureIndex = function *() {
    var ge_tagids = this.collection.ensureIndex({
        tag_ids: 1
    }, { background: true, w: 1 });
    var ge_infoHash = this.collection.ensureIndex({
        infoHash: 1
    }, { background: true, w: 1 });
    var ge_title = this.collection.ensureIndex({
        titleIndex: 1
    }, { background: true, w: 1 });
    var ge_publish_time = this.collection.ensureIndex({
      publish_time: -1
    }, { background: true, w: 1 });

    yield [ ge_tagids, ge_infoHash, ge_title, ge_publish_time ];
};

Torrents.prototype.save = function *() {
    var nt = {
        category_tag_id: this.category_tag_id,
        title: this.title,
        introduction: this.introduction,
        tag_ids: this.tag_ids,
        comments: 0,
        downloads: 0,
        finished: 0,
        leechers: 0,
        seeders: 0,
        uploader_id: this.uploader_id,
        team_id: this.team_id,
        publish_time: new Date(),
        magnet: this.magnet,
        infoHash: this.infoHash,
        file_id: this.file_id,
        teamsync: this.teamsync,
        content: this.content,
        titleIndex: this.titleIndex,
        size: this.size,
        btskey: this.btskey
    };

    var ts = yield this.collection.insert(nt, { safe: true });
    if (ts && ts[0]) {
        this.set(ts[0]);
        yield this.cache.del('page/0');
        return ts[0];
    }
    return null;
};

Torrents.prototype.getLatest = function *(limit) {
    var r = yield this.cache.get('latest/' + limit);
    if (!r) {
        r = yield this.collection.find().sort({ publish_time: -1 }).limit(limit).toArray();
        yield this.cache.set('latest/' + limit, r);
    }
    return r;
};

Torrents.prototype.getPageCount = function *() {
    return Math.ceil((yield this.count()) / onePage);
};

Torrents.prototype.getPageCountByUser = function *(user_id) {
  var k = 'count/user/' + user_id.toString();
  var c = yield this.cache.get(k);
  if (c === null) {
    c = yield this.collection.count({uploader_id: new ObjectID(user_id)});
    yield this.cache.set(k, c);
  }
  return Math.ceil(c / onePage);
};

Torrents.prototype.getPageCountByTeam = function *(team_id) {
  var k = 'count/team/' + team_id.toString();
  var c = yield this.cache.get(k);
  if (c === null) {
    c = yield this.collection.count({team_id: new ObjectID(team_id)});
    yield this.cache.set(k, c);
  }
  return Math.ceil(c / onePage);
};

Torrents.prototype.getByPage = function *(page) {
    if (page <= 0) {
        return [];
    }
    page--; //for index
    var r = yield this.cache.get('page/' + page);
    if (r === null) {
        r = yield this.collection.find({})
            .sort({publish_time: -1}).skip(page * onePage).limit(onePage).toArray();
        yield this.cache.set('page/' + page, r);
    }
    return r;
};

Torrents.prototype.getByPageV2 = function *(page) {
    if (page <= 0) {
        return [];
    }
    page--; //for index
    // page v2 cache in controller
    var r = yield this.collection.find({}, { _id: true, file_id: true, title: true,
              downloads: true, seeders: true, leechers: true, finished: true,
              infoHash: true, magnet: true, publish_time: true, size: true,
              uploader_id: true, team_id: true, category_tag_id: true })
            .sort({publish_time: -1}).skip(page * onePage).limit(onePage).toArray();
    return r;
};

Torrents.prototype.getByUser = function *(user_id, page, limit) {
    if (page <= 0) {
      return [];
    }
    if (!limit) limit = onePage;
    page--; //for index
    return yield this.collection.find({ uploader_id: new ObjectID(user_id) })
      .sort({ publish_time: -1 })
      .skip(page * limit)
      .limit(limit).toArray();
};

Torrents.prototype.getByTeam = function *(team_id, page, limit) {
    if (page <= 0) {
      return [];
    }
    if (!limit) limit = onePage;
    page--; //for index
    return yield this.collection.find({ team_id: new ObjectID(team_id) })
      .sort({ publish_time: -1 })
      .skip(page * limit)
      .limit(limit).toArray();
};

Torrents.prototype.getByTag = function *(tag_id, page, limit) {
  if (page <= 0) {
    return [];
  }
  if (!limit) limit = onePage;
  page--; //for index

  var q = this.collection.find({ tag_ids: new ObjectID(tag_id) });
  var getTorrents = function *() {
    return yield q.sort({ publish_time: -1 })
      .skip(page * limit)
      .limit(limit).toArray();
  };

  if (page === 0) {
    //only the first page will be cached
    var k = 'tag/' + tag_id.toString() + '/page/' + page;
    var r = yield this.cache.get(k);
    if (r === null) {
      r = yield getTorrents();
      yield this.cache.set(k, r);
    }
    return r;
  }
  return yield getTorrents();
};

Torrents.prototype.getPageCountByTag = function *(tag_id) {
  var k = 'count/tag/' + tag_id.toString();
  var c = yield this.cache.get(k);
  if (c === null) {
    c = yield this.collection.count({ tag_ids: new ObjectID(tag_id) });
    yield this.cache.set(k, c);
  }
  return Math.ceil(c / onePage);
};

Torrents.prototype.getByTags = function *(tag_ids, page, limit) {
    if (page <= 0) {
        return [];
    }
    if (!limit) limit = onePage;
    page--; //for index

    for (var i = 0; i < tag_ids.length; i++) {
        tag_ids[i] = new ObjectID(tag_ids[i]);
    }
    return yield this.collection.find({ tag_ids: { $all: tag_ids } })
        .sort({ publish_time: -1 }).skip(page * onePage).limit(limit).toArray();
};

Torrents.prototype.getCountByTags = function *(tag_ids) {
    for (var i = 0; i < tag_ids.length; i++) {
        tag_ids[i] = new ObjectID(tag_ids[i]);
    }
    var c = yield this.collection.count({ tag_ids: { $all: tag_ids } });
    return c;
};

Torrents.prototype.getInTags = function *(tag_ids) {
    if (typeof tag_ids === 'string') {
        tag_ids = [tag_ids];
    }
    var stag_ids = _.map(tag_ids, function (tag_id) {
      return tag_id.toString();
    });
    var utag_ids = _.uniq(stag_ids);

    var k = 'tagin/hash/' + common.md5(utag_ids.slice().sort().join());
    var r = yield this.cache.get(k);
    if (r === null) {
        tag_ids = _.map(utag_ids, function (tag_id) {
          return new ObjectID(tag_id);
        });
        r = yield this.collection.find({
            tag_ids: { $in: tag_ids }
        }, {
            _id: 1, tag_ids: 1
        }).sort({ publish_time: -1 }).toArray();
        yield this.cache.set(k, r);
    }
    return r;
};

Torrents.prototype.getByTagCollections = function *(cid, collections, limit) {
    if (!limit) {
        limit = onePage;
    }
    var k = 'collections/' + cid + '/' + limit;
    var r = yield this.cache.get(k);
    if (r !== null) {
        return r;
    }

    var q;
    for (var i = 0; i < collections.length; i++) {
        for (var j = 0; j < collections[i].length; j++) {
            collections[i][j] = new ObjectID(collections[i][j]);
        }
    }
    if (collections.length == 0) {
        return [];
    } else if (collections.length == 1) {
        q = { tag_ids: { $all: collections[0] } };
    } else if (collections.length > 1) {
        var qor = [];
        //TODO: simplify this query
        for (var i = 0; i < collections.length; i++) {
            if (collections[i].length > 0) {
                qor.push({ tag_ids: { $all: collections[i] } });
            }
        }
        if (qor.length <= 0) {
            return [];
        }
        q = { $or: qor };
    } else {
        return [];
    }

    r = yield this.collection.find(q)
        .sort({ publish_time: -1 }).limit(limit).toArray();
    yield this.cache.set(k, r);

    return r;
};

Torrents.prototype.getByTitle = function *(title, page, limit) {
    if (page <= 0) {
        return [];
    }
    if (!limit) limit = onePage;
    page--; //for index

    var title = title.toLowerCase();
    var r = (page == 0) ? yield this.cache.get('title/' + title) : null;
    if (r === null) {
        var title_array = common.title_index(title);
        r = yield this.collection.find({ titleIndex: { $all: title_array } })
            .sort({ publish_time: -1 }).skip(page * onePage).limit(limit).toArray();
        if (page == 0) yield this.cache.set('title/' + title, r);
    }
    return r;
};

Torrents.prototype.getCountByTitle = function *(title) {
    var title = title.toLowerCase();
    var r = yield this.cache.get('count/title/' + title);
    if (r === null) {
        var title_array = common.title_index(title);
        r = yield this.collection.count({ titleIndex: { $all: title_array } });
        yield this.cache.set('count/title/' + title, r);
    }
    return r;
};

Torrents.prototype.downloadCount = function *(torrent_id) {
  if (!torrent_id) {
    torrent_id = this._id;
  }
  yield this.collection.update({ _id: new ObjectID(torrent_id) },
    { $inc: { downloads: 1 } }, { w: 1 });
};

Torrents.prototype.commnetCount = function *(torrent_id) {
  if (!torrent_id) {
    torrent_id = this._id;
  }
  yield this.collection.update({ _id: new ObjectID(torrent_id) },
    { $inc: { comments: 1 } }, { w: 1 });
};

Torrents.prototype.getByInfoHash = function *(infoHash) {
    return yield this.collection.findOne({ infoHash: infoHash });
};

Torrents.prototype.updateByInfoHash = function *(infoHash, set, inc) {
    var upd = { $set: set };
    if (inc) {
        upd.$inc = inc;
    }
    return yield this.collection.update({ infoHash: infoHash }, upd);
};

Torrents.prototype.setSyncStatus = function *(syncStatus) {
    return yield this.collection.update({ _id: new ObjectID(this._id) }, { $set: {sync: syncStatus} });
};

Torrents.prototype.getSuggest = function *(title, user_id, team_id) {
    var q;
    if (user_id && team_id) {
        q = { $or: [{uploader_id: new ObjectID(user_id)}, {team_id: new ObjectID(team_id)}] };
    } else if (user_id) {
        q = { uploader_id: new ObjectID(user_id) };
    } else {
        return {};
    }

    var rs = yield this.collection.find(q, {_id: 1, title: 1})
      .sort({ publish_time: -1 }).limit(35).toArray();
    if (rs) {
        var torrent = {};
        var maxSim = 0;
        var titleArr = common.title_split(title);
        rs.forEach(function (t) {
            var s = calcSimilarityByTitle(titleArr, t.title);
            if (s > maxSim) {
                maxSim = s;
                torrent = t;
            }
        });
        if (torrent._id) {
          return yield this.find(torrent._id);
        }
    }
    return {};
};

Torrents.makeIndexArray = function (text) {
    return common.title_index(text);
};

var calcSimilarityByTitle = function (title1, title2) {
    var s = 0;
    var t1arr;
    if (typeof title1 == 'string') {
        t1arr = common.title_split(title1);
    } else if (title1 instanceof Array) {
        t1arr = title1;
    } else {
        return s;
    }
    var t2arr = common.title_split(title2);
    if (t1arr && t2arr && t1arr.length && t2arr.length) {
        for (var i = 0; i < t1arr.length; i++) {
            if (t2arr.indexOf(t1arr[i]) >= 0) {
                s++;
            }
        }
    }
    return s;
};

module.exports = Torrents;

ModelBase.register('torrents', Torrents);
