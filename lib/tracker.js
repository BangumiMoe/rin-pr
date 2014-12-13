
var config = require('./../config');
var spawn = require('child_process').spawn;
var tracker_config = config['tracker'];

var tracker_params = {
  service: '',
  process: null,
  enable: false,
  need_reload: false
};

function tracker_whitelist_reload() {
  if (!tracker_params.need_reload) {
    return;
  }

  tracker_params.process.kill('SIGHUP');

  tracker_params.need_reload = false;
}

function tracker_whitelist_add(infoHash, callback) {
  if (!tracker_params.enable) {
    return;
  }

  callback = callback ? callback : function () {};

  var whitelist = tracker_config['options'].whitelist;
  tracker_params.need_reload = true;
  if (whitelist) {
    fs.appendFile(whitelist, infoHash + '\n', callback);
  }
}

function tracker_init() {
  if (tracker_config) {
    if (tracker_config['service'] == 'opentracker') {
      var reloadTime = 15 * 60 * 1000;
      if (tracker_config['options'] && tracker_config['options']['reloadTime']) {
        reloadTime = tracker_config['options']['reloadTime'];
      }

      var process = null;
      try {
        process = spawn(tracker_config['command'], tracker_config['args']);
      } catch (e) {
      }
      if (process) {
        tracker_params.service = 'opentracker';
        tracker_params.enable = true;
        tracker_params.process = process;
        setInterval(tracker_whitelist_reload, reloadTime);
      }
    }
  }
}

module.exports = {
  init: tracker_init,
  whitelist_add: tracker_whitelist_add,
  whitelist_reload: tracker_whitelist_reload
};