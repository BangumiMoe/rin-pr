
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var _ = require('underscore'),
  validator = require('validator');
var common = require('./../../lib/common');
var co = require('./../../node_modules/koa/node_modules/co');
var config = require('./../../config');
var models = require('./../../models'),
  Tags = models.Tags,
  Torrents = models.Torrents;
var ObjectID = require('mongodb').ObjectID;

const opt_list = ['add-tag', 'remove-tag', 'set-team', 'lang', 'remove', 'title-index', 'hybrid', 'regexp'];
const PAGE_LIMIT = 20;
const DEF_LANG = 'zh_tw';
var opts = {};
var search_pattern = null;
var searchOpt = null;

function printUsage() {
  console.log(
    'A rin-pr torrents mod tool.\n' +
    '\n' +
    'Command:\n' +
    '  node ./bin/tools/torrentmod [options] [search_pattern]\n' +
    '\n' +
    'Options:\n' +
    '  --add-tag [tag_id|tag_name] | add specific tag\n' +
    '  --remove-tag [tag_id|tag_name] | remove specific tag\n' +
    '  --set-team [team_id|team_name] | set specific team\n' +
    '  --lang [zh_tw|zh_cn|en] | \'' + DEF_LANG + '\' is default\n' +
    '  --remove | remove selected torrents\n' + 
    '  --help | show this usage' + 
    '\n' +
    'Search Options:\n' +
    '  --title-index (default)\n' +
    '  --hybrid\n' +
    '  --regexp'
  );
}

function printErrorAndExit(err) {
  console.error(err);
  console.log('Please use --help for help.');
  process.exit(1);
}

function needNextArg(i) {
  return i <= 3; // opt_list.indexOf('lang')
}

function isSearchOpt(i) {
  return i >= 5; // opt_list.indexOf('title-index')
}

function processArgv() {
  var argc = process.argv.length - 2;
  if (argc <= 0) {
    return false;
  }
  var argv = process.argv.slice(2);
  for (var i = 0; i < argc; i++) {
    var arg = argv[i];
    if (arg.substring(0, 2) == '--') {
      // check options
      var opt = arg.substring(2);
      var j = opt_list.indexOf(opt);
      if (j < 0) {
        printErrorAndExit('Invalid option \'' + opt + '\'.');
      } else if (needNextArg(j) && j >= argc - 1) {
        printErrorAndExit('Option \'' + opt + '\' need one more arg.');
        if ((opt === 'set-team' || opt === 'lang') && opts[opt]) {
          printErrorAndExit('Only one team/lang could be set.');
        }
      } else if (isSearchOpt(j)) {
        if (searchOpt) {
          printErrorAndExit('Only one search option could be set.');
        } else {
          searchOpt = opt;
        }
      }
      switch (opt) {
      case 'help':
        printUsage();
        process.exit(0);
        break;
      case 'add-tag':
      case 'remove-tag':
        if (!opts[opt]) opts[opt] = [];
        opts[opt].push(argv[i + 1]);
        i++;
        break;
      case 'set-team':
      case 'lang':
        opts[opt] = argv[i + 1];
        i++;
        break;
      case 'remove':
        opts.remove = true;
        break;
      }
    } else if (search_pattern) {
      printErrorAndExit('Only one search pattern could be applied.');
    } else {
      search_pattern = arg;
    }
  }
  if (!search_pattern) {
    printErrorAndExit('No found search pattern.');
  }
  if (common.is_empty_object(opts)) {
    return false;
  }
  
  var optypecount = 0;
  for (var t in opts) {
    if (opts['lang']) {
      optypecount++;
    }
  }
  
  if (optypecount > 1 && opts.remove) {
    printErrorAndExit('Remove option couldn\'t be set with other options.');
  }
  if (!searchOpt) {
    searchOpt = 'title-index';
  } else if (searchOpt === 'regexp') {
    try {
      var re = new RegExp(search_pattern, 'i');
    } catch (e) {
      printErrorAndExit(e);
      return false;
    }
  }
  
  return true;
}

