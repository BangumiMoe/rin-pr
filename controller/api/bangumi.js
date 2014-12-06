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
        if (isValid(body)) {
            var bangumi = new Bangumis({
                name: body.name,
                startDate: body.startDate,
                endDate: body.endDate,
                showOn: body.showOn,
                tag: body.tag
            });
            var b = yield bangumi.update();
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
    if ([1, 2, 3, 4, 5, 6, 7].indexOf(bangumi.showOn) === -1) {
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
