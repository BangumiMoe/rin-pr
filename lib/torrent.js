
var _package = require('./../package');
var config = require('./../config');

var util = require('util'),
    fs = require('fs'),
    _ = require('underscore'),
    validator = require('validator'),
    readTorrent = require('read-torrent');

const APP_NAME = _package.name;
const APP_VERSION = _package.version;
const TORRENT_BUF_KEYS = ['ed2k', 'filehash', 'pieces'];

function is_buf_key(key) {
  //return true;
  return TORRENT_BUF_KEYS.indexOf(key) >= 0;
}

function decode_integer(buf, pos) {
  var i = pos.i;
  var start = i, end;
  var c1 = String.fromCharCode(buf[i]);
  if (c1 === '-') {
    i++;
  }
  while ((c1 = String.fromCharCode(buf[i])) != 'e') {
    if (!('0' <= c1 && c1 <= '9')) {
      throw new Error('Non-digit characters in integer');
    }
    i++;
    if (i >= buf.length) {
      throw new Error('Invalid integer');
    }
  }
  end = i;
  if (end === start || (end === start + 1 && c1 === '-')) {
    throw new Error('Empty integer');
  }
  var s = buf.toString('ascii', start, end);
  pos.i = end + 1;
  return parseInt(s);
}

function decode_string(buf, pos, tobuf) {
  var i = pos.i;
  var start = i;
  var c1 = String.fromCharCode(buf[i]);
  var c2 = String.fromCharCode(buf[i + 1]);
	if ( c1 === '0' && c2 != ':' ) {
    throw new Error('Invalid string length, leading zero');
  }
  i++;
  while (String.fromCharCode(buf[i]) !== ':') {
    i++;
    if (i >= buf.length) {
      throw new Error('Invalid string length, colon not found');
    }
  }
  i++;
  var slen = buf.toString('ascii', start, i);
  var len = parseInt(slen);
	if (i + len + 1 > buf.length) {
		throw new Error('Invalid string, input too short for string length');
	}

  var string = tobuf ? buf.slice(i, i + len) : buf.toString('utf8', i, i + len);
  pos.i = i + len;
	return string;
}

function decode_list(buf, pos) {
  var i = pos.i;
  var list = [];
  var char;
	while ((char = String.fromCharCode(buf[i])) != 'e') {
		list.push(decode_data(buf, pos));
    i = pos.i;
    if (i >= buf.length) {
			throw new Error('Unterminated list');
    }
	}
  pos.i++;
	return list;
}

function decode_dictionary(buf, pos) {
  var i = pos.i;
  var dictionary = {};
	var previous = null;
  var char;
	while ((char = String.fromCharCode(buf[i])) != 'e') {
		if (!('0' <= char && char <= '9'))
			throw new Error('Invalid dictionary key');
    pos.i = i;
		var key = decode_string(buf, pos);
		if (dictionary[key])
			throw new Error('Duplicate dictionary key');
		if (previous && key < previous)
			throw new Error('Missorted dictionary key');
		dictionary[key] = decode_data(buf, pos, is_buf_key(key));
		previous = key;
    i = pos.i;
    if (i >= buf.length) {
			throw new Error('Unterminated dictionary');
    }
	}
  pos.i++;
	return dictionary;
}

function decode_data(buf, pos, tobuf) {
  var i = pos.i;
  var c = String.fromCharCode(buf[i]);
  switch (c) {
    case 'i':
      i++;
      pos.i = i;
      return decode_integer(buf, pos);
		case 'l':
      i++;
      pos.i = i;
      return decode_list(buf, pos);
    case 'd':
      i++;
      pos.i = i;
      return decode_dictionary(buf, pos);
    default:
      return decode_string(buf, pos, tobuf);
  }
}

function decode(buf) {
  var pos = { i: 0 };
  return decode_data(buf, pos);
}

