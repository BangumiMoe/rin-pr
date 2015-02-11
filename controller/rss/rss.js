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
    Torrents = Models.Torrents,
    Tags = Models.Tags;

var validator = require('validator');
var RSS = require('rss');

module.exports = function (rss) {

    rss.get('/latest', function *(next) {
        var limit = limits(this.query.limit);
        var torrent = new Torrents();
        var ts = yield torrent.getLatest(limit);
        this.body = makeRSS(ts, config['app'].base_url + '/rss/latest');
    });

    rss.get('/tags/:tag_ids', function *(next) {
        var limit = limits(this.query.limit);
        var tags = this.params.tag_ids.split('+');
        tags.forEach(function(tag) {
            if (!validator.isMongoId(tag)) {
                this.status = 404;
                return;
            }
        });
        var torrent = new Torrents();
        var ts = yield torrent.getByTags(tags, limit);
        this.body = makeRSS(ts, config['app'].base_url + '/rss/tags/' + this.params.tag_ids);
    });

    rss.get('/user/:user_id', function *(next) {
        if (!validator.isMongoId(this.params.user_id)) {
            this.status = 404;
            return;
        }
        var limit = limits(this.query.limit);
        var ts = [];
        var rc = yield new RssCollections().findByUserId(this.params.user_id);
        if (rc && rc.collections) {
            var torrent = new Torrents();
            ts = yield torrent.getByTagCollections(rc._id, rc.collections, limit);
        }
        this.body = makeRSS(ts, config['app'].base_url + '/rss/tags/' + this.params.tag_ids);
    });

};

var limits = function (limit) {
  if (limit && validator.isNumeric(limit)) {
    limit = parseInt(limit);
    if (limit <= config['rss'].max_items_limit && limit > 0) {
        return limit;
    } else {
        return config['rss'].max_items_limit;
    }
  } else {
    return config['rss'].default_items_limit;
  }
};

var makeRSS = function(items, feedUrl) {
    var feed = new RSS({
        title: '番組、萌え',
        description: 'bangumi.moe torrents feed',
        feed_url: feedUrl,
        site_url: config['app'].base_url,
        pubDate: new Date(),
        ttl: '600'
    });
    items.forEach(function(i) {
        var fname = i.title.replace(/[\:\<\>\/\\\|\*\?\"]/g, '_');
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
    return feed.xml();
};
