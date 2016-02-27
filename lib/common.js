
var crypto = require('crypto');

var validator = require('validator'),
  _ = require('underscore'),
  html2bbcode = require('html2bbcode'),
  cache = require('./cache');

var ObjectID = require('mongodb').ObjectID;

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
  var sarr = title.toLowerCase().split(/[\[\]\(\)（）「」【】]/);
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

function parse_search_query_patterns(q){
  var patterns = [];
  var blank = /\s/;
  var wordbreak = /\s|\|/;
  var regex_tag_id = /^`([0-9a-f]{24})`/;
  q = q.trim();

  var findquoteend = html2bbcode.HTMLTag.prototype.findquoteend;

  function parse_tag_id(q, start) {
    var m = q.substr(start).match(regex_tag_id);
    if (m && m[1]) {
      return {
        tag_id: m[1],
        len: 26
      };
    }
    throw new Error('error tag(s)');
  }

  function parse_word(q, start) {
    var i = start;
    var len;
    var word;
    if (q[i] === '\'' || q[i] === '\"') {
      // quote
      i = findquoteend(q, i);
      if (i !== -1 && i > start) {
        // only first quote
        len = i - start + 1;
        word = q.substr(start + 1, len - 2);
        word = word.replace(/\\(['"])/g, "$1");
      }
    } else {
      while (i < q.length && !wordbreak.test(q[i])) {
        i++;
      }
      len = i - start;
      if (len) {
        word = q.substr(start, len);
      }
    }
    if (word) {
      return {
        word: word,
        len: len
      };
    }
    throw new Error('error word(s)');
  }

  for (var i = 0; i < q.length; i++) {
    var negative = false;
    var in_tag = 0;
    var subpattcount = 0;
    var subpatterns = [];
    var t;
    if (q[i] === '-') {
      negative = true;
      i++;
    }
    do {
      if (subpattcount > 0) {
        // pass |
        i++;
      }
      if (i >= q.length || blank.test(q[i])) {
        // end / `error or split`
        break;
      }
      if (q[i] === '-') {
        throw new Error('error operator(s)');
      }
      if (q[i] === '`') {
        // begin of tag
        if (in_tag === -1) {
          throw new Error('error combination(s)');
        }
        in_tag = 1;
        t = parse_tag_id(q, i);
        i += t.len;
        subpatterns.push(t.tag_id);
      } else {
        // word
        if (in_tag === 1) {
          throw new Error('error combination(s)');
        }
        in_tag = -1;
        t = parse_word(q, i);
        i += t.len;
        subpatterns.push(t.word);
      }
      subpattcount++;
    } while (q[i] === '|');

    if (subpatterns.length > 0) {
      subpatterns = _.uniq(subpatterns);
      patterns.push({
        negative: negative,
        in_tag: (in_tag === 1),
        words: subpatterns
      });
    }
  }
  return patterns;
}

function parse_search_query(q) {
  var patterns = parse_search_query_patterns(q);
  if (patterns.length > 0) {
    var mq;
    var mqand = [];
    //TODO: simplify this query
    for (var i = 0; i < patterns.length; i++) {
      var pat = patterns[i];
      var inq;
      if (pat.in_tag) {
        inq = { $in: _.map(pat.words, function (tag_id) {
          return new ObjectID(tag_id);
        }) };
        mqand.push(pat.negative ? { tag_ids: { $not: inq } } : { tag_ids: inq });
      } else {
        inq = { $in: _.map(pat.words, function (word) {
          return new RegExp(preg_quote(word), 'i');
        }) };

        mqand.push(pat.negative ? { title: { $not: inq } } : { title: inq });
      }
    }
    mq = (patterns.length === 1) ? mqand[0] : { $and: mqand };
    return mq;
  } else {
    throw new Error('empty query pattern');
  }
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
    flowCache = new cache('flow/', 1 * 60);
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

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}

function md5(str) {
  var hash = crypto
    .createHash('md5')
    .update(str)
    .digest('hex');

  return hash;
}

function aes_encode(text, key) {
  var cipher = crypto.createCipher('aes-256-cbc', key);
  var crypted = cipher.update(text, 'utf8', 'binary');
  crypted += cipher.final('binary');
  var sc = new Buffer(crypted, 'binary').toString('base64');
  return sc;
}

function aes_decode(crypted, key) {
  // must be base64 format
  if (!crypted) {
    return '';
  }
  var dc = new Buffer(crypted, 'base64');
  var decipher = crypto.createDecipher('aes-256-cbc', key);
  var dec = decipher.update(dc, 'binary', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

//don't use validator.extend, for it will convert array by array.join()
validator.isMongoIdArray = is_mongoid_array;

exports.preg_quote = preg_quote;
exports.title_split = title_split;
exports.title_index = title_index;
exports.parse_search_query = parse_search_query;
exports.parse_search_query_patterns = parse_search_query_patterns;

exports.is_mongoid_array = is_mongoid_array;
exports.is_empty_object = isEmptyObject;

exports.ipflowcontrol = ipflowcontrol;

exports.md5 = md5;

exports.aes_encode = aes_encode;
exports.aes_decode = aes_decode;
