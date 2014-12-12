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
        var limit = 50;
        if (typeof this.query.limit === 'number' && this.query.limit <= 100) {
            limit = this.query.limit;
        }
        var torrent = new Torrents();
        var ts = yield torrent.get(limit);
        var feed = new RSS({
            title: '番組、萌え',
            description: 'bangumi.moe latest torrents feed',
            feed_url: config['app'].base_url + '/rss/latest',
            site_url: config['app'],
            pubDate: new Date(),
            ttl: '600'
        });
        ts.forEach(function(t) {
            feed.item({
                title:  t.title,
                description: t.introduction,
                url: config['web'].web_domain_prefix + '/torrent/' + t._id, // TODO create identical url for each torrent
                date: new Date(t.publish_time),
                enclosure: {
                    url: config['app'].base_url + '/download/torrent/' + t._id + '/' + t.file_id + '/' + t.title + '.torrent',
                    type: 'application/x-bittorrent'
                }
            });
        });
        this.body = feed.xml();
    });

};
