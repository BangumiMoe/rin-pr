
var util = require('util');
var _ = require('underscore');
var S = require('string');
var EventProxy = require('eventproxy');

var request = require('./../util/request');
var ocr = require('./../ocr').ocr;

var BTSiteBase = require('./base');

var ACGRIP_BASE_URL = 'https://acg.rip';

function BTSiteAcgrip(opts) {
  BTSiteBase.call(this);
  this.setSite('acgrip');
  //this.m_vcode_url = '';
  this.m_options = {
    'utf8': '✓',
    'post[post_as_team]': 1,
    'post[category_id]': 1,
    'post[series_id]': 0,
    'commit': "发布"
  };
  if (opts) {
    this.m_options = _.extend(this.m_options, opts);
  }
  this.year = new Date().getFullYear();
}

util.inherits(BTSiteAcgrip, BTSiteBase);

BTSiteAcgrip.prototype.setCategory = function (category) {
  var cates = {
    'donga': 1,
    'comic': 9,
    'game': 9,
    'music': 4,
    'raws': 1,
    'movie': 1,
    'collection': 5,
    'dorama': 2,
    'other': 9
  };
  var cate_id = cates[category];
  if (cate_id) {
    this.m_options['post[category_id]'] = cate_id;
  }
};

BTSiteAcgrip.prototype.IsLogin = function (callback) {
  this.request.clearCookie(ACGRIP_BASE_URL);
  if (!this.m_cookie) {
    callback(null, false);
  } else {
    //check login
    this.request.setCookie(this.m_cookie, ACGRIP_BASE_URL);
    this.request.get(ACGRIP_BASE_URL + '/cp/posts/upload', {rejectUnauthorized: false}, function (err, response, body) {
      if (err) {
        callback(err);
        return;
      }
      if (response.statusCode !== 200) {
        //302 Found
        callback(null, false);
      } else {
        callback(null, true);
      }
    });
  }
};

/*BTSiteAcgrip.prototype.GetVcode = function (mode, callback) {
  this.request.get(ACGRIP_BASE_URL + this.m_vcode_url, { buffer: true }, function (err, response, body) {
    if (err) {
      callback('验证码获取失败');
      return;
    }
    ocr(body, 4, callback);
  });
};*/

BTSiteAcgrip.prototype.GetToken = function (body) {
  var token_regex = /<input [^>]*?\sname="authenticity_token" value="(.*?)"/;
  var m = body.match(token_regex);
  if (!m || !m[1]) {
    return;
  }
  return m[1];
};

BTSiteAcgrip.prototype.GetErrorMessage = function (body) {
  var message = 'message not found';
  //<fieldset>
  var m = /<div [^>]*?class="alert alert-(danger|warning)"/i.exec(body);
  if (m) {
    var iboxpos = body.indexOf('>', m.index + 1);
    if (iboxpos !== -1) {
      body = body.substr(iboxpos + 1);
      iboxpos = body.indexOf('</div>');
      if (iboxpos !== -1) {
        body = body.substring(0, iboxpos);
      }
      message = S(body).decodeHTMLEntities().s;
    }
  } else {
    m = body.match(/<title>(.*?)<\/title>/i)
    if (m && m[1]) {
      message = S(m[1]).decodeHTMLEntities().s;
    }
  }
  return message;
};

