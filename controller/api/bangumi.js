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

            dbgms.push({
                startDate: sdate,
                endDate: sdate,
                headline: bgm.name,
                /* text: '',
                //"tag":"This is Optional",
                "classname":"optionaluniqueclassnamecanbeaddedhere",
                asset: {
                    media: 'url-to-poster',
                    thumbnail: 'url-to-bangumi-thumbnail',
                    credit: 'name-of-subs',
                    //caption: ''
                } */
            });
        });

        /* example */
        dbgms.push({
            "startDate":"2014,12,8",
            "endDate":"2014,12,8",
            "headline":"<a href=\"#url-to-this-torrent\">Fate / Stay night UNLIMITED BLADE WORKS</a>",
            //"text":"<p>Body text goes here, some HTML is OK</p>",
            asset: {
                media: '/images/bgm/fsn2014-cover.jpg',
                thumbnail: '/images/bgm/fsn2014-thumb.jpg',
                credit: 'KNA'
            },
        });
        dbgms.push({
            "startDate":"2014,12,8",
            "endDate":"2014,12,8",
            "headline":"<a href=\"#url-to-this-torrent\">魔彈之王與戰姬</a>",
            //"text":"<p>Body text goes here, some HTML is OK</p>",
            asset: {
                media: '/images/bgm/madan-cover.jpg',
                thumbnail: '/images/bgm/madan-thumb.png',
                credit: 'KNA'
            },
        });

        this.body = { "timeline": {
            "headline": "Bangumi.moe",
            "type": "default",
            "text": "<p>Intro body text goes here, some HTML is ok</p>",
            "asset": {
                "media":"/images/bg/testbg1.png",
                "credit":"power by rin-pr",
                //"caption":"Caption text goes here"
            },
            "date": dbgms,
            "era": [
                {
                    "startDate":"2014,12,6",
                    "endDate":"2014,12,6",
                    "headline":"Past",
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
        var body = this.request.body;
        if (isValid(body)) {
            var bangumi = new Bangumis({
                name: body.name,
                startDate: body.startDate,
                endDate: body.endDate,
                showOn: body.showOn,
                tag: body.tag
            });
            var b = yield bangumi.save();
            if (b) {
                this.body = { success: true };
                return;
            }
        }
        this.body = { success: false };
    });

    api.post('/bangumi/update', function *(next) {
        var body = this.request.body;
        if (isValid(body) && validator.isMongoId(body._id)) {
            var bangumi = new Bangumis({_id: body._id});
            var b = yield bangumi.update({
                name: body.name,
                startDate: body.startDate,
                endDate: body.endDate,
                showOn: body.showOn,
                tag: body.tag
            });
            if (b) {
                this.body = { success: true };
                return;
            }
        }
    });

    api.post('/bangumi/remove', function *(next) {
        var body = this.request.body;
        yield new Bangumis().remove(body._id);
        return this.body = { success: true };
    });
};

var isValid = function(bangumi) {
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
    if (bangumi.tag.length !== 24 || !bangumi.tag) {
        return false;
    }
    return true;
};