function printOp() {
  console.log('Search Pattern (' + searchOpt + '): ' + search_pattern);
  if (opts.remove) {
    console.log('going to be removed...');
  } else {
    for (var t in opts) {
      if (opts[t] instanceof Array) {
        console.log(t + ':', opts[t].join(', '));
      } else {
        console.log(t + ':', opts[t]);
      }
    }
  }
}

if (!processArgv()) {
  printUsage();
  process.exit(1);
}

printOp();

function *checkOptIds() {
  return true;
}

var hybridSTorrentsPage1 = null;

function *getSpecificTorrentCount() {
  var torrent = new Torrents();
  //PAGE_LIMIT
  switch (searchOpt) {
  case 'hybrid':
    var r = yield torrent.hybridSearch(search_pattern, 1, PAGE_LIMIT);
    if (r) hybridSTorrentsPage1 = r.torrents;
    return r ? r.count : 0;
    break;
  case 'regexp':
    var re = new RegExp(search_pattern, 'i');
    return yield torrent.collection.count({ title: re });
    break;
  case 'title-index':
  default:
    return yield torrent.getCountByTitle(search_pattern);
    break;
  }
}

function *getSpecificTorrents(page) {
  var torrent = new Torrents();
  //PAGE_LIMIT
  switch (searchOpt) {
  case 'hybrid':
    if (page === 1) {
      return hybridSTorrentsPage1;
    } else {
      var r = yield torrent.hybridSearch(search_pattern, page, PAGE_LIMIT);
      return r.torrents;
    }
    break;
  case 'regexp':
    var re = new RegExp(search_pattern, 'i');
    var limit = PAGE_LIMIT;
    page--;
    return yield torrent.collection.find({ title: re },
                { title: true, uploader_id: true, tag_ids: true, team_id: true })
              .sort({ publish_time: -1 })
              .skip(page * limit).limit(limit)
              .toArray();
    break;
  case 'title-index':
  default:
    return yield torrent.getByTitle(search_pattern, page, PAGE_LIMIT);
    break;
  }
}

