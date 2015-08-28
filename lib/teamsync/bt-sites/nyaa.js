
var util = require('util');
var _ = require('underscore');
var S = require('string');
var EventProxy = require('eventproxy');

var rinTorrent = require('./../../torrent');
var ocr = require('./../ocr').ocr;

var BTSiteBase = require('./base');

var MAX_TRY_TIMES = 10;
var NYAA_BASE_URL = 'https://www.nyaa.eu';

function BTSiteNyaa(opts) {
  BTSiteBase.call(this);
  this.setSite('nyaa');
  this.m_options = {
    catid: '1_38'
  };
  if (opts) {
    if (opts.announce_list) {
      this.announce_list = opts.announce_list;
      delete opts.announce_list;
    } else {
      this.announce_list = [ 'http://open.nyaatorrents.info:6544/announce' ];
    }
    this.m_options = _.extend(this.m_options, opts);
  }
}

util.inherits(BTSiteNyaa, BTSiteBase);

BTSiteNyaa.prototype.setCategory = function (category) {
  var cates = {
    'donga': '1_38',
    'comic': '4_18', // Pictures - Graphics
    'game': '6_24', // Software - Games
    'music': '1_32', // Anime - Non-English-translated Anime
    'raws': '1_11', // Anime - Raw Anime
    'movie': '1_38',
    'collection': '1_38',
    'dorama': '5_21', // Live Action - Non-English-translated Live Action
    'other': '1_38' // CHECK: NO MATCH
  };
  var cate_id = cates[category];
  if (cate_id) {
    this.m_options.catid = cate_id;
  }
};

BTSiteNyaa.prototype.IsLogin = function (callback) {
  this.request.clearCookie(NYAA_BASE_URL);
  if (!this.m_cookie) {
    callback(null, false);
  } else {
    //check login
    this.request.setCookie(this.m_cookie, NYAA_BASE_URL);
    this.request.get(NYAA_BASE_URL + '/?page=upload', function (err, response, body) {
      if (err) {
        callback(err);
        return;
      }
      if (response.statusCode !== 200) {
        callback(null, false);
      } else {
        var profileRegex = /<ul id="tabnav">[\s\S]*?<a href=".*?\?page\=profile">Profile<\/a>[\s\S]*?<\/ul>/i;
        var isLogin = profileRegex.test(body);
        callback(null, isLogin);
      }
    });
  }
};

/*BTSiteNyaa.prototype.GetVcode = function (mode, callback) {
  this.request.get(NYAA_BASE_URL + '/?page=vcode', { buffer: true }, function (err, response, body) {
    if (err) {
      callback('验证码获取失败');
      return;
    }
    ocr(body, 4, callback);
  });
};*/

BTSiteNyaa.prototype.LoginForm = function (form, callback) {
  var that = this;
  that.request.post(NYAA_BASE_URL + '/?page=login', form, function (err, response, body) {
    if (err) {
      callback(err);
      return;
    }
    if (response.statusCode === 200) {
      if ('refresh' in response.headers) {
        var ref = response.headers['refresh'];
        if (ref.indexOf('url=') >= 0) {
          callback(null, true);
          return;
        }
      }
      // or: <div class="content">&#160;<b>Login successful!</b><br>&#160;Redirecting...</div>
      var message = 'message not found';
      var iboxpos = body.indexOf('<div class="content">');
      if (iboxpos !== -1) {
        var iboxposend = body.indexOf('<form', iboxpos);
        if (iboxposend !== -1) {
          body = body.substr(iboxpos, iboxposend - iboxpos);
          var m = body.match(/<b>(.*?)<\/b>.*?I forgot my password\!/i);
          if (m) {
            message = m[1];
            if (form.method == 1
                && (message.indexOf('Login failed!') !== -1)) {
              //本地用户
              form.method = 2;
              that.LoginForm(form, callback);
              return;
            }
          }
        }
      }
      callback(message, false);
    } else if (response.statusCode === 302) {
      callback(null, true);
    } else {
      callback('unknown error', false);
    }
    return;
  });
};

BTSiteNyaa.prototype.LoginEx = function (callback) {
  var that = this;
  that.request.get(NYAA_BASE_URL + '/?page=login', function (err, response, body) {
    if (err) {
      callback(err);
      return;
    }
    var form = {
      method: 1, //1 for User name, 2 for E-mail, 3 for User ID
      login: that.m_username,
      password: that.m_password,
      submit: 'Submit'
    };
    that.LoginForm(form, callback);
  });
};

BTSiteNyaa.prototype.LoginSucceed = function (callback) {
  var str_cookie = this.request.getCookie(NYAA_BASE_URL);
  this.saveCookie(str_cookie);
  callback(null, true);
};

