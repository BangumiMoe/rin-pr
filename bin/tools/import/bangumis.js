
var config = require('./../../../config');

var fs = require('fs');
var co = require('./../../../node_modules/koa/node_modules/co');
var MyRequest = require('./../../../lib/teamsync/util/request');
var generator = require('./../../../lib/generator');
var OpenCC = require('opencc');
//var EventProxy = require('eventproxy');
var mkdirp = require('mkdirp');

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

function *getBangumiInfo(name, season) {
  var sname = opencc.convertSync(name);
  var r = { name: name, synonyms: [ name ] };
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
          console.log('-> found', name, arr[1], arr[2]);
          break;
        }
        m = arr[4].match(/(\d{4})(年|-|\/|\s|$)/);
        if (m && parseInt(m[1]) === year) {
          found = true;
          console.log('-> found', name, arr[1], arr[2]);
          break;
        } else if (!m) {
          console.log('-> notmatch', name, arr[1], arr[2], arr[4]);
        }
      }
    }

    if (found) {
      var jlname = arr[3];
      if (jlname.toLowerCase() != sname.toLowerCase()
        && jlname.toLowerCase() != name.toLowerCase()) {
          r.synonyms.push(jlname);
      }

      url = 'http://bangumi.tv/subject/' + arr[1];
      //body = yield yreq.get(url);
      //TODO: get detail

    } else {
      console.log('-> notfound', name);
    }

  }

  return r;
}

function *main() {
  console.log('getting bangumi index...');
  var body = yield downloadJson('index');
  var years = JSON.parse(body).years;

  var weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
          yinfos.push(getBangumiInfo(bgms[k].name, s.index));
        }
        var infos = yield yinfos;
      }
    }
  }
}

function onerror(err) {
  if (err) {
    console.error(err.stack);
    process.exit(1);
  }
}

mkdirp(savedir, function () {
//setImmediate(function () {
  var ctx = new Object();
  var fn = co(main);
  fn.call(ctx, onerror);
//});
});
