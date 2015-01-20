
var config = require('./../../../config');

var fs = require('fs');
var co = require('./../../../node_modules/koa/node_modules/co');
var MyRequest = require('./../../../lib/teamsync/util/request');
var generator = require('./../../../lib/generator');
var OpenCC = require('opencc');
//var EventProxy = require('eventproxy');
var mkdirp = require('mkdirp');

var ObjectID = require('mongodb').ObjectID;
var Models = require('./../../../models'),
  Tags = Models.Tags,
  Bangumis = Models.Bangumis;

var request = new MyRequest();
var opencc = new OpenCC('t2s.json');

var yreq = {};
yreq.get = function () {
  var args = Array.prototype.slice.call(arguments);
  return function (callback) {
    args.push(function (err, res, body) {
      if (err) {
        return callback(err);
      }
      callback(null, body);
    });
    request.get.apply(request, args);
  };
};

var DMHY_URL_PREFIX = 'http://share.dmhy.org';
var savedir = config['sys'].upload_dir + 'bangumis/';

function dmhyBangumiUrl(f) {
    return DMHY_URL_PREFIX + '/json/' + f + '.json?random=' + Math.random();
}

function *downloadJson(f) {
  var dfilepath = savedir + f + '.json';
  var exists = fs.existsSync(dfilepath);
  if (exists) {
    return yield function (callback) {
      fs.readFile(dfilepath, {encoding: 'utf8'}, callback);
    };
  } else {
    var body = yield yreq.get(dmhyBangumiUrl(f));
    if (body.charCodeAt(0) === 65279) {
      body = body.substr(1);
    }
    return yield function (callback) {
      fs.writeFile(dfilepath, body, function (err) {
        if (err) {
          return callback(err);
        }
        callback(null, body);
      });
    };
  }
}

function *saveBangumiIcon(icon_url) {
  var m = icon_url.match(/\/images\/weekly\/(.+)/);
  if (m) {
    var picpath = savedir + '/images/weekly/';
    yield function (cb) {
      mkdirp(picpath, cb);
    };

    var dfilepath = picpath + m[1];
    var exists = fs.existsSync(dfilepath);
    if (!exists) {
      var buffer = yield yreq.get(icon_url, { buffer: true });
      yield function (callback) {
        fs.writeFile(dfilepath, buffer, callback);
      };
    }

    return 'data/bangumis/images/weekly/' + m[1];
  }
  return icon_url;
}

