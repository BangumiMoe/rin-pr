
var util = require('util');
var _ = require('underscore');
var S = require('string');
var EventProxy = require('eventproxy');

var request = require('./../util/request');
var ocr = require('./../ocr').ocr;

var BTSiteBase = require('./base');

var CAMOE_BASE_URL = 'https://camoe.org';

function BTSiteCamoe(opts) {
  BTSiteBase.call(this);
  this.setSite('camoe');
  //this.m_vcode_url = '';
  this.m_options = {
    sort: 1,
    league: 0,
    button: "提交"
  };
  if (opts) {
    this.m_options = _.extend(this.m_options, opts);
  }
}

util.inherits(BTSiteCamoe, BTSiteBase);

BTSiteCamoe.prototype.setCategory = function (category) {
  var cates = {
    'donga': 1,
    'comic': 5,
    'game': 5,
    'music': 4,
    'movie': 3,
    'collection': 1,
    'dorama': 2,
    'other': 5
  };
  var cate_id = cates[category];
  if (cate_id) {
    this.m_options.sort = cate_id;
  }
};

BTSiteCamoe.prototype.IsLogin = function (callback) {
  this.request.clearCookie(CAMOE_BASE_URL);
  if (!this.m_cookie) {
    callback(null, false);
  } else {
    //check login
    this.request.setCookie(this.m_cookie, CAMOE_BASE_URL);
    this.request.get(CAMOE_BASE_URL + '/post.php', {rejectUnauthorized: false}, function (err, response, body) {
      if (err) {
        callback(err);
        return;
      }
      if (response.statusCode !== 200) {
        callback(null, false);
      } else {
        if (body.indexOf('<script>location="login.php"') !== -1) {
          callback(null, false);
        } else {
          callback(null, true);
        }
      }
    });
  }
};

/*BTSiteCamoe.prototype.GetVcode = function (mode, callback) {
  this.request.get(CAMOE_BASE_URL + this.m_vcode_url, { buffer: true }, function (err, response, body) {
    if (err) {
      callback('验证码获取失败');
      return;
    }
    ocr(body, 4, callback);
  });
};*/

BTSiteCamoe.prototype.GetErrorMessage = function (body) {
  var message = 'message not found';
  var m = /<table [^>]*?background=/i.exec(body);
  if (m) {
    var iboxpos = body.indexOf('<table', m.index + 1);
    if (iboxpos !== -1) {
      body = body.substr(iboxpos);
      iboxpos = body.indexOf('</table>');
      if (iboxpos !== -1) {
        body = body.substring(0, iboxpos);
      }
      m = body.match(/<td ?[^>]*?>(.*?)<\/td>/i);
      if (m) message = S(m[1]).decodeHTMLEntities().s;
    }
  }
  return message;
};

BTSiteCamoe.prototype.LoginEx = function (callback) {
  var that = this;
  var formdata = {
    'username': this.m_username,
    'password': this.m_password,
    'button': '提交'
  };
  this.request.post(CAMOE_BASE_URL + '/deal.php', formdata,
    {rejectUnauthorized: false}, function (err, response, body) {
    if (err) {
      callback(err);
      return;
    }
    //no vcode
    if (response.statusCode === 302) {
      callback(null, true);
    } else if (response.statusCode === 200) {
      var message = that.GetErrorMessage(body);
      callback(message, false);
    } else {
      callback('unknown error', false);
    }
  });
};

BTSiteCamoe.prototype.LoginSucceed = function (callback) {
  var str_cookie = this.request.getCookie(CAMOE_BASE_URL);
  this.saveCookie(str_cookie);
  callback(null, true);
};

BTSiteCamoe.prototype.UploadEx = function (formdata, callback) {
  var that = this;
  this.request.post(CAMOE_BASE_URL + '/upload.php',
    formdata, { multipart: true, rejectUnauthorized: false },
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
      } else if (body) {
        var message = that.GetErrorMessage(body);
        callback(message, false);
      } else {
        callback('unknown error', false);
      }
  });
};

BTSiteCamoe.prototype.upload = function (title, intro, torrent_buf, callback) {
  //no need for vcode
  intro = BTSiteBase.TransformIntro(intro);
  //title replace /(\\|,|\/)/
  var formdata = {
    title: title,
    description: intro,
    emule: '',
    year: 2015,
    anim: -1,
    pic1: '',
    pic2: '',
    pic3: ''
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
  this.request.get(CAMOE_BASE_URL + '/post.php', {rejectUnauthorized: false}, function (err, response, body) {
    if (err) {
      return callback(err);
    }
    if (body) {
      var iboxpos = body.indexOf('<select name="league"');
      if (iboxpos !== -1) {
        body = body.substr(iboxpos);
        iboxpos = body.indexOf('</select>');
        if (iboxpos !== -1) {
          body = body.substring(0, iboxpos);
        }
        var m = body.match(/<option value="([0-9]+?)"/i);
        if (m) {
          formdata.league = m[1];
        }
      }
    }
    that.UploadEx(formdata, function (err, succeed) {
      if (err) {
        callback(err);
      } else {
        callback(null, succeed);
      }
    });
  });
};

BTSiteCamoe.prototype.getlastpublish = function (callback) {
  this.request.get(CAMOE_BASE_URL + '/my.php', {rejectUnauthorized: false}, function (err, response, body) {
    if (err) {
      callback(err);
      return;
    }
    if (body) {
      var m = body.match(/<a href="\.?\/read.php\?dataid=([0-9]+?)&.*?"\s*?>(.+?)<\/a>/i);
      if (m) {
        var title = S(m[2]).decodeHTMLEntities().s;
        var lastone = {
          url: CAMOE_BASE_URL + '/read.php?dataid=' + m[1],
          title: title
        };
        callback(null, lastone);
        return;
      }
    }
    callback('not found');
  });
};

module.exports = BTSiteCamoe;