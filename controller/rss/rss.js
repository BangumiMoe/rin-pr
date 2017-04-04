"use strict";

/**
 * controller/api/bangumi.js
 * Rin prpr!
 *
 * bangumi api controller
 */

var Models = require('./../../models/index'),
    config = require('./../../config'),
    RssCollections = Models.RssCollections,
    QueryArchives = Models.QueryArchives,
    Torrents = Models.Torrents,
    Tags = Models.Tags;

var RSS = require('rss'),
    validator = require('validator'),
    common = require('./../../lib/common');

module.exports = function (rss) {

    rss.get('/latest', function *() {
        var limit = limits(this.query.limit);
        var useid = this.query.useid || '';
        var torrent = new Torrents();
        var ts = yield torrent.getLatest(limit);
        yield makeRSS.call(this, ts, '/rss/latest', useid);
    });

    rss.get('/tags/:tag_ids', function *() {
        var limit = limits(this.query.limit);
        var useid = this.query.useid || '';
        var tags = this.params.tag_ids.split('+');
        tags.forEach(function(tag) {
            if (!validator.isMongoId(tag)) {
                this.status = 404;
                return;
            }
        });
        var torrent = new Torrents();
        // getByTags need page = 1
        var ts = yield torrent.getByTags(tags, 1, limit);
        yield makeRSS.call(this, ts, '/rss/tags/' + this.params.tag_ids, useid);
    });

    rss.get('/search/:query', function *() {
        var query = validator.trim(this.params.query);
        var limit = limits(this.query.limit);
        var useid = this.query.useid || '';
        var r;
        if (query) {
          r = yield new Torrents().hybridSearch(query, 1, limit);
          // Save query keyword for future suggestions
          var qa = new QueryArchives({query: query});
          yield qa.save();
        } else {
          r = {torrents: []};
        }
        yield makeRSS.call(this, r.torrents, '/rss/search/' + query, useid);
    });

    rss.get('/user/:user_id', function *() {
        if (!validator.isMongoId(this.params.user_id)) {
            this.status = 404;
            return;
        }
        var limit = limits(this.query.limit);
        var useid = this.query.useid || '';
        var ts = [];
        var rc = yield new RssCollections().findByUserId(this.params.user_id);
        if (rc && rc.collections) {
            var torrent = new Torrents();
            ts = yield torrent.getByTagCollections(rc._id, rc.collections, limit);
        }
        yield makeRSS.call(this, ts, '/rss/user/' + this.params.user_id, useid);
    });

};

var limits = function (limit) {
  if (limit && validator.isNumeric(limit)) {
    limit = parseInt(limit);
    if (limit <= config['rss'].max_items_limit && limit > 0) {
      return limit;
    }
  }
  return config['rss'].default_items_limit;
};

var makeRSS = function *(items, feedUrl, useid) {
    var feed = new RSS({
        title: '番組、萌え',
        description: 'bangumi.moe torrents feed',
        feed_url: config['app'].base_url + feedUrl,
        site_url: config['app'].base_url,
        pubDate: new Date(),
        ttl: '600'
    });
    items.forEach(function(i) {
        var fname = i.title.replace(/[\:\<\>\/\\\|\*\?\"]/g, '_');
        if (useid) {
            fname = i.file_id;
        }
        feed.item({
            title: i.title,
            description: i.introduction,
            url: config['web'].web_domain_prefix + '/torrent/' + i._id, // TODO create identical url for each torrent
            date: new Date(i.publish_time),
            enclosure: {
                url: config['app'].base_url + '/download/torrent/' + i._id + '/' + fname + '.torrent',
                type: 'application/x-bittorrent'
            }
        });
    });

    this.type = 'application/xml';
    this.body = feed.xml();
};
