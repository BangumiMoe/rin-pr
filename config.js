/**
 * rin-pr project configuration
 */

var path = require('path');

//'..' for config folder, '.' for config.js file
var root_dir = path.resolve(__dirname, '.') + '/';
var public_dir = root_dir + 'public/';

var upload_dir = public_dir + 'data/';
var tmp_dir = public_dir + 'data/tmp/';

var dev_mode = true;

module.exports = {

    web: {
        /* web server configurations */
        bindAddress: '127.0.0.1',
        bindPort: '3006',
        staticFileServer: true
    },

    tracker: {
        /* tracker configurations */
        /* tracker should use only https (for safety)? */
    },

    db: {
        /* database configurations */
        username: '',
        password: '',
        host: '127.0.0.1:27017',
        name: 'prpr'
    },

    security: {
        /* Security settings */
        keyGrip: [
            'phahMi0Pue3fohPae8Kohboo7phoAuy7ohnuqui9OhRoo3siLuEo1epi',
            'reihet5Yhs3xaeDhee0ieken0HoxahV8zahthah0Wahhree3KauaPh2i'
        ],
        // one week
        maxAge: 7 * 24 * 60 * 60 * 1000
    },

    sys: {
        public_dir: public_dir,
        upload_dir: upload_dir,
        tmp_dir: tmp_dir
    },

    app: {
        dev_mode: dev_mode
    }

};
