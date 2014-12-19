var M = require('./base').M;
require('./users');
require('./tags');
require('./bangumis');
require('./torrents');
require('./teams');
require('./team_accounts');
require('./files');

exports.Users = M('users');
exports.Tags = M('tags');
exports.Bangumis = M('bangumis');
exports.Torrents = M('torrents');
exports.Teams = M('teams');
exports.TeamAccounts = M('team_accounts');
exports.Files = M('files');
