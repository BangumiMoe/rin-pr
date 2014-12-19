
var util = require('util');
var _ = require('underscore');
var S = require('string');
var EventProxy = require('eventproxy');

var request = require('./../util/request');
var ocr = require('./../ocr').ocr;

var BTSiteBase = require('./base');

var POPGO_BASE_URL = 'https://share.popgo.org';

function BTSitePopgo(username, password) {
  BTSiteBase.call(this, username, password);
  this.setSite('popgo');
  //this.m_vcode_url = '';
  this.m_options = {
    pubasgroup: 1,
    submit: 1
  };
}

util.inherits(BTSitePopgo, BTSiteBase);

BTSitePopgo.prototype.IsLogin = function (callback) {
  request.clearCookie(POPGO_BASE_URL);
  if (!this.m_cookie) {
    callback(null, false);
  } else {
    //check login
    request.setCookie(this.m_cookie, POPGO_BASE_URL);
    request.get(POPGO_BASE_URL + '/publish.php', function (err, response, body) {
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

BTSitePopgo.prototype.TransformIntro = function (intro) {
  intro = intro.replace(/<h\d>([\s\S]*?)<\/h\d>/ig, "[size=3]$1[/size]");
  intro = intro.replace(/<p(\s(.*?))?>([\s\S]*?)<\/p>/ig, "$3");
  intro = intro.replace(/<span(\s(.*?))?>([\s\S]*?)<\/span>/ig, "$3");
  intro = intro.replace(/<br(\s(.*?))?>/ig, "\n");
  intro = intro.replace(/<img\s.*?src="(.*?)".*?\/?>/ig, "[img]$1[/img]");
  intro = intro.replace(/<a\s.*?href="(.*?)".*?>(.*?)<\/a>/ig, "[url=$1]$2[/url]");
  intro = S(intro).decodeHTMLEntities().s;
  return intro;
};

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
  request.post(POPGO_BASE_URL + '/login.php', formdata, function (err, response, body) {
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
  var str_cookie = request.getCookie(POPGO_BASE_URL);
  this.saveCookie(str_cookie);
  callback(null, true);
};

BTSitePopgo.prototype.UploadEx = function (formdata, callback) {
  var that = this;
  request.post(POPGO_BASE_URL + '/publish.php',
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

BTSitePopgo.prototype.upload = function (title, intro, torrent_buf, callback) {
  //no need for vcode
  intro = this.TransformIntro(intro);
  var formdata = {
    titleselect: 1,
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
      filename: 'file.torrent'
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
  request.get(POPGO_BASE_URL + '/profile.php?action=myseed', function (err, response, body) {
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