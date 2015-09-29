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

const config = {

    web: {
        /* web server configurations */
        bindAddress: '127.0.0.1',
        bindPort: '3006',
        liteView: true,
        enable_image_upload: false,
        static_file_server: false,
        web_domain_prefix: base_url //+ '/#!'
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

    cdn: {
        domain_url: 'https://cdn.domain.com' // leave empty for false
    },

    sso: {
        service: 'disqus',
        shortname: 'bangumi',
        disqus: {
            'secret_key': '',
            'public_key': ''
        },
        notifier: {
            imaphost: 'imap.mail.com',
            user: 'notifications@',
            password: '',
            scan_time: 60 * 1000
        }
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
        /*
        service: "kana-api",
        options: {
          servers: [
            // url not end with '/add'
            { name: 'kana-tracker-hk', url: 'http://localhost/kana1', key: 'KANA PASS KEY1' },
            { name: 'kana-tracker-eu', url: 'http://localhost/kana2', key: 'KANA PASS KEY2' }
          ],
          whitelist: "/etc/opentracker/whitelist"
        },
        */
    },

    torrent: {
      contains: [
      ],
      add: [
        "http://tr.bangumi.moe:6969/announce", // announce
        "http://t.nyaatracker.com/announce",
        "http://open.acgtracker.com:1096/announce",
        "http://open.nyaatorrents.info:6544/announce",
        // "http://tracker.ktxp.com:6868/announce",
        // "http://tracker.ktxp.com:7070/announce",
        "http://t2.popgo.org:7456/annonce",
        "http://bt.sc-ol.com:2710/announce",
        "http://share.camoe.cn:8080/announce",
      ],
      remove: [
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
        teamAccountKey: 'i9j6wCgMqNGw',
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
        sender: '番組、萌え <test@test.moe>',
        admin: 'prpr@gmail.com'
    },

    ocr: {
      engine: 'ruokuai',
      username: '',
      password: ''
    },

    teamsync: {
      bt_sites: {
        nyaa: {
        }
      }
    },

    acgdb: {
      pathname: 'http://acgdb.com/'
    }

};

config.teamsync.bt_sites.nyaa.announce_list = config.torrent.add;

module.exports = config;
