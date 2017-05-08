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
var config = require('./../config');
var ModelBase = require('./base');
var common = require('./../lib/common');
var ObjectID = require('mongodb').ObjectID;

function TeamAccounts(ta) {
    ModelBase.call(this);

    if (ta) {
        if (ta._id) this._id = ta._id;
        if (ta.team_id) {
            this.team_id = new ObjectID(ta.team_id);
        }
        if (ta.site) {
            this.site = validator.trim(ta.site);
        }
        this.enable = !!ta.enable;
        this.username = ta.username;
        this.password = ta.password;
    }
}

util.inherits(TeamAccounts, ModelBase);

TeamAccounts.encode = function (text) {
  return common.aes_encode(text, config['security'].teamAccountKey);
};

TeamAccounts.decode = function (crypted) {
  return common.aes_decode(crypted, config['security'].teamAccountKey);
};

TeamAccounts.prototype.ensureIndex = function *() {
    var ge_team_id = this.collection.ensureIndex({ team_id: 1 },
        { background: true, w: 1 });
    yield ge_team_id;
};

TeamAccounts.prototype.set = function (t) {
    if (t) {
        this._id = t._id;
        this.team_id = t.team_id;
        this.site = t.site;
        this.enable = t.enable;
        this.username = t.username;
        this.password = t.password;
    } else {
        this._id = this.team_id = this.site =
            this.enable = this.username = this.password = undefined;
    }
    return t;
};

TeamAccounts.prototype.valueOf = function () {
    return {
        _id: this._id,
        team_id: this.team_id,
        site: this.site,
        enable: this.enable,
        //username: this.username,
        //password: this.password
    };
};

TeamAccounts.prototype.save = function *() {
    var ta = {
        team_id: this.team_id,
        site: this.site,
        enable: this.enable,
        username: this.username,
        password: this.password
    };

    var t = yield this.insert(ta, { safe: true });
    if (t) {
        this.set(t);
        return t;
    }
    return null;
};

TeamAccounts.prototype.getByTeamId = function *(team_id) {
    var enabledSites = ['dmhy', /*'ktxp', 'popgo', 'camoe', */ 'acgrip', 'nyaa', 'acgnx', 'acgnx_int' ];
    var k = 'team_id/' + team_id.toString();
    var r = yield this.cache.get(k);
    if (r === null) {
        r = yield this.getAll({team_id: new ObjectID(team_id)});
        r = _.filter(r, function (s) { return enabledSites.indexOf(s.site) >= 0; });
        yield this.cache.set(k, r);
    }
    if (r instanceof Array) {
      // password decode process
      for (var i = 0; i < r.length; i++) {
        r[i].password = TeamAccounts.decode(r[i].password);
      }
    }
    return r;
};

TeamAccounts.prototype.updateFromSyncInfo = function *(team_id, syncInfo) {
    var supportedSite = ['dmhy', 'ktxp', 'popgo', 'camoe', 'acgrip', 'nyaa', 'acgnx', 'acgnx_int'];
    var accounts = yield this.getByTeamId(team_id);
    var newas = [], updas = [];
    var as = {};
    accounts.forEach(function (a) {
        as[a.site] = a;
    });
    for (var i = 0; i < supportedSite.length; i++) {
        var site = supportedSite[i];
        if (!syncInfo[site]) {
          continue;
        }
        if (!syncInfo[site].username) {
            syncInfo[site].username = '';
        }
        if (!syncInfo[site].password) {
            syncInfo[site].password = '';
        }
        if (syncInfo[site]
            && typeof syncInfo[site].username == 'string'
            && typeof syncInfo[site].password == 'string') {
            var crypted_password = '';
            if (syncInfo[site].password) {
              crypted_password = TeamAccounts.encode(syncInfo[site].password);
            }
            if (!as[site]) {
                if (syncInfo[site].username) {
                    var ena = syncInfo[site].password ? !!syncInfo[site].enable : false;
                    newas.push({
                        team_id: new ObjectID(team_id),
                        site: site,
                        enable: ena,
                        username: syncInfo[site].username,
                        password: crypted_password,
                        cookie: ''
                    });
                }
            } else {
                if (syncInfo[site].username !== as[site].username
                    || (!!syncInfo[site].enable) !== as[site].enable
                    || syncInfo[site].password) {
                    var ena = syncInfo[site].username ? !!syncInfo[site].enable : false;
                    var a = {
                        //team_id: team_id,
                        //site: site,
                        _id: as[site]._id,
                        enable: ena,
                        username: syncInfo[site].username,
                        cookie: ''
                    };
                    if (!syncInfo[site].username) {
                        a.password = '';
                    } else if (syncInfo[site].password) {
                        a.password = crypted_password;
                    }
                    updas.push(a);
                }
            }
        }
    }
    var t1, t2 = [];
    if (newas.length > 0) {
        t1 = yield this.insert(newas, { safe: true });
    }
    if (updas.length > 0) {
        for (var i = 0; i < updas.length; i++) {
            var upd = updas[i];
            var ta_id = upd._id;
            delete upd._id;
            var t21 = yield this.collection.update(
                { _id: new ObjectID(ta_id) },
                { $set: upd });
            t2.push(t21);
        }
    }
    //refresh cache
    yield this.cache.del('team_id/' + team_id.toString());
    return [t1, t2];
};

TeamAccounts.prototype.enableSync = function *(team_id) {
    var accounts = yield this.getByTeamId(team_id);
    var ena = false;
    accounts.forEach(function (a) {
        if (ena) return;
        if (a.enable && a.username && (a.password || a.cookie)) {
            ena = true;
        }
    });
    return ena;
};

module.exports = TeamAccounts;

ModelBase.register('team_accounts', TeamAccounts);
