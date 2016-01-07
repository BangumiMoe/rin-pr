var _ = require('underscore'),
    validator = require('validator'),
    request = require('request');
var co = require('./../../node_modules/koa/node_modules/co');
var config = require('./../../config');
var models = require('./../../models'),
    Tags = models.Tags,
    Bangumis = models.Bangumis;
var ObjectID = require('mongodb').ObjectID;
var fs = require('fs');
var mkdirp = require('mkdirp');

const ACGDB_CURRENT_API_URL = 'http://api.acgdb.com/current_season';
const ACGDB_DETAIL_API_URL = 'http://api.acgdb.com/detail?id=';
const RIN_IMAGE_PATH = 'data/images/' + new Date().getFullYear() + '/' + ('0' + (new Date().getMonth() + 1)).slice(-2) + '/';
const RIN_IMAGE_SAVEPATH = '../../public/' + RIN_IMAGE_PATH;

function exit() {
    process.exit(0);
}

function yreq(url) {
    return function(callback) {
        console.log('HTTP API REQUEST: ' + url);
        request(url, function(err, resp, body) {
            if (!err && resp.statusCode == 200) {
                callback(err, body);
            } else {
                callback(err);
            }
        });
    };
}

function imgreq(url) {
    return function(callback) {
        console.log('HTTP DOWNLOAD REQUEST: ' + url);
        request(url, {
            encoding: 'binary'
        }, function(err, resp, body) {
            if (!err && resp.statusCode == 200) {
                callback(err, body, resp.headers['content-type'].split('/')[1]);
            } else {
                console.warn(err);
                callback();
            }
        });
    }
}

var getQuater = function*() {
    var y = new Date().getFullYear();
    var d = new Date().getMonth();
    if (d <= 2) {
        return y + 'Q1';
    } else if (d > 2 && d <= 4) {
        return y + 'Q2';
    } else if (d > 5 && d <= 7) {
        return y + 'Q3';
    } else {
        return y + 'Q4';
    }
}

var rin_check_dup = function*(bgm_names) {
    var bgm_result = yield new Tags().matchTags(bgm_names);
    return bgm_result;
}

var acgdb_fetch_image = function*(acgdb_id) {
    var body = yield yreq(ACGDB_DETAIL_API_URL + acgdb_id);
    var ani_data, cover_data, icon_data;
    try {
        ani_data = JSON.parse(body);
    } catch (e) {
        // error handle
    }
    if (ani_data && ani_data.image_path_cover && ani_data.image_path_mini) {
        cover_data = yield imgreq(ani_data.image_path_cover);
        icon_data = yield imgreq(ani_data.image_path_mini);

        if (cover_data[0]) {
            var coverfname = ani_data.id + '-cover.' + cover_data[1];
            fs.writeFileSync(RIN_IMAGE_SAVEPATH + coverfname, cover_data[0], 'binary');
            console.log('FILE: ' + coverfname + ' saved.');
        } else {
            console.warn('WARN: No cover found for anime ' + ani_data.id);
        }
        if (icon_data[0]) {
            var iconfname = ani_data.id + '-icon.' + icon_data[1];
            fs.writeFileSync(RIN_IMAGE_SAVEPATH + iconfname, icon_data[0], 'binary');
            console.log('FILE: ' + iconfname + ' saved.');
        } else {
            console.warn('WARN: No icon found for anime ' + ani_data.id);
        }

        return {
            cover: RIN_IMAGE_PATH + coverfname,
            icon: RIN_IMAGE_PATH + iconfname
        };
    } else {
        // no cover in api
        console.warn('WARN: No Cover or Icon found in API for ' + ani_data.id);
        return {
            cover: '',
            icon: ''
        }
    }
}

