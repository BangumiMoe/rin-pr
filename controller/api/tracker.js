"use strict";

/**
 * controller/api/tracker.js
 * Rin prpr!
 *
 * tracker api controller
 */

var Models = require('./../../models'),
    Torrents = Models.Torrents;

var config = require('./../../config'),
    validator = require('validator');

var ObjectID = require('mongodb').ObjectID;

function *updateTorrent(infoHash, data) {
  var torrent = new Torrents();
  infoHash = infoHash.toLowerCase();

  var leechers = data.peers - data.seeds;
  if (leechers < 0) {
    // possible?
    leechers = 0;
  }
  var upd = {
    seeders: data.seeds,
    leechers: leechers
  };
  var inc = null;
  if (data.completed) {
    if (typeof data.completed === 'number') {
      inc = {'finished': data.completed};
    } else {
      inc = {'finished': 1};
    }
  }

  return yield torrent.updateByInfoHash(infoHash, upd, inc);
}

module.exports = function (api) {

  api.post('/tracker/update', function *(next) {
    var td = this.request.body;
    if (td) {
      if (td instanceof Array) {
        for (let t of td) {
          if (t.action === 'update') {
            yield updateTorrent(t.infoHash, t.data);
          }
        }
      } else if (typeof td === 'object') {
        if (td.action === 'update') {
          yield updateTorrent(td.infoHash, td.data);
        }
      }
      this.body = {success: true};
      return;
    }
    this.status = 404;
  });

};
