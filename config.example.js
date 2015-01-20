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
var base_url = 'http://rin.pr.com';

module.exports = {

    web: {
        /* web server configurations */
        bindAddress: '127.0.0.1',
        bindPort: '3006',
        enable_image_upload: false,
        static_file_server: false,
        web_domain_prefix: base_url + '/#!'
    },

    rss: {
        default_items_limit: 50,
        max_items_limit: 100
    },

    cache: {
        enable: true,
        service: 'redis',
        host: '127.0.0.1',
        port: 6379,
        ttl: 3 * 60   //3min
    },

    tracker: {
        /* tracker configurations */
        /* tracker should use only https (for safety)? */
        service: "opentracker",
        options: {
          command: "opentracker -f /etc/opentracker/opentracker.conf",
          whitelist: "/etc/opentracker/whitelist",
          reload_time: 0  //0 for instant reload
        },
        contains: [
        ],
        announce: [
          "http://tracker.publicbt.com:80/announce",
          "http://open.nyaatorrents.info:6544/announce",
          "http://tracker.openbittorrent.com:80/announce",
          "udp://tracker.openbittorrent.com:80/announce",
          "http://www.mp4mkv.org/1b/announce.php",
          "http://www.mp4mkv.org:2710/announce",
          "http://tracker.ktxp.com:6868/announce",
          "http://tracker.ktxp.com:7070/announce",
          "http://t2.popgo.org:7456/annonce",
          "http://bt.sc-ol.com:2710/announce",
          "http://share.camoe.cn:8080/announce",
          "http://tracker.prq.to/announce",
          "http://61.154.116.205:8000/announce",
          "http://bt.rghost.net:80/announce",
          "http://bt.edwardk.info:4040/announce",
          "http://208.67.16.113:8000/annonuce",
          "udp://208.67.16.113:8000/annonuce"
        ]
    },

    db: {
        /* database configurations */
        username: '',
        password: '',
        host: '127.0.0.1:27017',
        name: 'rin'
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
        root_dir: root_dir,
        tmp_dir: tmp_dir
    },

    app: {
        dev_mode: dev_mode,
        base_url: base_url,
        api_domain_prefix: base_url,
        override_lang: false,
        def_lang: 'zh_tw',
        langs: ['en', 'zh_tw', 'zh_cn']
    },

    mail: {
        service: 'Gmail',
        user: 'test@gmail.com',
        password: 'test',
        sender: '番組、萌え <test@test.moe>'
    },

    ocr: {
      engine: 'ruokuai',
      username: '',
      password: ''
    }

};