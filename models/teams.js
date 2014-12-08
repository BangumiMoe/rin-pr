"use strict";

/**
 * models/teams.js
 * Rin prpr!
 *
 * rin-pr Teams model
 */

var util = require('util');
var ModelBase = require('./base');


function Teams(team) {
    ModelBase.call(this);

    if (team) {
        if (team._id) this._id = team._id;
        this.name = team.name;
        this.email = team.email;
        this.tag = team.tag;
    }
}

util.inherits(Teams, ModelBase);

Teams.prototype.save = function *() {
    var newTeam = {
        name: this.name,
        email: this.email,
        tag: this.tag
    };

    return yield this.collection.insert(newTeam, { safe: true });
};

