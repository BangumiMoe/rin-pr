
var util = require('util');
var _ = require('underscore');
var S = require('string');
var EventProxy = require('eventproxy');

var ocr = require('./../ocr').ocr;

var BTSiteBase = require('./base');

var DMHY_BASE_URL = 'http://share.dmhy.org';

function BTSiteDmhy(username, password) {
  BTSiteBase.call(this, username, password);
  this.setSite('dmhy');
  this.m_vcode_url = '';
  this.m_options = {
    team_id: 0,
    sort_id: 2,
    tracker: "http://tracker.openbittorrent.com:80/announce\n"
              + "http://tracker.publicbt.com:80/announce\n"
              + "http://tracker.prq.to/announce",
    MAX_FILE_SIZE: 2097152,
    disable_download_seed_file: 0,
    submit: '提交'
  };
}

util.inherits(BTSiteDmhy, BTSiteBase);

BTSiteDmhy.prototype.setCategory = function (category) {
  var cates = {
    'donga': 2,
    'comic': 3,
    'game': 9,
    'music': 4,
    'movie': 2,   //same with donga
    'collection': 31,
    'dorama': 6,
    'other': 1
  };
  var cate_id = cates[category];
  if (cate_id) {
    this.m_options.sort_id = cate_id;
  }
};

BTSiteDmhy.prototype.IsLogin = function (callback) {
  this.request.clearCookie(DMHY_BASE_URL);
  if (!this.m_cookie) {
    callback(null, false);
  } else {
    //check login
    this.request.setCookie(this.m_cookie, DMHY_BASE_URL);
    this.request.get(DMHY_BASE_URL + '/topics/add', function (err, response, body) {
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

BTSiteDmhy.prototype.GetVcode = function (mode, callback) {
  this.request.get(DMHY_BASE_URL + this.m_vcode_url, { buffer: true }, function (err, response, body) {
    if (err) {
      callback('验证码获取失败');
      return;
    }
    ocr(body, 5, callback);
  });
};

BTSiteDmhy.prototype.GetErrorMessage = function (body) {
  var message = 'message not found';
  var iboxpos = body.indexOf('<div class="ui-widget">');
  if (iboxpos !== -1) {
    body = body.substr(iboxpos);
    var m = body.match(/<li class="text_bold text_blue">(.*?)</i);
    if (m) message = m[1];
  }
  return message;
};

BTSiteDmhy.prototype.LoginEx = function (callback) {
  var that = this;
  this.request.get(DMHY_BASE_URL + '/user/login?goto=%2Ftopics%2Fadd', function (err, response, body) {
    if (err) {
      callback(err);
      return;
    }
    //get vcode first
    var m = body.match(/<img id="captcha_img".*? src="(.+?)"/i);
    if (m && m[1]) {
      that.m_vcode_url = m[1];
      that.GetVcode('login', function (err, word) {
        var form = {
          goto: encodeURIComponent('/topics/add'),
          email: that.m_username,
          password: that.m_password,
          login_node: 0,
          cookietime: 315360000,
          captcha_code: word
        };
        that.request.post(DMHY_BASE_URL + '/user/login', form, function (err, response, body) {
          if (err) {
            callback(err);
            return;
          }
          if (response.statusCode === 200) {
            var message = that.GetErrorMessage(body);
            if (message.indexOf('登入成功') !== -1) {
              callback(null, true);
              return;
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
    } else {
      callback('没有找到验证码地址');
    }
  });
};

BTSiteDmhy.prototype.LoginSucceed = function (callback) {
  var str_cookie = this.request.getCookie(DMHY_BASE_URL);
  this.saveCookie(str_cookie);
  callback(null, true);
};

BTSiteDmhy.prototype.UploadEx = function (formdata, callback) {
  var that = this;
  this.request.post(DMHY_BASE_URL + '/topics/add',
    formdata, { multipart: true },
    function (err, response, body) {
      if (err) {
        callback(err);
        return;
      }
      if (response.statusCode === 200) {
        var message = 'message not found';
        var iboxpos = body.indexOf('class="main"');
        if (iboxpos !== -1) {
          body = body.substr(iboxpos);
          iboxpos = body.indexOf('<dl class="zend_form">');
          if (iboxpos !== -1) {
            var m = body.match(/<ul class="errors"><li>(.*?)</i);
            if (m) message = m[1];
          } else {
            message = that.GetErrorMessage(body);
            if (message.indexOf('成功') !== -1) {
              // success
              callback(null, true);
              return;
            }
          }
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

BTSiteDmhy.prototype.upload = function (title, intro, torrent_buf, callback) {
  // no need for vcode

  // get poster URL
  var posterUrl = '';
  var m = intro.match(/<img\s.*?src="(.*?)".*?\/?>/i);
  if (m && m[1]) posterUrl = m[1];

  var formdata = {
    bt_data_title: title,
    poster_url: posterUrl,
    bt_data_intro: intro,
    emule_resource: ''
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
  this.request.get(DMHY_BASE_URL + '/topics/add', function (err, response, body) {
    if (err) {
      return callback(err);
    }
    if (body) {
      var iselpos = body.indexOf('<select name="team_id"');
      if (iselpos !== -1) {
        body = body.substr(iselpos);
        var m = body.match(/<option value="([0-9]+?)"/i);
        if (m) {
          formdata.team_id = m[1];
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

BTSiteDmhy.prototype.getlastpublish = function (callback) {
  //find in team resources
  this.request.get(DMHY_BASE_URL + '/topics/mlist/scope/team', function (err, response, body) {
    if (err) {
      callback(err);
      return;
    }
    if (body) {
      var iboxpos = body.indexOf('<div id="topics_mlist"');
      if (iboxpos !== -1) {
        body = body.substr(iboxpos);
        var m = body.match(/<a href="(\/topics\/view\/.+?)"[\S\s]*?>(.+?)<\/a>/i);
        if (m) {
          var title = S(m[2]).decodeHTMLEntities().s;
          var lastone = {
            url: DMHY_BASE_URL + m[1],
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

module.exports = BTSiteDmhy;