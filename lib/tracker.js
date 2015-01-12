
var fs = require('fs');

var config = require('./../config');
var validator = require('validator');
var exec = require('child_process').exec;
var tracker_config = config['tracker'];

var tracker_params = {
  service: '',
  pid: 0,
  enable: false,
  need_reload: false,
  instant_reload: false
};

function tracker_whitelist_reload() {
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

function tracker_whitelist_add(infoHash, callback) {
  if (!tracker_params.enable) {
    return;
  }

  callback = callback ? callback : function () {
    if (tracker_params.instant_reload) {
      tracker_whitelist_reload();
    }
  };

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
          tracker_params.enable = true;
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
}

module.exports = {
    init: tracker_init,
    whitelist_add: tracker_whitelist_add,
    whitelist_reload: tracker_whitelist_reload
};
