
var fs = require('fs');

var config = require('./../../config');
var validator = require('validator');
var exec = require('child_process').exec;
var tracker_config = config['tracker'];

var tracker_params = {
  pid: 0,
  need_reload: false,
  instant_reload: false
};

function ot_whitelist_reload() {
  if (!tracker_params.need_reload) {
    return;
  }

  exec('kill -HUP `pidof opentracker`', function (err) {
    if (err) {
      console.error('reload tracker failed!');
    }
    //no need for reinit
    //tracker_init();
  });

  if (!tracker_params.instant_reload) {
    tracker_params.need_reload = false;
  }
}

function ot_whitelist_add(infoHash, callback) {
  tracker_params.need_reload = true;
  if (tracker_params.instant_reload) {
    tracker_whitelist_reload();
  }
  callback();
}

function ot_whitelist_rebuild(infoHashs, callback) {
  tracker_params.need_reload = true;
  callback();
}

function ot_init() {
  if (tracker_config) {
    var reloadTime = 15 * 60 * 1000;
    if (tracker_config['options']) {
      reloadTime = tracker_config['options']['reload_time'];
    }
    exec('pidof opentracker', function (err, stdout) {
      if (err) {
        return console.error(err);
      }
      if (stdout) {
        stdout = validator.trim(stdout);
      }
      if (stdout) {
        var pid = stdout;
        tracker_params.service = 'opentracker';
        tracker_params.pid = pid;
        if (config['app'].dev_mode) {
          console.log('opentracker pid: ' + pid);
        }
        if (reloadTime > 0) {
          setInterval(tracker_whitelist_reload, reloadTime);
        } else {
          tracker_params.need_reload = true;
          tracker_params.instant_reload = true;
        }
      }
    });
  }
}

module.exports = {
    init: ot_init,
    whitelist_add: ot_whitelist_add,
    whitelist_reload: ot_whitelist_reload,
    whitelist_rebuild: ot_whitelist_rebuild
};
