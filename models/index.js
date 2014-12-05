
var M = require('./base').M;
require('./users');
require('./bangumis');

exports.Users = M('users');
exports.Bangumis = M('bangumis');