function *getUpdateData() {
  console.log('\nChecking Update...');
  
  var updateQ = {};
  var team = null;
  if ('set-team' in opts) {
    var oteam = new Teams();
    var name_or_id = opts['set-team'];
    if (validator.isMongoId(name_or_id)) {
      team = yield oteam.find(name_or_id);
    } else {
      // name
      var tags = yield otag.matchTags([name_or_id]);
      var team_tag_id = null;
      if (tags && tags.length) {
        var team_tag_count = 0;
        for (var i = 0; i < tags.length; i++) {
          if (tags[i].type === 'team') {
            team_tag_id = tags[i]._id;
            team_tag_count++;
          }
        }
        if (team_tag_count > 0) {
          var err = 'More than one team can match `' + name_or_id + '`.';
          // TODO: list all team tags
          printErrorAndExit(err);
          return;
        }
      }
      if (team_tag_id) {
        team = yield oteam.getByTagId(team_tag_id);
      }
    }
    if (team && team._id) {
      updateQ['$set'] = { team_id: new ObjectID(team._id) };
      console.log('team:', team.name);
      // check later
      //if (team.tag_id) tag_ids.push(team.tag_id);
    } else {
      printErrorAndExit('Cound\'t find team `' + name_or_id + '`.');
    }
  }
  var arr = { 'add-tag': [], 'remove-tag': [] };
  var ids = { 'add-tag': [], 'remove-tag': [] };
  for (var t in opts) {
    switch (t) {
    case 'add-tag':
    case 'remove-tag':
      for (var i = 0; i < opts[t].length; i++) {
        var name_or_id = opts[t][i];
        if (validator.isMongoId(name_or_id)) {
          ids[t].push(name_or_id);
        } else {
          name_or_id = validator.trim(name_or_id);
          if (name_or_id) arr[t].push(name_or_id);  
        }
      }
      break;
    }
  }
  var all_arr = arr['add-tag'].concat(arr['remove-tag']);
  var all_ids = ids['add-tag'].concat(ids['remove-tag']);

  if (team && team.tag_id) {
    all_ids.push(team.tag_id.toString());
  }
  
  if (all_arr.length > 0 || all_ids.length > 0) {
    var otag = new Tags();
    var tags_ids = (all_ids.length > 0) ? (yield otag.find(all_ids)) : [];
    var tags_arr = (all_arr.length > 0) ? (yield otag.matchTags(all_arr)) : [];

    // check tags
    var add_tags = [], remove_tags = [];
    for (var i = 0; i < tags_ids.length; i++) {
      var tag_id = tags_ids[i]._id.toString();
      if (ids['remove-tag'].indexOf(tag_id) >= 0) {
        // remove tags
        remove_tags.push(tags_ids[i]);
      } else {
        add_tags.push(tags_ids[i]);
      }
    }
    for (var i = 0; i < tags_arr.length; i++) {
      var isremove = false;
      var arr_t = tags_arr[i];
      for (var j = 0; j < arr['remove-tag'].length; j++) {
        var tag_name = arr['remove-tag'][j].toLowerCase();
        if (arr_t.syn_lowercase && arr_t.syn_lowercase.indexOf(tag_name) >= 0) {
          isremove = true;
          break;
        }
      }
      if (isremove) {
        // remove tags
        remove_tags.push(arr_t);
      } else {
        add_tags.push(arr_t);
      }
    }
    
    // combine
    var lang = opts['lang'] ? opts['lang'] : DEF_LANG;
    var getTagName = function (t) {
      if (t.locale && t.locale[lang]) {
        return t.locale[lang];
      } else {
        return t.name;
      }
    };
    var tag_ids = { 'add': [], 'remove': [] };
    var tag_ops = { 'add': [], 'remove': [] };
    add_tags.forEach(function (t) {
      tag_ops.add.push(getTagName(t));
      tag_ids.add.push(new ObjectID(t._id));
    });
    remove_tags.forEach(function (t) {
      tag_ops.remove.push(getTagName(t));
      tag_ids.remove.push(new ObjectID(t._id));
    });
    
    if (tag_ids.length <= 0 && r_tag_ids.length <= 0) {
      console.log('No tag changes.');
    } else {
      var info = '';
      var kinds = ['add', 'remove'];
      for (var i in kinds) {
        var _t = kinds[i];
        if (tag_ids[_t].length > 0) {
          info += _t + ' tag(s): `' + tag_ops[_t].join('`, `') + '`\n';
          if (_t === 'add') {
            updateQ['$addToSet'] = { tag_ids: { $each: tag_ids[_t] } };
          } else {
            // remove
            updateQ['$pull'] = { tag_ids: { $in: tag_ids[_t] } };
          }
        }
      }
      console.log(info);
    }
  }
  
  if (common.is_empty_object(updateQ)) {
    printErrorAndExit('No update could be applied.');
    return;
  } else {
    console.log('Update:\n{');
    for (var op in updateQ) {
      console.log('  \'' + op + '\':', updateQ[op], ',');
    }
    console.log('}\n');
  }
  return updateQ;
}

function *removeSpecificTorrents() {
  var torrent = new Torrents();
  //PAGE_LIMIT
  switch (searchOpt) {
  case 'hybrid':
    var q = common.parse_search_query(search_pattern);
    return yield torrent.collection.remove(q);
    break;
  case 'regexp':
    var re = new RegExp(search_pattern, 'i');
    return yield torrent.collection.remove({ title: re });
    break;
  case 'title-index':
  default:
    var title_array = common.title_index(search_pattern.toLowerCase());
    return yield torrent.collection.remove({ titleIndex: { $all: title_array } });
    break;
  }
}

function *updateSpecificTorrents(updateQ) {
  var torrent = new Torrents();
  //PAGE_LIMIT
  switch (searchOpt) {
  case 'hybrid':
    var q = common.parse_search_query(search_pattern);
    return yield torrent.collection.update(q, updateQ, { multi: true });
    break;
  case 'regexp':
    var re = new RegExp(search_pattern, 'i');
    return yield torrent.collection.update({ title: re }, updateQ, { multi: true });
    break;
  case 'title-index':
  default:
    var title_array = common.title_index(search_pattern.toLowerCase());
    return yield torrent.collection.update({ titleIndex: { $all: title_array } },
        updateQ, { multi: true });
    break;
  }
}