var acgdb_get_copyright = function*(acgdb_id) {
    var body = yield yreq(ACGDB_DETAIL_API_URL + acgdb_id);
    var aani;
    try {
        aani = JSON.parse(body);
    } catch (e) {}

    if (aani && aani.relations && aani.relations.main_staff) {
        var main_staff = aani.relations.main_staff;
        for (var i = 0; i < main_staff.length; i++) {
            if (main_staff[i].type === '制作') {
                var ent = main_staff[i].entities;
                if (!ent) continue;
                var copyright = '';
                for (var j = 0; j < ent.length; j++) {
                    if (ent[j].name_locale && ent[j].name_locale.original) {
                        if (copyright) copyright += ', ';
                        copyright += ent[j].name_locale.original;
                    }
                }
                if (copyright) {
                    return copyright;
                }
                break;
            }
        }
    }

    console.warn('WARN: couldn\'t found detail for ' + acgdb_id);
    return '';
};

var acgdb_parse_anime = function*(acgdb_id, showOn, time, acgdb_anime) {
    var tags = {
        synonyms: [],
        locale: {}
    };
    var names = acgdb_anime.names;
    var name;
    for (var loc in names) {
        var n = names[loc];
        var add_locale = function(loc, name) {
            var loc_lc = loc.toLowerCase();
            var loc_s = loc_lc.split('_');
            switch (loc_s[0]) {
                case 'ja':
                case 'en':
                    tags.locale[loc_s[0]] = name;
                    break;
                case 'zh':
                    if (loc_s[1] === 'tw' || loc_s[1] === 'cn') {
                        tags.locale[loc_lc] = name;
                    }
                    break;
            }
        };
        var b = loc === acgdb_anime.locale;
        if (n instanceof Array) {
            tags.synonyms = _.union(tags.synonyms, n);
            if (b) name = n[0];
            add_locale(loc, n[0]);
        } else {
            tags.synonyms.push(n);
            if (b) name = n;
            add_locale(loc, n);
        }
    }

    if (!name) {
        // use the first locale name
        console.warn('WARN: not found name for ' + acgdb_id + ', using ' + tags.synonyms[0]);
        name = tags.synonyms[0];
    }

    tags.name = name;
    var copyright = yield acgdb_get_copyright(acgdb_id);
    var img = yield acgdb_fetch_image(acgdb_id);

    // FIXME default startDate to now if undefined.
    var sd = acgdb_anime.attributes.release[0] ? new Date(acgdb_anime.attributes.release[0]) : new Date();
    // time can be null in api. wtf?
    if (!time) {
        time = '0:0'
    }
    sd.setHours(time.split(':')[0]);
    sd.setMinutes(time.split(':')[1])

    var ani = {
        bangumi: {
            showOn: showOn,
            name: name,
            acgdb_id: acgdb_id,
            credit: copyright,
            cover: img.cover,
            icon: img.icon,
            startDate: sd.getTime(),
            endDate: undefined
        },
        tag: tags
    };
    return ani;
};

var acgdb_parse = function*(data) {
    var current_season;
    try {
        current_season = JSON.parse(data);
    } catch (e) {
        console.error(e);
        return;
    }
    var acgdb_times = current_season ? current_season.time_today : null;
    var acgdb_animes = current_season ? current_season.animes : null;
    if (!acgdb_times || !acgdb_animes) {
        console.error('ERR: not found enough infomation.');
        return;
    }
    var animes = [];
    for (var i = 0; i < acgdb_times.length; i++) {
        var acgdb_day = acgdb_times[i];
        for (var j = 0; j < acgdb_day.length; j++) {
            var acgdb_animetime = acgdb_day[j];
            var acgdb_id = acgdb_animetime.anime;
            var acgdb_anime = acgdb_animes[acgdb_id];
            // 0-6 equals mon, tue, ... in acgdb. wtf.
            var ani = yield acgdb_parse_anime(acgdb_id, i === 6 ? 0 : i + 1, acgdb_animetime.time, acgdb_anime);

            var t = yield rin_check_dup(ani.tag.synonyms);
            if (t && t[0] && t[0].type == 'bangumi') {
                console.log('bangumi ' + ani.bangumi.name + ' with ACGDB ID ' + ani.bangumi.acgdb_id + ' exists, skipping.');
            } else {
                var q = yield getQuater();
                var b = yield getBangumiInfo(ani.bangumi.name, q);

                // default to 12 episodes / 12 weeks / 82 days
                var endDate = new Date();
                ani.bangumi.endDate = endDate.setDate(ani.bangumi.startDate.getDate() + 82).getTime();

                ani.tag.type = 'bangumi';

                // check if tag exists ( as if import fails
                var btag = yield new Tags.getByName(ani.bangumi.name);
                if (btag._id) {
                    ani.bangumi.tag_id = btag._id;
                } else {
                    var tag = new Tags(ani.tag);
                    var t = yield tag.save();

                    ani.bangumi.tag_id = t._id;
                }

                var bangumi = new Bangumis(ani.bangumi);
                var bgm = yield bangumi.save();

                // console.log(ani);
                console.log('bangumi ' + ani.bangumi.name + ' with ACGDB ID ' + ani.bangumi.acgdb_id + ' saved to database, local ID: ' + bgm._id);
            }
        }
    }
};

