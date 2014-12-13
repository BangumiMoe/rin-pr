
var mount = require('koa-mount')

var api = require('./api'),
  download = require('./download'),
  rss = require('./rss');

module.exports = function (app) {
  app.use(mount('/api', api.middleware()));
  app.use(mount('/download', download.middleware()));
  app.use(mount('/rss', rss.middleware()));
};