BTSiteNyaa.prototype.UploadEx = function (formdata, callback) {
  var that = this;
  /*this.GetVcode('upload', function (err, word) {
    if (err) {
      callback(err);
      return;
    }
    formdata.vcode = word;*/
    that.request.post(NYAA_BASE_URL + '/?page=upload',
      formdata, { multipart: true },
      function (err, response, body) {
        if (err) {
          callback(err);
          return;
        }
        if (Math.floor(response.statusCode / 100) === 4) {
          var message = 'message not found';
          var iboxpos = body.indexOf('<div class="content">');
          if (iboxpos !== -1) {
            if (body.indexOf('>I\'m a little teapot', iboxpos) >= 0) {
              callback('I\'m a little teapot', false);
              return;
            }
            body = body.substr(iboxpos);
            var m = body.match(/<div class="error">(.*?)<\/div>/i);
            if (m) {
              message = m[1];
            }
          }
          callback(message, false);
        } else if (response.statusCode === 200) {
          //<div class="content">&#160;Your torrent has been uploaded successfully and will turn up in the torrent list shortly hereafter. <a href="https://www.nyaa.eu/?page=view&#38;tid=726202">View your torrent.</a></div>
          var iboxpos = body.indexOf('<div class="content">');
          if (iboxpos !== -1) {
            body = body.substr(iboxpos);
            var m = body.match(/<a href="(.*?)">View your torrent\.<\/a>/i);
            if (m) {
              that.m_torrent_url = S(m[1]).decodeHTMLEntities().s;
            }
          }
          callback(null, true);
        } else {
          callback('unknown error', false);
        }
    });
  //});
};

BTSiteNyaa.prototype.upload = function (title, intro, torrent_buf, callback) {
  //no need for vcode

  //need modify trackers
  torrent_buf = rinTorrent.update_announce(torrent_buf, this.announce_list[0], this.announce_list);

  var discussUrl = '';
  var m = intro.match(/<a\s.*?href="(.*?)".*?>/i);
  if (m && m[1]) discussUrl = m[1];

  // use bbcode
  intro = BTSiteBase.TransformIntro(intro, { nolist: true, noheadings: true });

  var formdata = {
    name: title,
    info: discussUrl,
    //hidden: 0,
    //remake: 0,
    //anonymous: 0,
    description: intro,
    rules: 1,
    submit: 'Upload'
  };
  formdata = _.extend(formdata, this.m_options);
  formdata.__object = [{
    type: 'buffer',
    name: 'torrent',
    buffer: torrent_buf,
    options: {
      filename: 'file.torrent'
  }}];
  var that = this;

  var itry = 1;
  var ep = new EventProxy();
  ep.once('done', function (succeed) {
    ep.unbind();
    callback(null, succeed);
  });
  ep.on('upload', function () {
    that.UploadEx(formdata, function (err, succeed) {
      if (err) {
        if (typeof err == 'string' &&
          err.indexOf('unknow') !== -1 && itry < MAX_TRY_TIMES) {
          // no possible for this error
          itry++;
          return ep.emit('upload');
        } else {
          return ep.emit('error', err);
        }
      }
      ep.emit('done', succeed);
    });
  });
  ep.fail(function (err) {
    callback(err, false);
  });
  this.request.get(NYAA_BASE_URL + '/?page=upload', ep.done(function (response, body) {
    ep.emit('upload');
  }));
};

BTSiteNyaa.prototype.getlastpublish = function (callback) {
  //find in team resources
  var that = this;
  var cb = function (err, lo) {
    if (lo && lo.url) {
      // replace with nyaa.se domain
      lo.url = lo.url.replace(NYAA_BASE_URL, 'http://www.nyaa.se');
    }
    callback(err, lo);
  };
  if (this.m_torrent_url) {
    this.request.get(this.m_torrent_url, function (err, response, body) {
      if (err) {
        cb(null, { url: that.m_torrent_url, title: '' });
        return;
      }
      var title = '';
      if (response.statusCode === 200) {
        var iboxpos = body.indexOf('<table class="viewtable">');
        if (iboxpos !== -1) {
          body = body.substr(iboxpos);
          var m = body.match(/<td class="viewtorrentname">(.*?)<\/td>/i);
          if (m) {
            title = S(m[1]).decodeHTMLEntities().s;
          }
        }
      }
      cb(null, { url: that.m_torrent_url, title: title });
    });
    return;
  }
  this.request.get(NYAA_BASE_URL + '/?page=profile', function (err, response, body) {
    if (err) {
      cb(err);
      return;
    }
    if (response.statusCode === 200 && body) {
      var iboxpos = body.indexOf('<div class="content">');
      if (iboxpos !== -1) {
        body = body.substr(iboxpos);
        var m = body.match(/<a href="(.*?)">My torrents<\/a>/i);
        if (m) {
          var torrentsUrl = m[1];
          that.request.get(torrentsUrl, function (err, response, body) {
            if (err) {
              cb(err);
              return;
            }
            if (body) {
              var m1 = body.match(/<table class="tlist">(.*?)<\/table>/i);
              if (m1) {
                body = m1[1];
                var m = body.match(/<td class="tlistname">.*?<a href="(.*?)">(.*?)<\/a>/i);
                var url = S(m[1]).decodeHTMLEntities().s;
                var title = S(m[2]).decodeHTMLEntities().s;
                var lastone = {
                  url: url,
                  title: title
                };
                cb(null, lastone);
                return;
              }
            }
            cb('not found');
          });
          return;
        }
      }
    }
    cb('not found');
  });
};

module.exports = BTSiteNyaa;