function *getBangumiInfo(name, season, icon_url) {
  var iconpath = yield saveBangumiIcon(icon_url);
  var sname = opencc.convertSync(name);
  var rbgm = { name: name, icon: iconpath };
  var r = { name: name, synonyms: [ name ], locale: {
    zh_tw: name,
    zh_cn: sname
  }, type: 'bangumi' };
  if (sname.toLowerCase() != name.toLowerCase()) {
    r.synonyms.push(sname);
  }

  var url = 'http://bangumi.tv/subject_search/'
    + encodeURIComponent(name)
    + '?cat=2';
  var body = yield yreq.get(url);
  var listpos = body.indexOf('<ul id="browserItemList"');
  var searchresult = null;
  if (listpos !== -1) {
    var listposend = body.indexOf('</ul>', listpos);
    if (listposend !== -1) {
      searchresult = body.substring(listpos, listposend);
    }
  }
  var m = season.split('Q');
  var year = parseInt(m[0]);
  var year_season = parseInt(m[1]);
  if (searchresult) {
    var re = /<li id="item_(\d+?)".+?>[\s\S]+?<a href="\/subject\/\1".+?>(.*?)<\/a>\s+?<small class="grey">(.*?)<\/small>[\s\S]+?<p class="info tip">\s+?(\d+?.+?)\s+<\/p>[\s\S]+?<\/li>/g;
    var arr;
    var found = false;
    while ((arr = re.exec(searchresult)) != null) {
      if (arr) {
        if (arr[2].indexOf('剧场版') !== -1
          || arr[2].indexOf('OVA') !== -1) {
            continue;
        }
        if (sname.toLowerCase() == arr[2].toLowerCase()) {
          found = true;
          console.log('-> found', name, '=>', arr[2]);
          break;
        }
        m = arr[4].match(/(\d{4})(年|-|\/|\s|$)/);
        if (m && parseInt(m[1]) === year) {
          found = true;
          console.log('-> found', name, '=>', arr[2]);
          break;
        } else if (!m) {
          console.log('-> notmatch', name, '=>', arr[2], arr[4]);
        }
      }
    }

    if (found) {
      var jlname = arr[3];
      if (jlname.toLowerCase() != sname.toLowerCase()
        && jlname.toLowerCase() != name.toLowerCase()) {
          r.synonyms.push(jlname);
          r.locale.ja = jlname;
      }

      url = 'http://bangumi.tv/subject/' + arr[1];
      body = yield yreq.get(url);
      //TODO: get detail
      var infopos = body.indexOf('<h1 class="nameSingle">');
      if (infopos !== -1) {
        var infoposend = body.indexOf('</h1>', infopos);
        if (infoposend !== -1) {
          var info = body.substring(infopos, infoposend);
          var m = info.match(/<a .+?>(.+?)<\/a>/);
          if (m) {
            if (r.synonyms.indexOf(m[1]) === -1) {
              r.synonyms.push(m[1]);
            }
          }
        }
      }

      infopos = body.indexOf('<ul id="infobox">');
      if (infopos !== -1) {
        var infoposend = body.indexOf('</ul>', infopos);
        if (infoposend !== -1) {
          var info = body.substring(infopos, infoposend);
          var m = info.match(/<li><span class="tip">(企画|动画制作).+?<\/span>(.+?)<\/li>/);
          if (m) {
            var m2 = m[2].match(/<a .+?>(.+?)<\/a>/);
            if (m2) {
              rbgm.credit = m2[1];
            } else {
              rbgm.credit = m[2];
            }
          }
        }
      }
      var prg_content;
      infopos = body.indexOf('<div id="subject_prg_content">');
      if (infopos !== -1) {
        var infoposend = body.indexOf('</div></div>', infopos);
        if (infoposend !== -1) {
          prg_content = body.substring(infopos, infoposend);
        }
      }
      if (prg_content) {
        infopos = body.indexOf('<ul class="prg_list">');
        if (infopos !== -1) {
          var infoposend = body.indexOf('</ul>', infopos);
          if (infoposend !== -1) {
            info = body.substring(infopos, infoposend);
            infoposend = info.indexOf('<li class="subtitle">');
            if (infoposend !== -1) {
              info = info.substring(0, infoposend);
            }
            var prgid_re = /<li><a href="\/ep\/.+?rel="#(.+?)"/g;
            var arr, prgids = [];
            while ((arr = prgid_re.exec(info)) != null) {
              //[filename, filesize]
              prgids.push(arr[1]);
            }
            if (prgids.length > 0) {
              var getdate = function (prgid, last) {
                var m = prg_content.match(new RegExp('<div id="' + prgid + '".+?<span class="tip">.*?首播[:：](.+?)<'));
                if (m) {
                  var mymd = m[1].match(/(\d{4})[年|-](\d+?)[月|-](\d+)日?/);
                  if (mymd) {
                    var d1 = new Date();
                    d1.setFullYear(mymd[1], parseInt(mymd[2]) - 1, mymd[3]);
                    d1 = new Date(d1.toDateString());
                    return d1;
                  }
                  var mmd = m[1].match(/(\d+?)[月|-](\d+)日?/);
                  if (mmd) {
                    var d1 = new Date();
                    var ty = year;
                    if (last && rbgm.startDate) {
                      var d2 = new Date(rbgm.startDate);
                      d2.setDate(d2.getDate() + prgids.length * 7);
                      ty = d2.getFullYear();
                    }
                    d1.setFullYear(ty, parseInt(mmd[1]) - 1, mmd[2]);
                    d1 = new Date(d1.toDateString());
                    return d1;
                  }
                }
                return null;
              };

              rbgm.startDate = getdate(prgids[0]);
              if (rbgm.startDate) {
                rbgm.showOn = rbgm.startDate.getDay();
              }
              rbgm.endDate = getdate(prgids[prgids.length - 1], true);
              if (rbgm.startDate && (!rbgm.endDate || rbgm.endDate < rbgm.startDate)) {
                var d2 = new Date(rbgm.startDate);
                d2.setDate(d2.getDate() + prgids.length * 7);
                rbgm.endDate = d2;
              }
            }
          }
        }
      }
    } else {
      console.log('-> notfound', name);
    }
  }
  if (!rbgm.startDate) {
    var d1 = new Date();
    var month = (parseInt(year_season) - 1) * 3 + 1;
    d1.setFullYear(year, month - 1, 1);
    rbgm.startDate = new Date(d1.toDateString());

    rbgm.showOn = rbgm.startDate.getDay();
  }
  if (!rbgm.endDate) {
    var d2 = new Date(rbgm.startDate);
    d2.setDate(d2.getDate() + 12 * 7);
    rbgm.endDate = d2;
  }
  return {bangumi: rbgm, tag: r};
}

function *main() {
  console.log('getting bangumi index...');
  var body = yield downloadJson('index');
  var years = JSON.parse(body).years;

  var weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  //var obangumis = new Bangumis();
  var otags = new Tags();

  for (var i = years.length - 1; i >= 0; i--) {
    var seasons = years[i].seasons;
    for (var j = 0; j < seasons.length; j++) {
      var s = seasons[j];
      console.log('getting ' + s.text + '...');
      body = yield downloadJson(s.index);
      var weeks = JSON.parse(body);
      for (var w = 0; w < weekdays.length; w++) {
        var bgms = weeks[weekdays[w]];
        if (!bgms || !bgms.length) {
          continue;
        }
        var yinfos = [];
        for (var k = 0; k < bgms.length; k++) {
          if (bgms[k].name == '&nbsp;') {
            //console.log('-> jump space');
            continue;
          }
          var ts = yield otags.matchTags([bgms[k].name]);
          if (ts && ts.length > 0) {
            console.log('-> db', bgms[k].name);
            continue;
          }
          yinfos.push(getBangumiInfo(bgms[k].name, s.index, bgms[k].img));
        }
        var infos = yield yinfos;
        for (var k = 0; k < infos.length; k++) {
          var ts = yield otags.matchTags(infos[k].tag.synonyms);
          if (ts && ts.length > 0) {
            console.log('-> synonyms found', bgms[k].name);
            continue;
          }
          var t = yield new Tags(infos[k].tag).save();
          if (t._id) {
            infos[k].bangumi.tag_id = new ObjectID(t._id);
            var b = yield new Bangumis(infos[k].bangumi).save();
          }
        }
      }
    }
  }

  process.exit(0);
}

function onerror(err) {
  if (err) {
    console.error(err.stack);
    process.exit(1);
  }
}

mkdirp(savedir, function () {
setTimeout(function () {
  var ctx = new Object();
  var fn = co.wrap(main);
  fn.call(ctx).catch(onerror);
}, 800);
});
