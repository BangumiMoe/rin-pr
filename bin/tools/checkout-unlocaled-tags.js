
var co = require('./../../node_modules/koa/node_modules/co');
var config = require('./../../config');
var models = require('./../../models'),
    Tags = models.Tags;

var main = function *() {
    var tags = yield new Tags().getAll();
    tags.forEach(function(tag) {
        if (!tag.locale || !tag.locale[0]) {
            console.log(tag.name);
        }
    });
};

function onerror(err) {
  if (err) {
    console.error(err.stack);
  }
}

setTimeout(function () {
  var ctx = new Object();
  var fn = co(main);
  fn.call(ctx, onerror);
}, 800);