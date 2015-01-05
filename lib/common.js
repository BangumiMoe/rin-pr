
var validator = require('validator'),
  _ = require('underscore'),
  cache = require('./cache');

var flowCache;

function preg_quote(str, delimiter) {
  //  discuss at: http://phpjs.org/functions/preg_quote/
  // original by: booeyOH
  // improved by: Ates Goral (http://magnetiq.com)
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: Brett Zamir (http://brett-zamir.me)
  // bugfixed by: Onno Marsman
  //   example 1: preg_quote("$40");
  //   returns 1: '\\$40'
  //   example 2: preg_quote("*RRRING* Hello?");
  //   returns 2: '\\*RRRING\\* Hello\\?'
  //   example 3: preg_quote("\\.+*?[^]$(){}=!<>|:");
  //   returns 3: '\\\\\\.\\+\\*\\?\\[\\^\\]\\$\\(\\)\\{\\}\\=\\!\\<\\>\\|\\:'

  return String(str)
    .replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&');
}

function title_split(title) {
  if (!title || typeof title != 'string') {
    return [];
  }

  var allarr = [];
  var sarr = title.toLowerCase().split(/[\[\]\(\)「」【】]/);
  sarr = _.uniq(sarr);

  for (var i = 0; i < sarr.length; i++) {
    if (sarr[i]) {
      allarr.push(sarr[i]);

      var a = new Array(4);
      a[0] = sarr[i].split('&');
      a[1] = sarr[i].split(' ');
      a[2] = sarr[i].split('/');
      a[3] = sarr[i].split('_');

      if (a[1].length > 2) {
        var reblank = _.filter(a[1], function (str) { return !!str; });
        var joinsize = [2, 3];
        for (var j = 0; j < joinsize.length; j++) {
          if (reblank.length > joinsize[j]) {
            a[1].push(reblank.slice(0, joinsize[j]).join(' '));
          }
        }
      }

      for (var j = 0; j < a.length; j++) {
        if (a[j] && a[j].length > 1) {
          allarr = allarr.concat(a[j]);
        }
      }
    }
  }

  allarr = _.map(allarr, function (str) {
    return validator.trim(str);
  });
  allarr = _.uniq(allarr);
  allarr = _.filter(allarr, function (str) { return !!str; });

  return allarr;
}

function title_index(title) {
  if (!title || typeof title != 'string') {
    return [];
  }

  var titleIndex = [];
  var sarr = title.toLowerCase().split(/[\[\]\(\)「」【】 _\&\/]/);
  sarr = _.uniq(sarr);
  //sarr = _.filter(sarr, function (str) { return !!str; });

  for (var i = 0; i < sarr.length; i++) {
    if (sarr[i]) {
      titleIndex = titleIndex.concat(sarr[i].split(''));
    }
  }

  titleIndex = _.uniq(titleIndex).sort();
  return titleIndex;
}

function is_mongoid_array(_ids) {
  if ((_ids instanceof Array) && _ids.length > 0) {
    for (var i = 0; i < _ids.length; i++) {
      if (!validator.isMongoId(_ids[i])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

var ipflowcontrol = function* (method, ip, limit) {
  if (!flowCache) {
    flowCache = new cache('flow', 1 * 60);
  }
  if (!flowCache.enable) {
    return false;
  }

  var k = method + '/ip/' + ip;
  if (!limit) {
      yield flowCache.del(k, times);
      return false;
  }
  var times = yield flowCache.get(k);
  if (times === null) {
      times = 1;
      yield flowCache.set(k, times);
  } else if (times < limit) {
      times++;
      yield flowCache.set(k, times);
  } else {
      return true;
  }
  return false;
};

//don't use validator.extend, for it will convert array by array.join()
validator.isMongoIdArray = is_mongoid_array;

exports.preg_quote = preg_quote;
exports.title_split = title_split;
exports.title_index = title_index;
exports.is_mongoid_array = is_mongoid_array;
exports.ipflowcontrol = ipflowcontrol;
