
var util = require('util');
var _ = require('underscore');
var S = require('string');
var EventProxy = require('eventproxy');

var ocr = require('./../ocr').ocr;

var BTSiteBase = require('./base');

var POPGO_BASE_URL = 'https://share.popgo.org';

function BTSitePopgo(opts) {
  BTSiteBase.call(this);
  this.setSite('popgo');
  //this.m_vcode_url = '';
  this.m_options = {
    titleselect: 1,
    pubasgroup: 1,
    submit: 1
  };
  if (opts) {
    this.m_options = _.extend(this.m_options, opts);
  }
}

util.inherits(BTSitePopgo, BTSiteBase);

BTSitePopgo.prototype.setCategory = function (category) {
  var cates = {
    'donga': 1,
    'comic': 2,
    'game': 0,
    'music': 4,
    'raws': 8,
    'movie': 1,
    'collection': 12,
    'dorama': 5,
    'other': 0
  };
  var cate_id = cates[category];
  if (cate_id || cate_id === 0) {
    this.m_options.titleselect = cate_id;
  }
};

BTSitePopgo.prototype.IsLogin = function (callback) {
  this.request.clearCookie(POPGO_BASE_URL);
  if (!this.m_cookie) {
    callback(null, false);
  } else {
    //check login
    this.request.setCookie(this.m_cookie, POPGO_BASE_URL);
    this.request.get(POPGO_BASE_URL + '/publish.php', function (err, response, body) {
      if (err) {
        callback(err);
        return;
      }
      if (response.statusCode !== 200) {
        callback(null, false);
      } else {
        if (body.indexOf('<form action="login.php"') !== -1) {
          callback(null, false);
        } else {
          callback(null, true);
        }
      }
    });
  }
};

/*BTSitePopgo.prototype.GetVcode = function (mode, callback) {
  request.get(POPGO_BASE_URL + this.m_vcode_url, { buffer: true }, function (err, response, body) {
    if (err) {
      callback('验证码获取失败');
      return;
    }
    ocr(body, 4, callback);
  });
};*/

BTSitePopgo.prototype.GetErrorMessage = function (body) {
  var message = 'message not found';
  var iboxpos = body.indexOf('<table id="error_table">');
  if (iboxpos !== -1) {
    body = body.substr(iboxpos);
    var m = body.match(/<p class="pincenter">(.*?)<\/p>/i);
    if (m) message = m[1];
  }
  return message;
};

BTSitePopgo.prototype.LoginEx = function (callback) {
  var that = this;
  var formdata = {
    'username': this.m_username,
    'password': this.m_password,
    'url': 'publish.php',
    'submit': '登录!'
  };
  this.request.post(POPGO_BASE_URL + '/login.php', formdata, function (err, response, body) {
    if (err) {
      callback(err);
      return;
    }
    //no vcode
    if (response.statusCode === 200) {
      var message = that.GetErrorMessage(body);
      if (message.indexOf('登录成功') !== -1) {
        callback(null, true);
        return;
      }
      callback(message, false);
    } else {
      callback('unknown error', false);
    }
  });
};

BTSitePopgo.prototype.LoginSucceed = function (callback) {
  var str_cookie = this.request.getCookie(POPGO_BASE_URL);
  this.saveCookie(str_cookie);
  callback(null, true);
};

BTSitePopgo.prototype.UploadEx = function (formdata, callback) {
  var that = this;
  this.request.post(POPGO_BASE_URL + '/publish.php',
    formdata, { multipart: true },
    function (err, response, body) {
      if (err) {
        callback(err);
        return;
      }
      if (response.statusCode === 200) {
        var message = that.GetErrorMessage(body);
        if (message.indexOf('成功') !== -1) {
          // success
          callback(null, true);
          return;
        }
        callback(message, false);
      } else if (response.statusCode === 500) {
        var message = that.GetErrorMessage(body);
        callback(message, false);
      } else {
        callback('unknown error', false);
      }
  });
};

BTSitePopgo.prototype.upload = function (title, intro, opts, torrent_buf, callback) {
  //no need for vcode
  // use bbcode
  intro = BTSiteBase.TransformIntro(intro, {
    transsize: true,
    nolist: true,
    noalign: true,
    noheadings: true
  });
  var formdata = {
    subject: title,
    message: intro,
    emule: ''
  };
  formdata = _.extend(formdata, this.m_options);
  formdata.__object = [{
    type: 'buffer',
    name: 'btseed',
    buffer: torrent_buf,
    options: {
      filename: this.getTorrentFilename()
  }}];

  this.UploadEx(formdata, function (err, succeed) {
    if (err) {
      callback(err);
    } else {
      callback(null, succeed);
    }
  });
};

BTSitePopgo.prototype.getlastpublish = function (callback) {
  this.request.get(POPGO_BASE_URL + '/profile.php?action=myseed', function (err, response, body) {
    if (err) {
      callback(err);
      return;
    }
    if (body) {
      var m = body.match(/<a href="profile.php\?action=editseed&hash=(.+?)">(.+?)<\/a>/i);
      if (m) {
        var title = S(m[2]).decodeHTMLEntities().s;
        var lastone = {
          url: POPGO_BASE_URL + '/program-' + m[1] + '.html',
          title: title
        };
        callback(null, lastone);
        return;
      }
    }
    callback('not found');
  });
};

module.exports = BTSitePopgo;
