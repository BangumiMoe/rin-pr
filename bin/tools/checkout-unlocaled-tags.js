"use strict";

var config = require('./../../config');
var models = require('./../../models'),
    Tags = models.Tags;

var main = function *() {
    var tags = yield new Tags().getAll();
    tags.forEach(function(tag) {
        if (!tag.locale || !tag.locale[0]) {
            console.log(tag.name);
        }
    });
}();
