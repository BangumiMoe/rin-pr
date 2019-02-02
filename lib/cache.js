
var config = require('./../config');
var generator = require('./generator');
var client;

var defTLL = 0;

function cache(prefix, ttl) {
  this.ttl = (ttl !== undefined) ? ttl : defTLL;
  this.prefix = prefix ? prefix : '';
  this.enable = client ? true : false;
}

cache.init = function (callback) {
  if (config['cache'] && config['cache']['enable']) {
    defTLL = config['cache']['ttl'];
    if (config['cache']['service'] == 'redis') {
      var c = config['cache'];
      var opts = {}
      if (c.db != null) {
        opts.db = c.db
      }
      var redis = require('redis');
      var client_ = redis.createClient(c.port, c.host, opts);
      client_.on('error', function (err) {
        console.error("Redis Error " + err);
      });
      client = new generator(client_);
    }
  }
};

cache.prototype.set = function *(key, val, isstring) {
  if (!client) return null;
  var r;
  if (this.ttl) {
    r = yield client.setex(this.prefix + key, this.ttl, isstring ? val : JSON.stringify(val));
  } else {
    r = yield client.set(this.prefix + key, isstring ? val : JSON.stringify(val));
  }
  //yield client.expire(this.prefix + key, this.ttl);
  return r;
};

cache.prototype.get = function *(key, isstring) {
  if (!client) return null;
  var r = yield client.get(this.prefix + key);
  if (!isstring) {
    r = JSON.parse(r);
  }
  return r;
};

cache.prototype.del = function *(key) {
  if (!client) return null;
  return yield client.del(this.prefix + key);
};

module.exports = cache;
