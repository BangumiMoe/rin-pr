
var request = require('request');

var config = require('./../../config');
var tracker_config = config['tracker'];

var kana_servers;

function kana_init() {
  var opts = tracker_config['options'];
  if (opts) {
    kana_servers = opts.servers;
  }
}

function kana_whitelist_add(infoHash, callback) {
  if (kana_servers) {
    for (var i = 0; i < kana_servers.length; i++) {
      var kana = kana_servers[i];
      if (kana.url && kana.key) {
        request.post({ url: kana.url + '/add', form: { key: kana.key, infoHash: infoHash } }, function (err, res, body) {
          if (err) {
            console.error('tracker', kana.name ? kana.name : 'unknown',
              'add', infoHash, err);
            return;
          }
          if (res.statusCode !== 200) {
            console.error('tracker', kana.name ? kana.name : 'unknown',
              'add', infoHash, 'status', res.statusCode);
          }
        });
      }
    }
    callback();
  }
}

function kana_whitelist_reload() {
}

function kana_whitelist_rebuild(infoHashs, callback) {
  callback();
}

module.exports = {
  init: kana_init,
  whitelist_add: kana_whitelist_add,
  // unsupported:
  //whitelist_reload: kana_whitelist_reload,
  //whitelist_rebuild: kana_whitelist_rebuild
};