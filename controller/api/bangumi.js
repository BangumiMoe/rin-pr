"use strict";

/**
 * controller/api/bangumi.js
 * Rin prpr!
 *
 * bangumi api controller
 */

var Models = require('./../../models'),
    Bangumis = Models.Bangumis;

var validator = require('validator');

module.exports = function (api) {

    api.get('/bangumi/timeline', function *(next) {
        /*
            TODO: timeline

            return recent days bangumis

            asset refer hot resource
                media refer to its poster
                credit refer to its subs' name

            headline refer to bangumi's name
            text refer to ?

            remove main headline/asset?
        */
        var rbgms = yield new Bangumis().getRecent();
        var dbgms = [];
        var now = new Date();
        var wday = now.getDay();
        var weekStartDate = now.getDate() - wday;
        rbgms.forEach(function (bgm) {

            var date = new Date();
            date.setDate(weekStartDate + (bgm.showOn));
            var sdate = date.toDateString();

            var tldate = timelineDateTime(bgm.startDate, sdate);

            dbgms.push({
                startDate: tldate,
                endDate: tldate,
                headline: "<a ui-sref=\"#/tag/" + bgm.tag + "\">" + bgm.name + "</a>",
                asset: {
                    media: bgm.cover,
                    thumbnail: bgm.thumb,
                    credit: 'Kyoto Animation'
                }
            });
        });

        /* example */
        dbgms.push({
            "startDate":"2014,12,8,20,30",
            "endDate":"2014,12,8,20,30",
            "headline":"<a href=\"#url-to-this-torrent\">Fate / Stay night UNLIMITED BLADE WORKS</a>",
            //"text":"<p>Body text goes here, some HTML is OK</p>",
            asset: {
                media: '/images/bgm/cover/fsn2014-cover.jpg',
                thumbnail: '/images/bgm/thumb/fsn2014-thumb.jpg',
                credit: 'Tokyo Animation'
            }
        });
        dbgms.push({
            "startDate":"2014,12,8,21,00",
            "endDate":"2014,12,8,21,00",
            "headline":"<a href=\"#url-to-this-torrent\">魔彈之王與戰姬</a>",
            //"text":"<p>Body text goes here, some HTML is OK</p>",
            asset: {
                media: '/images/bgm/cover/madan-cover.jpg',
                thumbnail: '/images/bgm/thumb/madan-thumb.png',
                credit: 'K'
            }
        });

        this.body = { "timeline": {
            "headline": "Bangumi.moe",
            "type": "default",
            "text": "<p>Intro body text goes here, some HTML is ok</p>",
            "asset": {
                "media":"/images/bg/testbg1.png",
                "credit":"power by rin-pr"
                //"caption":"Caption text goes here"
            },
            "date": dbgms,
            "era": [
                {
                    "startDate":"2014,12,6",
                    "endDate":"2014,12,6",
                    "headline":"Past"
                }

            ]
        }};
    });

    api.get('/bangumi/current', function *(next) {
        this.body = yield new Bangumis().getCurrent();
    });

    api.get('/bangumi/recent', function *(next) {
        this.body = yield new Bangumis().getRecent();
    });

    api.get('/bangumi/all', function *(next) {
        this.body = yield new Bangumis().getAll();
    });

    api.post('/bangumi/add', function *(next) {
        if (this.user && this.user.isAdmin()) { 
            var body = this.request.body;
            if (isValid(body)) {
                var bangumi = new Bangumis({
                    name: body.name,
                    startDate: body.startDate,
                    endDate: body.endDate,
                    showOn: body.showOn,
                    tag: body.tag,
                    cover: body.cover,
                    thumb: body.thumb
                });
                var b = yield bangumi.save();
                if (b) {
                    this.body = { success: true };
                    return;
                }
            }
        }
        this.body = { success: false };
    });

    api.post('/bangumi/update', function *(next) {
        if (this.user && this.user.isAdmin()) {
            var body = this.request.body;
            if (isValid(body) && validator.isMongoId(body._id)) {
                var bangumi = new Bangumis({_id: body._id});
                var b = yield bangumi.update({
                    name: body.name,
                    startDate: body.startDate,
                    endDate: body.endDate,
                    showOn: body.showOn,
                    tag: body.tag,
                    cover: body.cover,
                    thumb: body.thumb
                });
                if (b) {
                    this.body = { success: true };
                    return;
                }
            }
        }
        this.body = { success: false };
    });

    api.post('/bangumi/remove', function *(next) {
        if (this.user && this.user.isAdmin()) {
            var body = this.request.body;
            yield new Bangumis().remove(body._id);
            this.body = { success: true };
            return;
        }
        this.body = { success: false };
    });

    api.post('/bangumi/fetch', function *(next) {
        var body = this.request.body;
        if (body) {
            if (body._ids && body._ids instanceof Array) {
                this.body = yield new Bangumis().find(body._ids);
                return;
            } else if (body._id && validator.isMongoId(body._id)) {
                this.body = yield new Bangumis().find(body._id);
                return;
            }
        }
        this.body = '';
    });
};

var isValid = function(bangumi) {
    bangumi.name = validator.trim(bangumi.name);
    if (validator.isDate(bangumi.startDate) && validator.isDate(bangumi.endDate)) {
        return false;
    }
    //0 stand for Sunday
    if ([0, 1, 2, 3, 4, 5, 6].indexOf(bangumi.showOn) === -1) {
        return false;
    }
    if (typeof bangumi.name !== 'string' || !bangumi.name) {
        return false;
    }
    if (!bangumi.tag || validator.isMongoId(bangumi.tag)) {
        return false;
    }
    if (!bangumi.cover || !bangumi.thumb) {
        return false;
    }
    return true;
};

var timelineDateTime = function(startDate, sdate) {
    /*
    * startDate: bangumi.startDate should be a exact Date object (timestamp) of the first showTime begin
    * endDate: bangumi.endDate should be a exact Date object (timestamp) of the last showTime end
    * sdate: a Date object of most recent show date
    *
    * ok i give up. dont know how to calculate a bangumi that cross the night without add new property to bangumis model.
    * */

    var startTime = new Date(startDate);
    var startDateString = sdate.getFullYear() + ',' + (sdate.getMonth() + 1) + ',' + sdate.getDate();

    return startDateString + ',' + startTime.getHours() + ',' + startTime.getMinutes()
};
