
var util = require('util'),
    crypto = require('crypto'),
    validator = require('validator'),
    hat = require('hat');
var ModelBase = require('./base');
var ObjectID = require('mongodb').ObjectID;

var config = require('../config');

function Users(user, pwprehashed) {
    ModelBase.call(this);

    if (user) {
        if (user._id) this._id = user._id;
        if (user.username) {
            this.username = validator.trim(user.username);
            this.username_clean = validator.stripLow(this.username).toLowerCase();
        }
        if (user.email) {
            this.email = String(user.email).toLowerCase();
        }
        this.password = user.password;
        if (user.team_id) {
            this.team_id = new ObjectID(user.team_id);
        }
        this.group = user.group ? user.group : 'members';
        this.activateKey = user.activateKey;
    }
    this.pwprehashed = pwprehashed;
}

util.inherits(Users, ModelBase);

Users.filter = function (u) {
    var user = new Users();
    if (u instanceof Array) {
        var us = [];
        u.forEach(function (_u) {
            user.set(_u);
            us.push(user.expose());
        });
        return us;
    } else {
        user.set(u);
        return user.expose();
    }
};

Users.prototype.set = function (u) {
    if (u) {
        this._id = u._id;
        this.username = u.username;
        this.username_clean = u.username_clean;
        this.email = u.email;
        this.active = u.active;
        this.regDate = u.regDate;
        this.password = u.password;
        this.salt = u.salt;
        this.join_team_id = u.join_team_id;
        this.team_id = u.team_id;
        this.group = u.group;
        this.activateKey = u.activateKey;
    } else {
        this._id = this.username = this.username_clean =
            this.email = this.active = this.regDate = this.password =
            this.salt = this.join_team_id = this.team_id = this.group =
            this.activateKey = undefined;
    }
    return u;
};

Users.prototype.expose = function () {
    var emailHash = crypto
        .createHash('md5')
        .update(this.email)
        .digest('hex');
    return {
        _id: this._id,
        username: this.username,
        emailHash: emailHash,
        active: this.active,
        regDate: this.regDate,
        team_id: this.team_id,
        group: this.group
    };
};

Users.prototype.valueOf = function () {
    return {
        _id: this._id,
        username: this.username,
        //username_clean: this.username_clean,
        email: this.email,
        active: this.active,
        regDate: this.regDate,
        //password: this.password,
        //salt: this.salt,
        //join_team_id
        team_id: this.team_id,
        group: this.group
    };
};

Users.prototype.valid = function () {
    if (!(typeof this.username === 'string'
        && typeof this.password === 'string'
        && typeof this.email === 'string')) {
        return false;
    }
    if (!this.username
        || !this.username_clean
        || !this.password
        || !this.email) {
        return false;
    }
    if (this.group !== 'admin'
        && this.group !== 'members') {
        return false;
    }
    if (!validator.isEmail(this.email)) {
        return false;
    }
    if (!validator.isLength(this.username, 1, 16)) {
        return false;
    }
    if (!validator.isLength(this.password, 6)) {
        return false;
    }
    return true;
};

Users.prototype.isAdmin = function () {
    return this.group === 'admin';
};

Users.prototype.isActive = function () {
    return this.active;
};

Users.prototype.exists = function* (username, email) {
    var uc, em;
    if (username || email) {
        uc = validator.trim(String(username));
        uc = validator.stripLow(uc).toLowerCase();
        em = String(email).toLowerCase();
    } else {
        uc = this.username_clean;
        em = this.email;
    }

    var u = yield this.collection.findOne({ $or: [ {username_clean: uc}, {email: em} ] });
    return u ? true : false;
};

Users.prototype.save = function* () {
    var salt = hat(32, 36);
    var activateKey = hat();

    var password_hash = Users.hash_password(this.password, salt, this.pwprehashed);

    var user = {
        username: this.username,
        username_clean: this.username_clean,
        email: this.email.toLowerCase(),
        regDate: new Date().getTime(),
        password: password_hash,
        salt: salt,
        team_id: this.team_id,
        group: this.group,
        activateKey: activateKey
    };

    var u = yield this.collection.insert(user, {safe: true});
    if (u && u[0]) {
        this.set(u[0]);
        return u[0];
    }
    return null;
};

Users.prototype.getByUsername = function* (username) {
    if (typeof username != 'string') {
        throw new Error('invalid username');
    }

    var uc = validator.trim(String(username));
    uc = validator.stripLow(uc).toLowerCase();

    var u = yield this.collection.findOne({username_clean: uc});
    this.set(u);

    return u;
};

Users.prototype.getTeamMembers = function* (team_id, type) {
    var q = {};
    if (type == 'pending') {
        q.join_team_id = new ObjectID(team_id);
    } else {
        q.team_id = new ObjectID(team_id);
    }
    return yield this.getAll(q);
};

Users.prototype.removeByUsername = function* (username) {
    if (typeof username != 'string') {
        throw new Error('invalid username');
    }

    var uc = validator.trim(String(username));
    uc = validator.stripLow(uc).toLowerCase();

    return yield this.collection.remove({username_clean: uc});
};

Users.prototype.checkPassword = function (password, pwprehashed) {
    var password_hash = String(password);
    if (!pwprehashed) {
        //do sha256
        password_hash = crypto
            .createHash('sha256')
            .update(password_hash, 'utf8')
            .digest('base64');
    }
    password_hash = crypto
        .createHash('md5')
        .update(password_hash + this.salt)
        .digest('hex');

    return (password_hash === this.password);
};

Users.prototype.activate = function* () {
    return yield this.update({ active: true, activateKey: null });
};

Users.prototype.getByActivateKey = function* (key) {
    var u = yield this.collection.findOne({ activateKey: key });
    if (u) {
        this.set(u);
        return u;
    } else {
        return null;
    }
};

Users.prototype.getByResetKey = function* (key) {
    var timeNow = new Date().getTime();
    var u = yield this.collection.findOne({ resetKey: key });
    if (u && (timeNow - u.resetTime < 7200000)) {
        this.set(u);
        return u;
    } else {
        return null;
    }
};

Users.prototype.updateResetKey = function* () {
    var resetKey = hat();
    var info = { resetTime: new Date().getTime(), resetKey: resetKey };
    var u = yield this.update(info);
    return u ? info : null;
};

Users.prototype.setPassword = function* (newpass) {
    var salt = hat(32, 36);
    return yield this.update({
        password: Users.hash_password(newpass, salt, false),
        salt: salt,
        resetKey: null
    });
};

Users.hash_password = function(password, salt, isPrehashed) {
    var password_hash = password;

    if (!isPrehashed) {
        //do sha256
        password_hash = crypto
            .createHash('sha256')
            .update(password_hash, 'utf8')
            .digest('base64');
    }
    password_hash = crypto
        .createHash('md5')
        .update(password_hash + salt)
        .digest('hex');

    return password_hash;
};

module.exports = Users;

ModelBase.register('users', Users);
