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
        if (validator.isDate(body.startDate) &&
            validator.isDate(body.endDate) &&
            validator.isInt(body.showOn) &&
            body.name && body.tag) {
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
        this.body = {success: false};
    });
};
