"use strict";

/**
 * models/teams.js
 * Rin prpr!
 *
 * rin-pr Teams model
 */

var util = require('util'),
    _ = require('underscore'),
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

          this.admin_ids = [ this.admin_id ];
          this.member_ids = this.admin_ids;
        } else {
          this.admin_ids = [];
          this.member_ids = [];
        }
        this.editor_ids = [];
        this.auditing_ids = [];
        this.approved = !!team.approved;
    }
}

util.inherits(Teams, ModelBase);

Teams.filter = function (u) {
    var team = new Teams();
    if (u instanceof Array) {
        var us = [];
        u.forEach(function (_u) {
            team.set(_u);
            us.push(team.expose());
        });
        return us;
    } else {
        team.set(u);
        return team.expose();
    }
};

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

        this.admin_ids = t.admin_ids;
        this.editor_ids = t.editor_ids;
        this.member_ids = t.member_ids;
        this.auditing_ids = t.auditing_ids;

        this.regDate = t.regDate;
        this.approved = t.approved;
    } else {
        this._id = this.name = this.name_clean =
            this.tag_id = this.certification = this.signature = this.icon =
            this.admin_ids = this.editor_ids = this.member_ids = this.auditing_ids =
            this.admin_id = this.regDate = this.approved = undefined;
    }
    return t;
};

Teams.prototype.expose = function () {
    return {
        _id: this._id,
        name: this.name,
        //name_clean: this.name_clean,
        tag_id: this.tag_id,
        //certification: this.certification,
        signature: this.signature,
        icon: this.icon,
        admin_id: this.admin_id,

        admin_ids: this.admin_ids,
        editor_ids: this.editor_ids,
        member_ids: this.member_ids,
        auditing_ids: this.auditing_ids,

        regDate: this.regDate,
        approved: this.approved
    };
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

        admin_ids: this.admin_ids,
        editor_ids: this.editor_ids,
        member_ids: this.member_ids,
        auditing_ids: this.auditing_ids,

        regDate: this.regDate,
        approved: this.approved
    };
};

Teams.prototype.ensureIndex = function *() {
  var ge_regdate = this.collection.ensureIndex({
    regDate: -1
  }, { background: true, w: 1 });
  var ge_memberids = this.collection.ensureIndex({
    member_ids: 1
  }, { background: true, w: 1 });

  yield [ ge_regdate, ge_memberids ];
};

