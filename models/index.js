var M = require('./base').M;
require('./users');
require('./tags');
require('./bangumis');
require('./torrents');

exports.Users = M('users');
exports.Tags = M('tags');
exports.Bangumis = M('bangumis');
exports.Torrents = M('torrents');
