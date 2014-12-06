/**
 * models/admin.js
 * Rin prpr!
 *
 * rin-pr Admin model
 */

var util = require('util');
var ModelBase = require('./base');

function Admin() {
    ModelBase.call(this);
}

util.inherits(Admin, ModelBase);

Admin.prototype.save = function *() {
    //TODO: this.collection
};

module.exports = Admin;

ModelBase.register('admin', Admin);