Teams.prototype.save = function *() {
    var newTeam = {
        name: this.name,
        name_clean: this.name_clean,
        tag_id: this.tag_id,
        certification: this.certification,
        icon: this.icon,
        admin_id: this.admin_id,

        admin_ids: this.admin_ids,
        editor_ids: this.editor_ids,
        member_ids: this.member_ids,
        auditing_ids: this.auditing_ids,

        regDate: new Date(),
        approved: this.approved,
        rejected: false
    };

    var t = yield this.insert(newTeam, { safe: true });
    if (t) {
        this.set(t);
        return t;
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

Teams.prototype.getPop = function *(limit) {
    if (!limit) {
        limit = 20;
    }
    return yield this.collection.find()
        .sort({activity: -1}).limit(limit).toArray();
};

Teams.prototype.getNameByIds = function* (ids) {
    ids = _.map(ids, function (id) {
      return new ObjectID(id);
    });

    return yield this.collection.find({_id: { $in: ids }},
        {_id: true, tag_id: true, name: true, icon: true}).toArray();
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

Teams.prototype.getByTagId = function *(tag_ids) {
    if (tag_ids instanceof Array) {
        for (var i = 0; i < tag_ids.length; i++) {
            tag_ids[i] = new ObjectID(tag_ids[i]);
        }
        return yield this.collection.find({
            tag_id: { $in: tag_ids }
        }).toArray();
    } else {
        return yield this.collection.findOne({tag_id: new ObjectID(tag_ids)});
    }
};

Teams.prototype.getByUserAuditing = function *(user_id) {
  if (!user_id) {
    return [];
  }
  return yield this.collection.find({
    auditing_ids: new ObjectID(user_id)
  }).toArray();
};

Teams.prototype.getByUserMember = function *(user_id) {
  if (!user_id) {
    return [];
  }
  return yield this.collection.find({
    member_ids: new ObjectID(user_id),
    approved: true
  }).toArray();
};

var membertypes = ['admin', 'editor', 'member', 'auditing'];
membertypes.forEach(function (mtype) {
  var Mtype = mtype[0].toUpperCase() + mtype.substr(1);
  var ismethod = 'is' + Mtype + 'User';
  //var rmmethod = 'remove' + Mtype;
  var prop = mtype + '_ids';

  Teams.prototype[ismethod] = function (user_id) {
    if (!this[prop]) {
      return false;
    }
    user_id = user_id.toString();
    for (var i = 0; i < this[prop].length; i++) {
      if (this[prop][i].toString() === user_id) {
        return true;
      }
    }
    return false;
  };
});

Teams.prototype.addMember = function *(user_id) {
  if (!user_id) {
    return false;
  }

  if (this.member_ids) {
    user_id = user_id.toString();
    for (var i = 0; i < this.member_ids.length; i++) {
      if (this.member_ids[i].toString() === user_id) {
        return true;
      }
    }
  }

  var uid = new ObjectID(user_id);
  return yield this.collection.update(
      { _id: new ObjectID(this._id) },
      { $addToSet: { member_ids: uid },
        $pull: { auditing_ids: uid } }
    );
};

Teams.prototype.addAuditing = function *(user_id) {
  if (!user_id) {
    return false;
  }

  if (this.isAuditingUser(user_id)) {
    return true;
  }

  return yield this.collection.update(
      { _id: new ObjectID(this._id) },
      { $addToSet: { auditing_ids: new ObjectID(user_id) } }
    );
};

Teams.prototype.addEditor = function *(user_id) {
  if (!user_id) {
    return false;
  }

  if (this.isEditorUser(user_id)) {
    return true;
  }

  var uid = new ObjectID(user_id);
  return yield this.collection.update(
      { _id: new ObjectID(this._id) },
      { $addToSet: { editor_ids: uid } /*,
        $pull: { admin_ids: uid }*/ }
    );
};

Teams.prototype.addAdmin = function *(user_id) {
  if (!user_id) {
    return false;
  }

  if (this.isAdminUser(user_id)) {
    return true;
  }

  var uid = new ObjectID(user_id);
  return yield this.collection.update(
      { _id: new ObjectID(this._id) },
      { $addToSet: { admin_ids: uid }/*,
        $pull: { editor_ids: uid }*/ }
    );
};

Teams.prototype.removeMember = function *(user_id) {
  if (!user_id) {
    return false;
  }
  var uid = new ObjectID(user_id);
  return yield this.collection.update(
      { _id: new ObjectID(this._id) },
      { $pull: { member_ids: uid, editor_ids: uid, admin_ids: uid } }
    );
};

Teams.prototype.removeAuditing = function *(user_id) {
  if (!user_id) {
    return false;
  }
  var uid = new ObjectID(user_id);
  return yield this.collection.update(
      { _id: new ObjectID(this._id) },
      { $pull: { auditing_ids: uid } }
    );
};

Teams.prototype.removeEditor = function *(user_id) {
  if (!user_id) {
    return false;
  }
  var uid = new ObjectID(user_id);
  return yield this.collection.update(
      { _id: new ObjectID(this._id) },
      { $pull: { editor_ids: uid } }
    );
};

Teams.prototype.removeAdmin = function *(user_id) {
  if (!user_id) {
    return false;
  }
  var uid = new ObjectID(user_id);
  return yield this.collection.update(
      { _id: new ObjectID(this._id) },
      { $pull: { admin_ids: uid } }
    );
};

module.exports = Teams;

ModelBase.register('teams', Teams);
