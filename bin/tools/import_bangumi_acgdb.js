
var _ = require('underscore'),
  validator = require('validator'),
  request = require('request');
var co = require('./../../node_modules/koa/node_modules/co');
var config = require('./../../config');
var models = require('./../../models'),
  Tags = models.Tags,
  Bangumis = models.Bangumis;
var ObjectID = require('mongodb').ObjectID;
var fs = require('fs');
var mkdirp = require('mkdirp');

const ACGDB_CURRENT_API_URL = 'http://api.acgdb.com/current_season';
const ACGDB_DETAIL_API_URL = 'http://api.acgdb.com/detail?id=';
const RIN_IMAGE_PATH = 'data/images/' + new Date().getFullYear() + '/' + (new Date().getMonth() + 1) + '/';
const RIN_IMAGE_SAVEPATH = '../../public/' + RIN_IMAGE_PATH;

function exit() {
  process.exit(0);
}

function yreq(url) {
  return function (callback) {
    request(url, function (err, resp, body) {
      if (!err && resp.statusCode == 200) {
        callback(err, body);
      } else {
        callback(err);
      }
    });
  };
}

function imgreq(url) {
    return function(callback) {
        request(url, {
            encoding: 'binary'
        }, function(err, resp, body) {
            if (!err && resp.statusCode == 200) {
                callback(err, body);
            } else {
                callback(err);
            }
        });
    }
}

var acgdb_fetch_image = function *(acgdb_id) {
    var body = yield yreq(ACGDB_DETAIL_API_URL + acgdb_id);
    var ani_data, cover, icon;
    try {
        ani_data = JSON.parse(body);
    } catch (e) {
        // error handle
    }
    if (ani_data && ani_data.image_path_cover && ani_data.image_path_mini) {
        cover = yield imgreq(ani_data.image_path_cover);
        icon = yield imgreq(ani_data.image_path_mini);

        if (cover) {
            fs.writeFileSync(RIN_IMAGE_SAVEPATH + ani_data.id + '-cover', cover, 'binary');
        } else {
            console.warn('WARN: No cover found for anime ' + ani_data.id);
        }
        if (icon) {
            fs.writeFileSync(RIN_IMAGE_SAVEPATH + ani_data.id + '-icon', icon, 'binary');
        } else {
            console.warn('WARN: No icon found for anime ' + ani_data.id);
        }

        return { cover: RIN_IMAGE_PATH + ani_data.id + '-cover', icon: RIN_IMAGE_PATH + ani_data.id + '-icon' };
    }
}

var acgdb_get_copyright = function *(acgdb_id) {
  var body = yield yreq(ACGDB_DETAIL_API_URL + acgdb_id);
  var aani;
  try {
    aani = JSON.parse(body);
  } catch (e) {
  }

  if (aani && aani.relations && aani.relations.main_staff) {
    var main_staff = aani.relations.main_staff;
    for (var i = 0; i < main_staff.length; i++) {
      if (main_staff[i].type === '制作') {
        var ent = main_staff[i].entities;
        if (!ent) continue;
        var copyright = '';
        for (var j = 0; j < ent.length; j++) {
          if (ent[j].name_locale && ent[j].name_locale.original) {
            if (copyright) copyright += ', ';
            copyright += ent[j].name_locale.original;
          }
        }
        if (copyright) {
          return copyright;
        }
        break;
      }
    }
  }

  console.warn('WARN: couldn\'t found detail for ' + acgdb_id);
  return '';
};

var acgdb_parse_anime = function *(acgdb_id, showOn, time, acgdb_anime) {
  var tags = { synonyms: [], locale: {} };
  var names = acgdb_anime.names;
  var name;
  for (var loc in names) {
    var n = names[loc];
    var add_locale = function (loc, name) {
      var loc_lc = loc.toLowerCase();
      var loc_s = loc_lc.split('_');
      switch (loc_s[0]) {
        case 'ja':
        case 'en':
          tags.locale[loc_s[0]] = name;
          break;
        case 'zh':
          if (loc_s[1] === 'tw' || loc_s[1] === 'cn') {
            tags.locale[loc_lc] = name;
          }
          break;
      }
    };
    var b = loc === acgdb_anime.locale;
    if (n instanceof Array) {
      tags.synonyms = _.union(tags.synonyms, n);
      if (b) name = n[0];
      add_locale(loc, n[0]);
    } else {
      tags.synonyms.push(n);
      if (b) name = n;
      add_locale(loc, n);
    }
  }

  if (!name) {
    console.warn('WARN: not found name for ' + acgdb_id);
    return;
  }

  tags.name = name;
  var copyright = yield acgdb_get_copyright(acgdb_id);
  var img = yield acgdb_fetch_image(acgdb_id);

  var ani = {
    bangumi: {
      showOn: showOn,
      name: name,
      acgdb_id: acgdb_id,
      copyright: copyright,
      cover: img.cover,
      icon: img.icon
    },
    tag: tags
  };
  return ani;
};

var acgdb_parse = function *(data) {
  var current_season;
  try {
    current_season = JSON.parse(data);
  } catch (e) {
    console.error(e);
    return;
  }
  var acgdb_times = current_season ? current_season.time_today : null;
  var acgdb_animes = current_season ? current_season.animes : null;
  if (!acgdb_times || !acgdb_animes) {
    console.error('ERR: not found enough infomation.');
    return;
  }
  var animes = [];
  for (var i = 0; i < acgdb_times.length; i++) {
    var acgdb_day = acgdb_times[i];
    for (var j = 0; j < acgdb_day.length; j++) {
      var acgdb_animetime = acgdb_day[j];
      var acgdb_id = acgdb_animetime.anime;
      var acgdb_anime = acgdb_animes[acgdb_id];
      var ani = yield acgdb_parse_anime(acgdb_id, i, acgdb_animetime.time, acgdb_anime);
      console.log(ani);
    }
  }
};

var main = module.exports = function *() {
  mkdirp.sync(RIN_IMAGE_SAVEPATH, { mode: '0755' })
  var body = yield yreq(ACGDB_CURRENT_API_URL);
  yield acgdb_parse(body);
  exit();
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
