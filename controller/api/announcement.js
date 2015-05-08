"use strict";

/**
 * controller/api/announcement.js
 * Rin prpr!
 *
 * bangumi api controller
 */

var Models = require('./../../models'),
    Archives = Models.Archives,
    Announcements = Models.Announcements;

var validator = require('validator'),
  xss = require('./../../lib/xss');

module.exports = function (api) {

  api.post('/announcement/unread', function *(next) {
    var body = this.request.body;
    if (body && body.since) {
      try {
        var d = new Date(body.since);
        var unread = yield new Announcements().unread(d);
        this.body = { success: true, unread: unread };
      } catch (e) {
        // unformat date
      }
    }
    this.body = { success: false };
  });

  api.get('/announcement/list', function *(next) {
    this.body = yield new Announcements().getAll();
  });

  api.post('/announcement/add', function *(next) {
    if (this.user && this.user.isAdmin()) {
      var body = this.request.body;
      if (body.title && typeof body.title == 'string') {
          body.title = validator.trim(body.title);
      } else {
          body.title = '';
      }
      if (body.content && typeof body.content == 'string') {
          body.content = xss(body.content);
      } else {
          body.content = '';
      }
      if (body
          && body.title && body.content
          && body.title.length <= 128
          && body.content.length <= 4096) {
          var ann = new Announcements({
            user_id: this.user._id,
            title: body.title,
            content: body.content
          });
          var a = yield ann.save();
          if (a) {
              this.body = { success: true, announcement: a };
              return;
          }
      }
    }
    this.body = { success: false };
  });

  api.post('/announcement/remove', function *(next) {
    if (this.user && this.user.isAdmin()) {
        var body = this.request.body;
        if (body && body._id && validator.isMongoId(body._id)) {
            var ann = new Announcements({_id: body._id});
            var b = yield ann.find();
            if (b) {
                // add removal log
                console.log(this.user.username + ' removed announcement: ' + body._id);

                var archive = new Archives({
                    type: 'announcement',
                    user_id: this.user._id,
                    data: b
                });
                yield archive.save();

                yield ann.remove();
                this.body = { success: true };
                return;
            }
        }
    }
    this.body = { success: false };
  });

};
