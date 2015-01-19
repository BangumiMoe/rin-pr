
var config = require('./../../../config');

var fs = require('fs');
var co = require('./../../../node_modules/koa/node_modules/co');
var MyRequest = require('./../../../lib/teamsync/util/request');
var generator = require('./../../../lib/generator');
var EventProxy = require('eventproxy');
var mkdirp = require('mkdirp');
var request = new MyRequest();

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
        if (!bgms) {
          continue;
        }
        for (var k = 0; k < bgms.length; k++) {

        }
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