var main = module.exports = function*() {
    mkdirp.sync(RIN_IMAGE_SAVEPATH, {
        mode: '0755'
    })
    var body = yield yreq(ACGDB_CURRENT_API_URL);
    yield acgdb_parse(body);
    exit();
};

function onerror(err) {
    if (err) {
        console.error(err.stack);
    }
}

setTimeout(function() {
    var ctx = new Object();
    var fn = co.wrap(main);
    fn.call(ctx).catch(onerror);
}, 800);


// copied and edited from import/dmhy
function* getBangumiInfo(name, season) {
    var sname = name;
    var rbgm = {
        name: name,
    };
    var r = {
        name: name,
        synonyms: [name],
        locale: {
            zh_tw: name,
            zh_cn: sname
        },
        type: 'bangumi'
    };
    if (sname.toLowerCase() != name.toLowerCase()) {
        r.synonyms.push(sname);
    }

    var url = 'http://bangumi.tv/subject_search/' + encodeURIComponent(name) + '?cat=2';
    var body = yield yreq(url);
    var listpos = body.indexOf('<ul id="browserItemList"');
    var searchresult = null;
    if (listpos !== -1) {
        var listposend = body.indexOf('</ul>', listpos);
        if (listposend !== -1) {
            searchresult = body.substring(listpos, listposend);
        }
    }
    var m = season.split('Q');
    var year = parseInt(m[0]);
    var year_season = parseInt(m[1]);
    if (searchresult) {
        var re = /<li id="item_(\d+?)".+?>[\s\S]+?<a href="\/subject\/\1".+?>(.*?)<\/a>\s+?<small class="grey">(.*?)<\/small>[\s\S]+?<p class="info tip">\s+?(\d+?.+?)\s+<\/p>[\s\S]+?<\/li>/g;
        var arr;
        var found = false;
        while ((arr = re.exec(searchresult)) != null) {
            if (arr) {
                if (arr[2].indexOf('剧场版') !== -1 || arr[2].indexOf('OVA') !== -1) {
                    continue;
                }
                if (sname.toLowerCase() == arr[2].toLowerCase()) {
                    found = true;
                    console.log('-> found', name, '=>', arr[2]);
                    break;
                }
                m = arr[4].match(/(\d{4})(年|-|\/|\s|$)/);
                if (m && parseInt(m[1]) === year) {
                    found = true;
                    console.log('-> found', name, '=>', arr[2]);
                    break;
                } else if (!m) {
                    console.log('-> notmatch', name, '=>', arr[2], arr[4]);
                }
            }
        }

        if (found) {
            var jlname = arr[3];
            if (jlname.toLowerCase() != sname.toLowerCase() && jlname.toLowerCase() != name.toLowerCase()) {
                r.synonyms.push(jlname);
                r.locale.ja = jlname;
            }

            url = 'http://bangumi.tv/subject/' + arr[1];
            body = yield yreq(url);
            //TODO: get detail
            var infopos = body.indexOf('<h1 class="nameSingle">');
            if (infopos !== -1) {
                var infoposend = body.indexOf('</h1>', infopos);
                if (infoposend !== -1) {
                    var info = body.substring(infopos, infoposend);
                    var m = info.match(/<a .+?>(.+?)<\/a>/);
                    if (m) {
                        if (r.synonyms.indexOf(m[1]) === -1) {
                            r.synonyms.push(m[1]);
                        }
                    }
                }
            }

            infopos = body.indexOf('<ul id="infobox">');
            if (infopos !== -1) {
                var infoposend = body.indexOf('</ul>', infopos);
                if (infoposend !== -1) {
                    var info = body.substring(infopos, infoposend);
                    var m = info.match(/<li><span class="tip">(企画|动画制作).+?<\/span>(.+?)<\/li>/);
                    if (m) {
                        var m2 = m[2].match(/<a .+?>(.+?)<\/a>/);
                        if (m2) {
                            rbgm.credit = m2[1];
                        } else {
                            rbgm.credit = m[2];
                        }
                    }
                }
            }
            var prg_content;
            infopos = body.indexOf('<div id="subject_prg_content">');
            if (infopos !== -1) {
                var infoposend = body.indexOf('</div></div>', infopos);
                if (infoposend !== -1) {
                    prg_content = body.substring(infopos, infoposend);
                }
            }
            if (prg_content) {
                infopos = body.indexOf('<ul class="prg_list">');
                if (infopos !== -1) {
                    var infoposend = body.indexOf('</ul>', infopos);
                    if (infoposend !== -1) {
                        info = body.substring(infopos, infoposend);
                        infoposend = info.indexOf('<li class="subtitle">');
                        if (infoposend !== -1) {
                            info = info.substring(0, infoposend);
                        }
                        var prgid_re = /<li><a href="\/ep\/.+?rel="#(.+?)"/g;
                        var arr, prgids = [];
                        while ((arr = prgid_re.exec(info)) != null) {
                            //[filename, filesize]
                            prgids.push(arr[1]);
                        }
                        if (prgids.length > 0) {
                            var getdate = function(prgid, last) {
                                var m = prg_content.match(new RegExp('<div id="' + prgid + '".+?<span class="tip">.*?首播[:：](.+?)<'));
                                if (m) {
                                    var mymd = m[1].match(/(\d{4})[年|-](\d+?)[月|-](\d+)日?/);
                                    if (mymd) {
                                        var d1 = new Date();
                                        d1.setFullYear(mymd[1], parseInt(mymd[2]) - 1, mymd[3]);
                                        d1 = new Date(d1.toDateString());
                                        return d1;
                                    }
                                    var mmd = m[1].match(/(\d+?)[月|-](\d+)日?/);
                                    if (mmd) {
                                        var d1 = new Date();
                                        var ty = year;
                                        if (last && rbgm.startDate) {
                                            var d2 = new Date(rbgm.startDate);
                                            d2.setDate(d2.getDate() + prgids.length * 7);
                                            ty = d2.getFullYear();
                                        }
                                        d1.setFullYear(ty, parseInt(mmd[1]) - 1, mmd[2]);
                                        d1 = new Date(d1.toDateString());
                                        return d1;
                                    }
                                }
                                return null;
                            };

                            rbgm.startDate = getdate(prgids[0]);
                            if (rbgm.startDate) {
                                rbgm.showOn = rbgm.startDate.getDay();
                            }
                            rbgm.endDate = getdate(prgids[prgids.length - 1], true);
                            if (rbgm.startDate && (!rbgm.endDate || rbgm.endDate < rbgm.startDate)) {
                                var d2 = new Date(rbgm.startDate);
                                d2.setDate(d2.getDate() + prgids.length * 7);
                                rbgm.endDate = d2;
                            }
                        }
                    }
                }
            }
        } else {
            console.log('-> notfound', name);
        }
    }
    if (!rbgm.startDate) {
        var d1 = new Date();
        var month = (parseInt(year_season) - 1) * 3 + 1;
        d1.setFullYear(year, month - 1, 1);
        rbgm.startDate = new Date(d1.toDateString());

        rbgm.showOn = rbgm.startDate.getDay();
    }
    if (!rbgm.endDate) {
        var d2 = new Date(rbgm.startDate);
        d2.setDate(d2.getDate() + 12 * 7);
        rbgm.endDate = d2;
    }
    return {
        bangumi: rbgm,
        tag: r
    };
}
