
var config2 = require('./config');
var fs = require('fs');
var mysql = require('mysql');
var _ = require('underscore');

var co = require('./../../../node_modules/koa/node_modules/co');
var generator = require('./../../../lib/generator');
var common = require('./../../../lib/common');

var OpenCC = require('opencc');
var opencc = {
  t2s: new OpenCC('t2s.json'),
  s2t: new OpenCC('s2t.json')
};

//var BTSiteDmhy = require('./../../../lib/teamsync/bt-sites/dmhy');

var ObjectID = require('mongodb').ObjectID;

var Models = require('./../../../models'),
  Files = Models.Files,
  Users = Models.Users,
  Torrents = Models.Torrents,
  Tags = Models.Tags,
  Teams = Models.Teams;

if (process.argv.length < 3 || !process.argv[2]) {
  console.error('please specify torrents folder');
  process.exit(1);
}

var torrents_savepath = process.argv[3] ? process.argv[3] : 'data/torrents/';
var torrents_folder = process.argv[2];
var stats = fs.statSync(torrents_folder);
if (!stats.isDirectory()) {
  console.error('not found the specified torrents folder');
  process.exit(1);
}

if (!config2 || !config2['db']) {
  console.error('not found db config');
  process.exit(1);
}

var dbopts = {
  host     : config2['db']['host'],
  user     : config2['db']['username'],
  password : config2['db']['password'],
  database : config2['db']['name']
};

if (config2['db']['port']) {
  dbopts.port = config2['db']['port'];
}

var conn = mysql.createConnection(dbopts);
var yconn = new generator(conn);

function rlog(str) {
  process.stdout.write(str);
}

