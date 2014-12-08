"use strict";

/**
 * models/teams.js
 * Rin prpr!
 *
 * rin-pr Teams model
 */

var util = require('util'),
    validator = require('validator');
var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;

function Teams(team) {
    ModelBase.call(this);

    if (team) {
        if (team._id) this._id = team._id;
        if (team.name) {
            this.name = validator.trim(team.name);
            this.name_clean = validator.stripLow(this.name).toLowerCase();
        }
        this.tag = team.tag;
        this.icon = team.icon;
        if (team.admin) {
            this.admin = ObjectID(team.admin);
        }
    }
}

util.inherits(Teams, ModelBase);

Teams.prototype.set = function (t) {
    if (t) {
        this._id = t._id;
        this.name = t.name;
        this.name_clean = t.name_clean;
        this.tag = t.tag;
        this.icon = t.icon;
        this.admin = t.admin;
        this.regDate = t.regDate;
    } else {
        this._id = this.name = this.name_clean = 
            this.tag = this.icon = this.admin = 
            this.regDate = undefined;
    }
    return t;
};

Users.prototype.valueOf = function () {
    return {
        _id: this._id,
        name: this.name,
        //name_clean: this.name_clean,
        tag: this.tag,
        icon: this.icon,
        admin: this.admin,
        regDate: this.regDate
    };
};


Teams.prototype.save = function *() {
    var newTeam = {
        name: this.name,
        name_clean: this.name_clean,
        tag: this.tag,
        icon: this.icon,
        admin: this.admin,
        regDate: new Date()
    };

    return yield this.collection.insert(newTeam, { safe: true });
};


module.exports = Teams;

ModelBase.register('teams', Teams);
