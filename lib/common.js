
var validator = require('validator'),
  _ = require('underscore');

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
  var sarr = title.toLowerCase().split(/[\[\]「」【】]/);
  sarr = _.uniq(sarr);

  for (var i = 0; i < sarr.length; i++) {
    if (sarr[i]) {
      allarr.push(sarr[i]);

      var a = new Array(4);
      a[0] = sarr[i].split('&');
      a[1] = sarr[i].split(' ');
      a[2] = sarr[i].split('/');
      a[3] = sarr[i].split('_');

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

  return allarr;
}

function title_index(title) {
  if (!title || typeof title != 'string') {
    return [];
  }

  var titleIndex = [];
  var sarr = title.toLowerCase().split(/[\[\]「」【】 _\&\/]/);
  sarr = _.uniq(sarr);

  for (var i = 0; i < sarr.length; i++) {
    if (sarr[i]) {
      titleIndex = titleIndex.concat(sarr[i].split(''));
    }
  }

  titleIndex = _.uniq(titleIndex).sort();
  return titleIndex;
}

exports.preg_quote = preg_quote;
exports.title_split = title_split;
exports.title_index = title_index;
