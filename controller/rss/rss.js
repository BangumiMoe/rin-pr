"use strict";

/**
 * controller/api/bangumi.js
 * Rin prpr!
 *
 * bangumi api controller
 */

var Models = require('./../../models/index'),
    config = require('./../../config'),
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
                return this.status = 404;
            }
        });
        var torrent = new Torrents();
        var ts = yield torrent.getByTags(tags, limit);
        this.body = makeRSS(ts, config['app'].base_url + '/rss/tags/' + this.params.tag_ids);
    });

};

var limits = function (limit) {
    if (limit === 'number') {
        if (limit <= config['rss'].max_items_limit && limit > 0) {
            return this.query.limit;
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
        description: 'bangumi.moe latest torrents feed',
        feed_url: feedUrl,
        site_url: config['app'].base_url,
        pubDate: new Date(),
        ttl: '600'
    });
    items.forEach(function(i) {
        feed.item({
            title:  i.title,
            description: i.introduction,
            url: config['web'].web_domain_prefix + '/torrent/' + i._id, // TODO create identical url for each torrent
            date: new Date(i.publish_time),
            enclosure: {
                url: config['app'].base_url + '/download/torrent/' + i._id + '/' + i.title + '.torrent',
                type: 'application/x-bittorrent'
            }
        });
    });
    return feed.xml();
};
