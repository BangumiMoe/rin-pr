
var EventProxy = require('eventproxy');

//db
var BtSitesProxy = require('./../db/proxy/bt-sites');

var MAX_TRY_TIMES = 10;

function BTSiteBase() {
  this.m_username = '';
  this.m_password = '';
  this.m_cookie = '';
  this.m_db_id = null;
  this.m_user_id = null;
}

BTSiteBase.prototype.setSite = function (site) {
  this.m_site = site;
};

BTSiteBase.prototype.init = function (callback) {
  //read cookie
  if (!this.m_user_id) {
    callback('not set user_id');
    return;
  }

  var that = this;
  BtSitesProxy.getBtSiteByUserIdAndSite(this.m_user_id, this.m_site, function (err, btsite) {
    if (err) {
      callback(err);
      return;
    }
    if (btsite) {
      that.m_db_id = btsite._id;
      that.m_username = btsite.username;
      that.m_password = btsite.password;
      that.m_cookie = btsite.cookie;
    }
    callback();
  })
};

BTSiteBase.prototype.setUserId = function (user_id) {
  this.m_user_id = user_id;
};

BTSiteBase.prototype.saveCookie = function (str_cookie, callback) {
  //this.m_site = site;
  if (this.m_db_id) {
    BtSitesProxy.updateCookieById(this.m_db_id, str_cookie, callback);
  } else {
    BtSitesProxy.newAndSave(this.m_user_id, this.m_site, this.m_username, this.m_password, str_cookie, callback);
  }
  this.m_cookie = str_cookie;
};

//virtual
BTSiteBase.prototype.IsLogin = function (callback) {
};

BTSiteBase.prototype.GetVcode = function (mode, callback) {
};

BTSiteBase.prototype.LoginEx = function (callback) {
};

BTSiteBase.prototype.LoginSucceed = function (callback) {
  callback(null, true);
};

BTSiteBase.prototype.login = function (callback) {
  if (!this.m_password && !this.m_cookie) {
    callback('not set password and no cookie');
    return;
  }

  var that = this;
  this.IsLogin(function (err, islogin, body) {
    if (err) {
      callback(err);
      return;
    }
    if (islogin) {
      callback(null, true);
      return;
    }
    // need login
    var itry = 1;
    var ep = new EventProxy();
    ep.once('done', function (islogin) {
      ep.unbind();
      if (islogin) {
        //saveCookie
        that.LoginSucceed(callback);
      } else {
        callback(null, islogin);
      }
    });
    ep.on('login', function () {
      that.LoginEx(function (err, islogin) {
        if (err) {
          if (err.indexOf('验证码') !== -1 && itry < MAX_TRY_TIMES) {
            itry++;
            //relogin
            return ep.emit('login');
          } else {
            return ep.emit('error', err);
          }
        }
        ep.emit('done', islogin);
      });
    });
    ep.fail(function (err) {
      callback(err, false);
    });
    ep.emit('login');
  });
};

BTSiteBase.prototype.UploadEx = function (formdata, callback) {
};

BTSiteBase.prototype.upload = function (title, intro, torrent_buf, callback) {
};

BTSiteBase.prototype.getlastpublish = function (callback) {
};

module.exports = BTSiteBase;