
var fs = require('fs');
var tough = require('tough-cookie');
var urlParse = require('url').parse;

var request = require('request');
var S = require('string');
var _ = require('underscore');

var DEF_USER_AGENT = 'cloud-subs/0.1 (KNA) by tengattack';

function MyRequest() {
  this.j = request.jar();
}

MyRequest.prototype.clearCookie = function (url) {
  if (this.j.store) {
    //memstore
    var context = urlParse(url);
    var host = tough.canonicalDomain(context.hostname);
    this.j.store.removeCookies(host, tough.defaultPath(context.pathname), function () {});
  }
};

MyRequest.prototype.setCookie = function (str_cookie, url) {
  var that = this;
  var arr_cookie = str_cookie.split(';');
  _.each(arr_cookie, function (sub_cookie) {
    sub_cookie = sub_cookie.trim();
    if (sub_cookie) {
      cookie = request.cookie(sub_cookie);
      that.j.setCookie(cookie, url);
    }
  });
};

MyRequest.prototype.getCookie = function (url) {
  return this.j.getCookieString(url);
};

MyRequest.prototype.get = function (url, options, callback) {
  var cb;
  var opts = {
    method: 'GET',
    uri: url,
    followRedirect: false,
    headers: {
      'User-Agent': DEF_USER_AGENT
    },
    gzip: true,
    jar: this.j
  };
  if (options instanceof Function) {
    cb = options;
    options = null;
  } else {
    cb = callback;
  }
  if (options) {
    if (options.rejectUnauthorized !== undefined) {
      opts.rejectUnauthorized = options.rejectUnauthorized;
    }
    if (options.buffer) {
      //the body is returned as a Buffer
      opts.encoding = null;
    }
    if (options.json) {
      opts.json = options.json;
    }
    if (options.auth) {
      //user, pass
      opts.auth = options.auth;
      opts.auth.sendImmediately = true;
    }
  }

  request(opts, cb);
};

MyRequest.prototype.post = function (url, form, options, callback) {
  var cb;
  var opts = {
    method: 'POST',
    uri: url,
    followRedirect: false,
    headers: {
      'User-Agent': DEF_USER_AGENT
    },
    gzip: true,
    jar: this.j
  };
  var multipart = false;
  if (options instanceof Function) {
    cb = options;
    options = null;
  } else {
    cb = callback;
  }
  if (options) {
    if (options.rejectUnauthorized !== undefined) {
      opts.rejectUnauthorized = options.rejectUnauthorized;
    }
    if (options.buffer) {
      //the body is returned as a Buffer
      opts.encoding = null;
    }
    if (options.json) {
      opts.json = options.json;
    }
    if (options.auth) {
      //user, pass
      opts.auth = options.auth;
      opts.auth.sendImmediately = true;
    }
    if (options.multipart) {
      if (form) {
        multipart = true;
      }
      opts.postambleCRLF = true;
    } else {
      opts.form = form;
    }
  } else {
    opts.form = form;
  }

  var r = request(opts, cb);
  if (multipart) {
    var f = r.form();
    _.each(form, function (value, key) {
      if (key === '__object') {
        _.each(value, function (item) {
          f.append(item.name, item.buffer, item.options);
        });
      } else {
        f.append(key, value);
      }
    });
  }
};

module.exports = MyRequest;
