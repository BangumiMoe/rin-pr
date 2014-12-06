var util = require('util');
var ModelBase = require('./base');

function Bangumis() {
    ModelBase.call(this);
}

util.inherits(Bangumis, ModelBase);

Bangumis.prototype.save = function* () {
    //TODO: this.collection
};

module.exports = Bangumis;

ModelBase.register('bangumis', Bangumis);