var main = function *() {
  const step = 50;

  // models
  var ofiles = new Files();
  var otags = new Tags();
  var oteams = new Teams();
  var ousers = new Users();
  var otorrents = new Torrents();

  var rows, result;

  console.log('mapping categories...');
  rows = yield yconn.query('SELECT * FROM btm_sort');
  var sorts = rows[0];
  var misc_tags = yield otags.getByType('misc');

  var cates_map_count = 0;
  var cates_map = {};
  var cate_other_id = null;

  for (var i = 0; i < sorts.length; i++) {
    var m = sorts[i].sort_name.match(/.+>(.+?)</);
    if (m) {
      sorts[i].sort_name = m[1];
      var m_lower = m[1].toLowerCase();
      var found = false;
      for (var j = 0; j < misc_tags.length; j++) {
        if (misc_tags[j].syn_lowercase
          && misc_tags[j].syn_lowercase.indexOf(m_lower) !== -1) {
            found = true;
            cates_map_count++;
            cates_map[sorts[i].sort_id] = misc_tags[j]._id;
            break;
        }
      }
      if (!found && sorts[i].parent_sort_id) {
        var tag_id = cates_map[sorts[i].parent_sort_id];
        if (tag_id) {
          cates_map_count++;
          cates_map[sorts[i].sort_id] = tag_id;
        }
      }
    }
  }

  for (var j = 0; j < misc_tags.length; j++) {
    if (misc_tags[j].name == 'other') {
      cate_other_id = misc_tags[j]._id;
      break;
    }
  }

  for (var i = 0; i < sorts.length; i++) {
    var tag_id = cates_map[sorts[i].sort_id];
    if (!tag_id) {
      tag_id = cate_other_id;
    }
    var mapname = null;
    if (tag_id) {
      for (var j = 0; j < misc_tags.length; j++) {
        if (misc_tags[j]._id.toString() == tag_id.toString()) {
          mapname = misc_tags[j].name;
          break;
        }
      }
    }
    console.log('->', sorts[i].sort_name, '=>', mapname);
  }

  console.log('sort count:', sorts.length, '->', cates_map_count);
  var cateMap = function (sort_id) {
    var tag_id = cates_map[sort_id];
    if (tag_id) {
      return new ObjectID(tag_id);
    }
    return new ObjectID(cate_other_id);
  };

  console.log('rebuilding team & user...');
  console.log('getting teams...');

  rows = yield yconn.query('SELECT * FROM btm_team');
  var teams = rows[0];
  rows = yield yconn.query('SELECT * FROM btm_team_user');
  var team_users = rows[0];
  var team_added = 0;

  console.log('team count', teams.length);

  console.log('rebuilding teams...');
  for (var i = 0; i < teams.length; i++) {
    rlog('-> ' + teams[i].team_name);
    var ts = yield otags.matchTags([teams[i].team_name]);
    var found = false;
    if (ts) {
      for (var j = 0; j < ts.length; j++) {
        if (ts[j].type == 'team') {
          var t = yield oteams.getByTagId(ts[j]._id);
          if (t) {
            rlog(' found', t.name);
            teams[i]._id = t._id.toString();
            if (t.admin_id) {
              teams[i]._admin_id = t.admin_id.toString();
            }
            found = true;
            break;
          }
        }
      }
    }
    if (!found) {
      var team_name = teams[i].team_name;
      var team = new Teams({
        name: team_name,
        //admin_id: this.user._id,
        certification: '',
        approved: teams[i].create_auditing
      });
      var t = yield team.save();
      var team_updates = {
        regDate: new Date(teams[i].create_date * 1000)
      };
      if (teams[i].create_auditing) {
        var sname = opencc['t2s'].convertSync(team_name);
        var tname = opencc['s2t'].convertSync(team_name);
        var synonyms = [ team_name ];
        if (sname != team_name) {
          synonyms.push(sname);
        }
        if (tname != team_name) {
          synonyms.push(tname);
        }
        var tag = new Tags({
          name: team_name,
          type: 'team',
          synonyms: synonyms,
          locale: {
            zh_tw: tname,
            zh_cn: sname
          }
        });
        var ta = yield tag.save();
        team_updates.tag_id = new ObjectID(ta._id);
      }
      yield team.update(team_updates);
      team_added++;
      teams[i]._id = t._id.toString();
      rlog(' added');
    }
    rlog('\n');
  }
  console.log('team:', team_added, 'added,', teams.length - team_added, 'exists.');

  console.log('getting users...');
  result = yield yconn.query('SELECT COUNT(*) AS count FROM btm_user');
  var user_count = result[0][0].count;
  var user_added = 0;
  var user_ids_map = {};

  console.log('user count:', user_count);
  console.log('rebuilding users...');
  //ORDER BY creation_date DESC
  var user_query_pre = 'SELECT * FROM btm_user';
  for (var pos = 0; pos < user_count; pos += step) {
    rlog((pos / user_count * 100).toFixed(1) + '%  \r');
    var limit = ' LIMIT ' + pos + ', ' + step;
    var q = user_query_pre + limit;
    rows = yield yconn.query(q);
    var users = rows[0];
    for (var i = 0; i < users.length; i++) {
      var user_updates = {};
      var user;
      var isexists = false;
      var u = yield ousers.getByEmail(users[i].user_email);
      if (u && u._id) {
        user = new Users({_id: new ObjectID(u._id)});
        isexists = true;
        users[i]._id = u._id.toString();
      } else {
        u = yield ousers.getByUsername(users[i].user_name);
        if (u) {
          console.log('-> duplicate', users[i].user_name);
          users[i].user_name += ':dmhy';
        }
        user = new Users({
          username: users[i].user_name,
          password: users[i].user_password,
          email: users[i].user_email
        }, false);
        u = yield user.save();
        user_added++;

        users[i]._id = u._id.toString();

        user_updates.regDate = new Date(teams[i].create_date * 1000);

        if (users[i].user_email_validated) {
          user_updates.active = true;
        }
      }

      user_ids_map[users[i].user_id] = u._id.toString();

      //checking teams
      var foundmainteam = false;
      for (var j = 0; j < team_users.length; j++) {
        if (team_users[j].user_id == users[i].user_id) {
          if (!team_users[j]._team_id) {
            //get team object id
            for (var k = 0; k < teams.length; k++) {
              if (teams[k].team_id == team_users[j].team_id) {
                team_users[j]._team_id = teams[k]._id;
                team_users[j]._team_index = k;
                break;
              }
            }
          }
          if (team_users[j]._team_id) {

            if (!users[i]._team_ids) {
              users[i]._team_ids = [];
            }
            users[i]._team_ids.push(team_users[j]._team_id);

            if (!foundmainteam) {
              foundmainteam = true;
              if (isexists) {
                users[i]._team_id = u.team_id.toString();
                if (users[i]._team_ids.indexOf(users[i]._team_id) === -1) {
                  users[i]._team_ids.push(users[i]._team_id);
                }
              } else {
                users[i]._team_id = team_users[j]._team_id;
                user_updates.team_id = new ObjectID(team_users[j]._team_id);
              }
            }

            //update team props
            var k = team_users[j]._team_index;
            if (!teams[k]._member_ids) {
              teams[k]._member_ids = [];
            }
            teams[k]._member_ids.push(users[i]._id);
            if (team_users[j].team_can_edit) {
              if (!teams[k]._admin_ids) {
                teams[k]._admin_ids = [];
              }
              teams[k]._admin_ids.push(users[i]._id);
            }
          }
        }
      }
      if (users[i]._team_ids) {
        user_updates.team_ids = _.map(users[i]._team_ids, function (team_id) {
          return new ObjectID(team_id);
        });
      }
      if (!common.is_empty_object(user_updates)) {
        yield user.update(user_updates);
      }
    }
  }
  rlog('100%  \n');
  console.log('user:', user_added, 'added,', user_count - user_added, 'exists.');

  console.log('updating privileges of teams...');
  for (var i = 0; i < teams.length; i++) {
    var team_updates = {};
    if (teams[i]._admin_ids) {
      var team = new Teams({_id: new ObjectID(teams[i]._id)});
      if (!teams[i]._admin_id) {
        team_updates.admin_id = new ObjectID(teams[i]._admin_ids[0]);
      }
      team_updates.admin_ids = _.map(teams[i]._admin_ids, function (admin_id) {
        return new ObjectID(admin_id);
      });
    }

    if (teams[i]._member_ids) {
      if (!teams[i]._admin_id && !team_updates.admin_id) {
        team_updates.admin_id = new ObjectID(teams[i]._member_ids[0]);
      }
      if (!team_updates.admin_ids) {
        team_updates.admin_ids = [ team_updates.admin_id ];
      }
      team_updates.member_ids = _.map(teams[i]._member_ids, function (member_id) {
        return new ObjectID(member_id);
      });
    }

    if (!common.is_empty_object(team_updates)) {
      yield user.update(team_updates);
    }
  }

  //torrent
  console.log('getting torrents...');
  result = yield yconn.query('SELECT COUNT(*) AS count FROM btm_bt_data');
  var torrent_count = result[0][0].count;
  var torrent_added = 0;

  console.log('torrent count:', torrent_count);
  console.log('rebuilding torrents...');

  var meta_re = /.+?\{.+?s:\d+?:"(.+?)".+?s:\d+?:"(.+?)".+?}/g;
  var torrent_query_pre = 'SELECT * FROM btm_bt_data AS a'
    + ' INNER JOIN btm_bt_data_ext AS b ON a.bt_data_id = b.bt_data_id'
    + ' LEFT JOIN xbt_files AS c ON a.info_hash = c.info_hash';
  for (var pos = 0; pos < torrent_count; pos += step) {
    rlog((pos / torrent_count * 100).toFixed(1) + '%  \r');
    var limit = ' LIMIT ' + pos + ', ' + step;
    var q = torrent_query_pre + limit;

    rows = yield yconn.query(q);
    var torrents = rows[0];

    for (var i = 0; i < torrents.length; i++) {
      var t = yield otorrents.getByInfoHash(torrents[i].hash_id);
      if (!t) {

        //var pt = yield Torrents.parseTorrent(files.file.savepath);
        var pt = {
          infoHash: torrents[i].hash_id
        };

        var arr, tc = [];
        while ((arr = meta_re.exec(torrents[i].bt_data_meta)) != null) {
          //[filename, filesize]
          tc.push([arr[1], arr[2]]);
        }

        var todata = {
          category_tag_id: cateMap(torrents[i].sort_id),
          title: torrents[i].bt_data_title,
          introduction: torrents[i].bt_data_intro,
          //uploader_id: this.user._id,
          //file_id: cf._id,
          content: tc,
          magnet: torrents[i].magnet_link,
          infoHash: pt.infoHash,
          size: torrents[i].bt_data_file_size
        };
        torrents[i]._user_id = user_ids_map[torrents[i].user_id];
        if (torrents[i]._user_id) {
          todata.uploader_id = new ObjectID(torrents[i]._user_id);
        }

        var d = new Date(torrents[i].release_date * 1000);
        var str_d = d.getUTCDate().toString();
        var str_m = (d.getUTCMonth() + 1).toString();
        var str_y = d.getUTCFullYear().toString();

        var folder = str_y + '/'
          + (str_m.length < 2 ? '0' : '') + str_m + '/'
          + (str_d.length < 2 ? '0' : '') + str_d + '/';
        var savepath = folder + pt.infoHash + '.torrent';

        var fdata = {
          type: 'torrent',
          filename: '',
          filesize: 0,
          savepath: torrents_savepath + savepath,
          uploader_id: todata.uploader_id,
          uploadDate: d,
        };
        var f = yield ofiles.collection.save(fdata);
        todata.file_id = new ObjectID(f._id);

        if (torrents[i].team_id) {
          //get team object id
          for (var k = 0; k < teams.length; k++) {
            if (teams[k].team_id == torrents[i].team_id) {
              torrents[i]._team_id = teams[k]._id;
              todata.team_id = new ObjectID(teams[k]._id);
              break;
            }
          }
        }

        var sarr = common.title_split(todata.title);
        var _tags = yield otags.matchTags(sarr);
        var tag_ids = [];
        for (var j = 0; j < _tags.length; j++) {
          tag_ids.push(_tags[j]._id.toString());
        }
        if (torrents[i]._team_id) {
          tag_ids.push(torrents[i]._team_id.toString());
        }
        todata.tag_ids = _.map(_.uniq(tag_ids), function (tag_id) {
          return new ObjectID(tag_id);
        });

        var torrent = new Torrents(todata);
        t = yield torrent.save();
        torrent_added++;

        yield torrent.update({
          publish_time: d,
          finished: torrents[i].completed,
          leechers: torrents[i].leechers,
          seeders: torrents[i].seeders
        });
      }
    }
  }
  rlog('100%  \n');
  console.log('torrent:', torrent_added, 'added,', torrent_count - torrent_added, 'exists.');

  console.log('fin.');

  conn.end();
  process.exit(0);
};

function onerror(err) {
  if (err) {
    console.error(err.stack);
    process.exit(1);
  }
}

setTimeout(function () {
  var ctx = new Object();
  var fn = co.wrap(main);
  fn.call(ctx).catch(onerror);
}, 800);
