
var crypto = require('crypto');
var _ = require('underscore');
var common = require('./../../lib/common');
var co = require('./../../node_modules/koa/node_modules/co');
var config = require('./../../config');
var models = require('./../../models'),
  TeamAccounts = models.TeamAccounts;
var ObjectID = require('mongodb').ObjectID;

function print_usage() {
  console.log('Usage:\n\tnode ./bin/tools/update_team_accounts_key [new_key] [original_key]');
}

if (process.argv.length < 3 || !process.argv[2]) {
  console.error('ERR: please specify new key and original key');
  print_usage();
  process.exit(1);
}

if (process.argv[2] === '-h' || process.argv[2] === '--help') {
  print_usage();
  process.exit(0);
}

function rlog(str) {
  process.stdout.write(str);
}

var encode, decode;
{
  new_key = process.argv[2];
  encode = function (text) {
    return common.aes_encode(text, new_key);
  };
}
if (!process.argv[3]) {
  // no original key
  decode = function (str) { return str };
} else {
  original_key = process.argv[3];
  decode = function (crypted) {
    // must be base64 format
    return common.aes_decode(crypted, original_key);
  };
}

var main = module.exports = function *() {
  var ota = new TeamAccounts();
  var accounts = yield ota.getAll();
  var a_count = accounts.length;

  for (var i = 0; i < a_count; i++) {
    var acc = accounts[i];
    var ori_password = decode(acc.password);
    var new_password = encode(ori_password);

    //console.log(acc.password, '(' + ori_password + ')', '->', new_password);
    ori_password = ''; // clean buffer
    yield ota.collection.update({_id: new ObjectID(acc._id)}, {$set: {password: new_password}});

    if (i < a_count - 1) {
      rlog(((i + 1) / a_count * 100).toFixed(1) + '%  \r');
    } else {
      console.log('finished.');
    }
  }
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
