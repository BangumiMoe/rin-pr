
var co = require('./../../node_modules/koa/node_modules/co');
var config = require('./../../config');
var models = require('./../../models'),
    Tags = models.Tags;

var main = function *() {
  var tags = yield new Tags().getAll();
  tags.forEach(function(tag) {
    var found = false;
    if (tag.locale) {
      for (var k in tag.locale) {
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(tag.name);
    }
  });
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