BTSiteAcgrip.prototype.LoginEx = function (callback) {
  var that = this;
  var formdata = {
    'utf8': '✓',
    //'authenticity_token': token,
    'user[email]': this.m_username,
    'user[password]': this.m_password,
    'user[remember_me]': 1,
    'commit': '登录'
  };
  this.request.get(ACGRIP_BASE_URL + '/users/sign_in', {rejectUnauthorized: false},
      function (err, response, body) {
    // get token first
    if (err) {
      callback(err);
      return;
    }
    var token = that.GetToken(body);
    if (!token) {
      callback('can\'t find token', false);
      return;
    }
    formdata.authenticity_token = token;
    that.request.post(ACGRIP_BASE_URL + '/users/sign_in', formdata,
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
  });
};

BTSiteAcgrip.prototype.LoginSucceed = function (callback) {
  var str_cookie = this.request.getCookie(ACGRIP_BASE_URL);
  this.saveCookie(str_cookie);
  callback(null, true);
};

BTSiteAcgrip.prototype.UploadEx = function (formdata, callback) {
  var that = this;
  this.request.post(ACGRIP_BASE_URL + '/cp/posts',
      formdata, { multipart: true, rejectUnauthorized: false },
    function (err, response, body) {
      if (err) {
        callback(err);
        return;
      }
      if (response.statusCode === 302) {
        callback(null, true);
      } else if (response.statusCode === 200) {
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

BTSiteAcgrip.prototype.upload = function (title, intro, torrent_buf, callback) {
  //no need for vcode
  intro = BTSiteBase.TransformIntro(intro);
  //title replace /(\\|,|\/)/
  var formdata = {
    'post[title]': title,
    'post[content]': intro,
    year: this.year,
  };
  formdata = _.extend(formdata, this.m_options);
  formdata.__object = [{
    type: 'buffer',
    name: 'post[torrent]',
    buffer: torrent_buf,
    options: {
      filename: this.getTorrentFilename(),
  }}];

  var that = this;
  this.request.get(ACGRIP_BASE_URL + '/cp/posts/upload', {rejectUnauthorized: false}, function (err, response, body) {
    if (err) {
      return callback(err);
    }
    if (body) {
      // league
      /*var iboxpos = body.indexOf('<select name="league"');
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
      }*/

      var token = that.GetToken(body);
      if (!token) {
        callback('can\'t find token', false);
        return;
      }
      formdata.authenticity_token = token;

      that.UploadEx(formdata, function (err, succeed) {
        if (err) {
          callback(err);
        } else {
          callback(null, succeed);
        }
      });
    }
  });
};

BTSiteAcgrip.prototype.getlastpublish = function (callback) {
  this.request.get(ACGRIP_BASE_URL + '/cp/posts', {rejectUnauthorized: false}, function (err, response, body) {
    if (err) {
      callback(err);
      return;
    }
    if (body) {
      var m = body.match(/<div class="list-group-item-heading"[\s\S]+?<a href="\/t\/([0-9]+?)"\s*?>(.+?)<\/a>/i);
      if (m) {
        var title = S(m[2]).decodeHTMLEntities().s;
        var lastone = {
          url: ACGRIP_BASE_URL + '/t/' + m[1],
          title: title
        };
        callback(null, lastone);
        return;
      }
    }
    callback('not found');
  });
};

BTSiteAcgrip.prototype.edit = function (url, formdata, callback) {
  var tid = '';
  var m = url.match(/\/t\/(\d+)/i);
  if (m && m[1]) {
    tid = m[1];
  } else {
    callback('tid not found', false);
    return;
  }

  var that = this;
  this.request.get(ACGRIP_BASE_URL + '/cp/posts/' + tid + '/edit', {rejectUnauthorized: false}, function (err, response, body) {
    if (err) {
      return callback(err);
    }
    if (body) {
      var token = that.GetToken(body);
      if (!token) {
        callback('can\'t find token', false);
        return;
      }
      formdata.authenticity_token = token;

      that.request.post(ACGRIP_BASE_URL + '/cp/posts/' + tid,
          formdata, { multipart: true, rejectUnauthorized: false },
        function (err, response, body) {
          if (err) {
            callback(err);
            return;
          }
          if (response.statusCode === 302) {
            callback(null, true);
          } else if (response.statusCode === 200) {
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
    }
  });
};

BTSiteAcgrip.prototype.update = function (url, title, intro, callback) {
  //no need for vcode
  intro = BTSiteBase.TransformIntro(intro);
  //title replace /(\\|,|\/)/
  var formdata = {
    'post[title]': title,
    'post[content]': intro,
    year: this.year,
    _method: 'patch',
  };
  formdata = _.extend(formdata, this.m_options);
  formdata.commit = '更新';

  this.edit(url, formdata, callback);
};

BTSiteAcgrip.prototype.remove = function (url, callback) {
  this.edit(url, { _method: 'delete' }, callback);
};

BTSiteAcgrip.prototype.listmytorrents = function (p, callback) {
  if (typeof p === 'function') {
    callback = p
    p = null
  }

  let url = '/cp/team_posts'
  if (p) {
    url += `?page=${p}`
  }

  var that = this;
  this.request.get(ACGRIP_BASE_URL + url, {rejectUnauthorized: false}, function (err, response, body) {
    if (err) {
      return callback(err)
    }
    if (response.statusCode === 200) {
      const m_divs = body.match(/<div class="list-group-item-heading">[\S\s]*?<a\s.*?href="(\/t\/\d+)">(.*?)<\/a>/ig)
      if (m_divs) {
        const torrents = m_divs.map((div) => {
          const m = div.match(/<a\s.*?href="(\/t\/\d+)">(.*?)<\/a>/i)
          if (m) {
            const tid = parseInt(m[1].substr(3))
            return { tid, url: m[1], title: S(m[2]).decodeHTMLEntities().s }
          }
          return null
        })
        callback(null, torrents)
      }
    } else {
      callback('unknown error')
    }
  })
};

module.exports = BTSiteAcgrip;
