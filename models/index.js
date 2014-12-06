var M = require('./base').M;
require('./users');
require('./tags');
require('./bangumis');

exports.Users = M('users');
exports.Tags = M('tags');
exports.Bangumis = M('bangumis');