function get_dictionary_pos(buf, pos) {
  var i = pos.i;
  var dictionary = {};
	var previous = null;
  var char;
	while ((char = String.fromCharCode(buf[i])) != 'e') {
		if (!('0' <= char && char <= '9'))
			throw new Error('Invalid dictionary key');
    pos.i = i;
		var key = decode_string(buf, pos);
		if (dictionary[key])
			throw new Error('Duplicate dictionary key');
		if (previous && key < previous)
			throw new Error('Missorted dictionary key');
    var data = decode_data(buf, pos, is_buf_key(key));

		dictionary[key] = { start: i, end: pos.i };
		previous = key;
    i = pos.i;
    if (i >= buf.length) {
			throw new Error('Unterminated dictionary');
    }
	}
  pos.i++;
	return dictionary;
}

function build_string(bufarr, str) {
  var len;
  if (!(str instanceof Buffer)) {
    str = new Buffer(str);
  }
  var s = str.length.toString() + ':';
  bufarr.push(new Buffer(s));
  bufarr.push(str);
}

function build_integer(bufarr, num) {
  var s = 'i' + num.toString() + 'e';
  bufarr.push(new Buffer(s));
}

function build_list(bufarr, list) {
  bufarr.push(new Buffer('l'));
  for (var i = 0; i < list.length; i++) {
    build_data(bufarr, list[i]);
  }
  bufarr.push(new Buffer('e'));
}

function build_dictionary(bufarr, dict) {
  bufarr.push(new Buffer('d'));
  for (var k in dict) {
    build_string(bufarr, k);
    build_data(bufarr, dict[k]);
  }
  bufarr.push(new Buffer('e'));
}

function build_data(bufarr, data) {
  var t;
  if (data instanceof Buffer) {
    // treat as string
    t = 'string';
  } else if (data instanceof Array) {
    t = 'array';
  } else {
    t = typeof(data);
  }
  switch (t) {
    case 'number':
      build_integer(bufarr, data);
      break;
    case 'string':
      build_string(bufarr, data);
      break;
    case 'array':
      build_list(bufarr, data);
      break;
    case 'object':
      build_dictionary(bufarr, data);
      break;
    default:
      throw new Error('Unsupported value type \'' + t + '\'.');
      break;
  }
}

function build(data) {
  var bufarr = [];
  build_data(bufarr, data);
  return Buffer.concat(bufarr);
}

function update_announce(buf, announce, announce_list) {
  //protocols: ['http','https','ftp']
  if (!announce || !validator.isURL(announce)) {
    return false;
  }
  if (!announce_list || announce_list.length <= 0) {
    announce_list = [ announce ];
  } else if (announce_list.indexOf(announce) < 0) {
    announce_list.splice(0, 0, announce);
  }
  var pos = { i: 1 };
  // the first byte must be 'd' in a torrent file
  var posinfo = get_dictionary_pos(buf, pos);

  //new info
  // announce
  var arr_ann = [ new Buffer('8:announce') ];
  build_string(arr_ann, announce);
  // announce-list
  var arr_ann_list = [ new Buffer('13:announce-list') ];
  var ann_list_trans = [];
  for (var i = 0; i < announce_list.length; i++) {
    if (!announce || !validator.isURL(announce)) {
      //throw Error('Invalid torrent announce');
      return false;
    }
    ann_list_trans.push([ announce_list[i] ]);
  }
  build_list(arr_ann_list, ann_list_trans);
  // created by
  var arr_creat = [ new Buffer('10:created by') ];
  build_string(arr_creat, APP_NAME + '/' + APP_VERSION);

  var buf_replace = {
    'announce': arr_ann,
    'announce-list': arr_ann_list,
    'created by': arr_creat
  };

  //new buffer
  var bufarr = [];
  var i = 0;
  for (var k in posinfo) {
    if (k in buf_replace) {
      var pos = posinfo[k];
      if (i < pos.start) {
        bufarr.push(buf.slice(i, pos.start));
      }
      bufarr = bufarr.concat(buf_replace[k]);
      i = pos.end;
    }
  }
  if (i === 0) {
    return false;
  }
  if (i < buf.length) {
    bufarr.push(buf.slice(i));
  }
  return Buffer.concat(bufarr);
}

exports.decode = decode;
exports.build = build;
exports.update_announce = update_announce;
