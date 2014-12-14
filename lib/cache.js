
var config = require('./../config');
var generator = require('./generator');
var client;

function cache(prefix) {
  this.prefix = prefix ? prefix : '';
}

cache.init = function (callback) {
  if (config['cache'] && config['cache']['enable']) {
    if (config['cache']['service'] == 'redis') {
      var c = config['cache'];
      var redis = require('redis');
      var client_ = redis.createClient(c.port, c.host);
      client_.on('error', function (err) {
        console.error("Redis Error " + err);
      });
      client = new generator(client_);
    }
  }
};

cache.prototype.set = function *(key, val, isstring) {
  if (!client) return null;
  return yield client.set(this.prefix + key, isstring ? val : JSON.stringify(val));
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