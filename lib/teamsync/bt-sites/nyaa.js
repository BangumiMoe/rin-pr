
var util = require('util');
var _ = require('underscore');
var S = require('string');
var html2markdown = require('html2markdown');
var EventProxy = require('eventproxy');

var rinTorrent = require('./../../torrent');
//var ocr = require('./../ocr').ocr;

var BTSiteBase = require('./base');

var MAX_TRY_TIMES = 10;
var NYAA_BASE_URL = 'https://nyaa.si';

function nyaaUrlPrefix(url, https) {
  return NYAA_BASE_URL + url;
}

function BTSiteNyaa(opts) {
  BTSiteBase.call(this);
  this.setSite('nyaa');
  this.m_options = {
    category: '1_3'
  };

  if (opts) {
    if (opts.announce_list) {
        this.announce_list = opts.announce_list;
    }
    this.m_options = _.extend(this.m_options, opts);
  }
}

util.inherits(BTSiteNyaa, BTSiteBase);

BTSiteNyaa.prototype.setCategory = function (category) {
  var cates = {
    'donga': '1_3',
    'comic': '3_3', // Literature - Non-English-Translated
    'game': '6_2', // Software - Games
    'music': '2_2', // Audio - Lossy
    'raws': '1_4', // Anime - Raw Anime
    'movie': '1_3',
    'collection': '1_3',
    'dorama': '4_3', // Live Action - Non-English-translated
    'other': '1_3' // CHECK: NO MATCH
  };
  var cate_id = cates[category];
  if (cate_id) {
    this.m_options.category = cate_id;
  }
};

BTSiteNyaa.prototype.IsLogin = function (callback) {
  this.request.clearCookie(NYAA_BASE_URL);
  if (this.m_username && this.m_password) {
    callback(null, true);
  } else {
    callback(null, false);
  }
};

BTSiteNyaa.prototype.LoginEx = function (callback) {
  if (this.m_username && this.m_password) {
    callback(null, true);
  } else {
    callback(null, false);
  }
};

BTSiteNyaa.prototype.LoginSucceed = function (callback) {
  // var str_cookie = this.request.getCookie(NYAA_BASE_URL);
  // this.saveCookie(str_cookie);
  callback(null, true);
};

BTSiteNyaa.prototype.upload = function (title, intro, opts, torrent_buf, callback) {
  //no need for vcode

  if (this.announce_list) {
    // need modify trackers
    torrent_buf = rinTorrent.update_announce(torrent_buf, this.announce_list[1], this.announce_list);
  }

  // get discuss URL
  var discussUrl = this.getLastUrl(intro);

  // use markdown
  intro = html2markdown(intro);

  var formdata = {
    name: title,
    //hidden: 0,
    //remake: 0,
    //anonymous: 0,
    description: intro,
    information: discussUrl,
    //complete: 0,
    trusted: 1,
  };
  formdata = _.extend(formdata, this.m_options);
  var __object = [{
    type: 'buffer',
    name: 'torrent',
    buffer: torrent_buf,
    options: {
      filename: this.getTorrentFilename()
  }}];

  var that = this;
  this.request.post(NYAA_BASE_URL + '/api/upload', {
    torrent_data: JSON.stringify(formdata),
    __object: __object,
  }, {
    json: true,
    multipart: true,
    auth: { user: this.m_username, pass: this.m_password },
  }, function (err, response, body) {
    if (err) {
      callback(err);
    }
    if (body) {
      if (body.errors) {
        callback(JSON.stringify(body.errors));
      } else {
        if (body.hash) {
          that.m_lastone = {
            url: body.url,
            title: body.name,
          };
          callback(null, true);
        } else {
          callback('unexpected body content');
        }
      }
    } else {
      callback('unknown error ' + response.statusCode);
    }
  });
};

BTSiteNyaa.prototype.getlastpublish = function (callback) {
  if (this.m_lastone) {
    var lastone = Object.assign(this.m_lastone);
    callback(null, lastone);
  } else {
    callback('not found');
  }
};

BTSiteNyaa.prototype.listmytorrents = function (p, callback) {
  if (typeof p === 'function') {
    callback = p
    p = null
  }

  callback('not support', false)
};

BTSiteNyaa.prototype.update = function (url, title, intro, callback) {
  callback('not support', false);
};

BTSiteNyaa.prototype.remove = function (url, callback) {
  callback('not support', false)
};

module.exports = BTSiteNyaa;