function rlInput(q) {
  return function (callback) {
    rl.question(q, (answer) => {
      callback(null, answer);
    });
  };
}

function rlInputEnd() {
  rl.close();
}

function *waitUserInputGo(pageObj) {
  var q, ik;
  q = opts.remove ? 'Do you really want to remove them all?'
        : 'Do you really want to apply your options?';
  q += '\nType (Y/n):';
  while (true) {
    ik = yield rlInput(q);
    if (ik.toLowerCase() === 'n') {
      pageObj.cancel = true;
      break;
    } else if (ik === 'Y') {
      break;
    }
  }
  return;
}

function *waitUserInput(pageObj) {
  if (pageObj.page === 1 && pageObj.page >= pageObj.pageCount) {
    // only one page
    yield waitUserInputGo(pageObj);
    return false;
  }
  var flags = {
    'prev': pageObj.page > 1,
    'next': pageObj.page < pageObj.pageCount,
  };
  var inputs = [];
  if (flags.prev) {
    inputs['p'] = 'Prev Page';
  }
  if (flags.next) {
    inputs['n'] = 'Next Page';
  }
  inputs['a'] = 'Apply';
  inputs['c'] = 'Cancel';
  var q = '', keys = '';
  for (var k in inputs) {
    q += inputs[k] + ': ' + k + (k !== 'c' ? ', ' : '');
    keys += k + (k !== 'c' ? '/' : '');
  }
  q += '\nType (' + keys + '):';
  var ik;
  while (true) {
    ik = yield rlInput(q);
    if (ik in inputs) {
      break;
    }
  }
  
  switch (ik) {
  case 'p':
    pageObj.page--;
    break;
  case 'n':
    pageObj.page++;
    break;
  case 'a':
    yield waitUserInputGo(pageObj);
    return false;
    break;
  case 'c':
  default:
    pageObj.cancel = true;
    break;
  }
  
  return true;
}

var main = module.exports = function *() {
  var updateQ;
  var check = yield checkOptIds();
  if (!check) {
    process.exit(1);
    return;
  }
  if (!opts.remove) {
    updateQ = yield getUpdateData();
  }
  
  // start
  var count = yield getSpecificTorrentCount();
  if (count <= 0) {
    console.log('No torrent need to be updated.');
    process.exit(0);
    return;
  } else {
    console.log('Found ' + count.toString() + ' torrent(s).')
  }
  var pageCount = Math.ceil(count / PAGE_LIMIT);
  var pageObj = {
    pageCount: pageCount,
    page: 1,
    cancel: false
  };
  while (pageObj.page && !pageObj.cancel) {
    var torrents = yield getSpecificTorrents(pageObj.page);
    var start = 1 + (pageObj.page - 1) * PAGE_LIMIT;
    var end = start + torrents.length - 1;
    console.log('Torrents (Page ' + pageObj.page + '/' + pageObj.pageCount + ', ' + start + ' to ' + end + '):')
    for (var i = 0; i < torrents.length; i++) {
      console.log(((i === torrents.length - 1) ? '└─' : '├─')
        + torrents[i].title);
    }
    console.log(''); // new line
    if (!(yield waitUserInput(pageObj))) {
      // no need input, or do search
      break;
    }
  }
  if (pageObj.cancel) {
    console.log('User cancelled torrents update.');
    process.exit(0);
    return;
  }

  var r;
  if (opts.remove) {
    console.log('Removing...');
    r = yield removeSpecificTorrents();
  } else {
    console.log('Updating...');
    r = yield updateSpecificTorrents(updateQ);
  }
  console.log('Result:', r ? r.result : 'update error');
  
  rlInputEnd();
  process.exit(0);
};

function onerror(err) {
  if (err) {
    console.error(err.stack);
  }
}

setTimeout(function () {
  var ctx = new Object();
  var fn = co.wrap(main);
  fn.call(ctx).catch(onerror);
}, 800);
