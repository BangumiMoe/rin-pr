
var config = require('./../../config');
var tracker_config = config['tracker'];
var tracker_instance = null;

var tracker_params = {
  service: '',
  whitelist: null
};

function tracker_init() {
  if (tracker_config) {
    switch (tracker_config['service']) {
      case 'opentracker':
        tracker_params.service = 'opentracker';
        tracker_instance = require('./ot');
        break;
      case 'kana-api':
        tracker_params.service = 'kana-api';
        tracker_instance = require('./kana');
        break;
      default:
        console.log('Unsupported tracker service.');
        return;
        break;
    }
    tracker_params.whitelist = tracker_config['options'].whitelist;
    tracker_instance.init();
  }
}

function tracker_whitelist_add(infoHash, callback) {
  var whitelist = tracker_params.whitelist;

  if (whitelist) {
    fs.appendFile(whitelist, infoHash + '\n', function (err) {
      if (err) {
        console.error('tracker', err);
        return;
      }
      if (tracker_instance && tracker_instance.whitelist_add) {
        tracker_instance.whitelist_add(infoHash, callback);
      } else {
        callback();
      }
    });
  }
}

function tracker_whitelist_reload() {
  if (tracker_instance && tracker_instance.whitelist_reload) {
    tracker_instance.whitelist_reload();
  }
}

function tracker_whitelist_rebuild(infoHashs, callback) {
  var whitelist = tracker_params.whitelist;

  if (whitelist) {
    var infoHash = infoHashs.join('\n');
    fs.writeFile(whitelist, infoHash + '\n', function (err) {
      if (err) {
        console.error('tracker', err);
        return;
      }
      if (tracker_instance && tracker_instance.whitelist_rebuild) {
        tracker_instance.whitelist_rebuild(infoHashs, callback);
      } else {
        callback();
      }
    });
  }
}

module.exports = {
  init: tracker_init,
  whitelist_add: tracker_whitelist_add,
  whitelist_reload: tracker_whitelist_reload,
  whitelist_rebuild: tracker_whitelist_rebuild
};
