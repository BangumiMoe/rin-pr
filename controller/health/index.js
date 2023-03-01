/**
 * controller/api/index.js
 * Rin prpr!
 *
 * rin-pr api controller
 */

var Router = require('koa-router');
var api = new Router();

var Models = require('./../../models'),
  Torrents = Models.Torrents;

api.get('', function *(next) {
  var torrent = new Torrents();
  yield torrent.collection.find().sort({ _id: -1 }).limit(1).toArray();

  this.body = {success: true};
});

module.exports = api;
