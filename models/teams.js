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
        if (team.tag_id) {
            this.tag_id = new ObjectID(team.tag_id);
        }
        this.icon = team.icon;
        this.certification = team.certification;
        if (team.admin_id) {
            this.admin_id = new ObjectID(team.admin_id);
        }
        this.approved = !!team.approved;
    }
}

util.inherits(Teams, ModelBase);

Teams.prototype.set = function (t) {
    if (t) {
        this._id = t._id;
        this.name = t.name;
        this.name_clean = t.name_clean;
        this.tag_id = t.tag_id;
        this.certification = t.certification;
        this.signature = t.signature;
        this.icon = t.icon;
        this.admin_id = t.admin_id;
        this.regDate = t.regDate;
        this.approved = t.approved;
    } else {
        this._id = this.name = this.name_clean = 
            this.tag_id = this.certification = this.signature = this.icon =
            this.admin_id = this.regDate = this.approved = undefined;
    }
    return t;
};

Teams.prototype.valueOf = function () {
    return {
        _id: this._id,
        name: this.name,
        //name_clean: this.name_clean,
        tag_id: this.tag_id,
        //certification: this.certification,
        signature: this.signature,
        icon: this.icon,
        admin_id: this.admin_id,
        regDate: this.regDate,
        approved: this.approved
    };
};

Teams.prototype.save = function *() {
    var newTeam = {
        name: this.name,
        name_clean: this.name_clean,
        tag_id: this.tag_id,
        certification: this.certification,
        icon: this.icon,
        admin_id: this.admin_id,
        regDate: new Date(),
        approved: this.approved,
        rejected: false
    };

    var t = yield this.collection.insert(newTeam, { safe: true });
    if (t && t[0]) {
        this.set(t[0]);
        return t[0];
    }
    return null;
};

Teams.prototype.getPending = function *(user_id) {
    return yield this.collection.findOne({ admin_id: new ObjectID(user_id), approved: false, rejected: false });
};

Teams.prototype.getAllPending = function *() {
    return yield this.collection.find({ approved: false, rejected: false })
        .sort({regDate: -1}).toArray();
};

Teams.prototype.getByName = function *(name) {
    var nc = validator.trim(name);
    nc = validator.stripLow(nc).toLowerCase();
    if (!nc) {
        return null;
    }
    var r = yield this.collection.findOne({ name_clean: nc, approved: true });
    this.set(r);
    return r;
};

module.exports = Teams;

ModelBase.register('teams', Teams);
