var config = require('./../config');
var validator = require('validator');
var exec = require('child_process').exec;
var tracker_config = config['tracker'];

var tracker_params = {
    service: '',
    pid: 0,
    enable: false,
    need_reload: false
};

function tracker_whitelist_reload() {
    if (!tracker_params.need_reload) {
        return;
    }

    exec('killall opentracker', function (err) {
        if (err) {
            console.error('reload tracker failed!');
        }
        tracker_init();
    });
    /*
    tracker_params.process.kill('SIGHUP');

    tracker_params.need_reload = false;
    */
}

function tracker_whitelist_add(infoHash, callback) {
    if (!tracker_params.enable) {
        return;
    }

    callback = callback ? callback : function () {
        tracker_whitelist_reload();
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
            if (tracker_config['options'] && tracker_config['options']['reloadTime']) {
                reloadTime = tracker_config['options']['reloadTime'];
            }
            exec(config['tracker'].options.command, function(error, stdout, stderr) {
                if (error) {
                    console.log(error);
                }
            });
            /*
             exec('ps -A | grep opentracker', function (err, stdout) {
             if (err) {
             return console.error(err);
             }
             if (stdout) {
             stdout = validator.trim(stdout);
             }
             if (stdout) {
             var ps = stdout.split(' ');
             if (ps[0]) {
             tracker_params.service = 'opentracker';
             tracker_params.enable = true;
             tracker_params.pid = ps[0];
             console.log('opentracker pid: ' + ps[0]);
             setInterval(tracker_whitelist_reload, reloadTime);
             }
             }
             });
             */
        }
    }
}

module.exports = {
    init: tracker_init,
    whitelist_add: tracker_whitelist_add,
    whitelist_reload: tracker_whitelist_reload
};
