
var util = require('util');
var _ = require('underscore');
var S = require('string');
var EventProxy = require('eventproxy');

var ocr = require('./../ocr').ocr;

var BTSiteBase = require('./base');

var MAX_TRY_TIMES = 10;
var KTXP_BASE_URL = 'http://bt.ktxp.com';

function BTSiteKtxp(username, password) {
  BTSiteBase.call(this, username, password);
  this.setSite('ktxp');
  this.m_options = {
    discuss_url: '',  //http://mahou-shoujo.moe/
    team_resource: 0
  };
}

util.inherits(BTSiteKtxp, BTSiteBase);

BTSiteKtxp.prototype.IsLogin = function (callback) {
  this.request.clearCookie(KTXP_BASE_URL);
  if (!this.m_cookie) {
    callback(null, false);
  } else {
    //check login
    this.request.setCookie(this.m_cookie, KTXP_BASE_URL);
    this.request.get(KTXP_BASE_URL + '/user.php?o=upload', function (err, response, body) {
      if (err) {
        callback(err);
        return;
      }
      if (response.statusCode !== 200) {
        callback(null, false);
      } else {
        callback(null, true);
      }
    });
  }
};

BTSiteKtxp.prototype.GetVcode = function (mode, callback) {
  this.request.get(KTXP_BASE_URL + '/vimg.php?n=' + mode, { buffer: true }, function (err, response, body) {
    if (err) {
      callback('验证码获取失败');
      return;
    }
    ocr(body, 4, callback);
  });
};

BTSiteKtxp.prototype.LoginForm = function (form, callback) {
  var that = this;
  this.GetVcode('login', function (err, word) {
    if (err) {
      callback(err);
      return;
    }
    form.vcode = word;
    that.request.post(KTXP_BASE_URL + '/user.php?o=login', form, function (err, response, body) {
      if (err) {
        callback(err);
        return;
      }
      if (response.statusCode === 200) {
        var message = 'message not found';
        var iboxpos = body.indexOf('<div class="main item-box">');
        if (iboxpos !== -1) {
          body = body.substr(iboxpos);
          var m = body.match(/<div class="container".*?>(.*?)</i);
          if (m) {
            message = m[1];
            if (form.node == 1
                && message.indexOf('极影论坛 没有这个用户') !== -1) {
              //本地用户
              form.node = 0;
              form.vcode = null;
              that.LoginForm(form, callback);
              return;
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
  });
};

BTSiteKtxp.prototype.LoginEx = function (callback) {
  var form = {
    op: 'login',
    url: encodeURIComponent(KTXP_BASE_URL + '/user.php?o=upload'),
    username: this.m_username,
    password: this.m_password,
    node: 1,
    cookietime: 315360000,
    vcode: null
  };
  this.LoginForm(form, callback);
};

BTSiteKtxp.prototype.LoginSucceed = function (callback) {
  var str_cookie = this.request.getCookie(KTXP_BASE_URL);
  this.saveCookie(str_cookie);
  callback(null, true);
};

BTSiteKtxp.prototype.UploadEx = function (formdata, callback) {
  var that = this;
  this.GetVcode('upload', function (err, word) {
    formdata.vcode = word;
    that.request.post(KTXP_BASE_URL + '/user.php?o=upload',
      formdata, { multipart: true },
      function (err, response, body) {
        if (err) {
          callback(err);
          return;
        }
        if (response.statusCode === 200) {
          var message = 'message not found';
          var iboxpos = body.indexOf('<div class="main">');
          if (iboxpos !== -1) {
            body = body.substr(iboxpos);
            iboxpos = body.indexOf('<div class="container forms">');
            if (iboxpos !== -1) {
              message = 'upload failed';
            } else {
              var m = body.match(/<p class="container-style".*?>(.*?)</i);
              if (m) {
                message = m[1];
                if (message.indexOf('发布成功') !== -1) {
                  // success
                  callback(null, true);
                  return;
                }
              }
            }
          }
          callback(message, false);
        } else {
          callback('unknown error', false);
        }
    });
  });
};

BTSiteKtxp.prototype.upload = function (title, intro, torrent_buf, callback) {
  var formdata = {
    op: 'upload',
    title: title,
    sort_id: 12,
    intro: intro,
    emule_resource: '',
    vcode: null
  };
  formdata = _.extend(formdata, this.m_options);
  formdata.__object = [{ 
    type: 'buffer',
    name: 'bt_file',
    buffer: torrent_buf,
    options: {
      filename: 'file.torrent'
  }}];
  var that = this;

  var itry = 1;
  var ep = new EventProxy();
  ep.once('teamid', function (team_id) {
    if (team_id) {
      formdata.team_resource = team_id;
    }
    ep.emit('upload');
  });
  ep.once('done', function (succeed) {
    ep.unbind();
    callback(null, succeed);
  });
  ep.on('upload', function () {
    that.UploadEx(formdata, function (err, succeed) {
      if (err) {
        if (err.indexOf('验证码') !== -1 && itry < MAX_TRY_TIMES) {
          itry++;
          //relogin
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
  this.request.get(KTXP_BASE_URL + '/user.php?o=upload', ep.done(function (response, body) {
    if (body) {
      var m = body.match(/name="team_resource" value="([0-9]+?)"/i);
      if (m) {
        ep.emit('teamid', m[1]);
        return;
      }
    }
    ep.emit('teamid');
  }));
};

BTSiteKtxp.prototype.getlastpublish = function (callback) {
  //find in team resources
  this.request.get(KTXP_BASE_URL + '/user.php?o=data&type=team', function (err, response, body) {
    if (err) {
      callback(err);
      return;
    }
    if (body) {
      var iboxpos = body.indexOf('<div id="container">');
      if (iboxpos !== -1) {
        body = body.substr(iboxpos);
        var m = body.match(/<a class="name" href="(.+?)".*?>(.+?)<\/a>/i);
        if (m) {
          var title = S(m[2]).decodeHTMLEntities().s;
          var lastone = {
            url: KTXP_BASE_URL + m[1],
            title: title
          };
          callback(null, lastone);
          return;
        }
      }
    }
    callback('not found');
  });
};

module.exports = BTSiteKtxp;