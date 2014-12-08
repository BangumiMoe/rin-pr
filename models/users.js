
var util = require('util'),
    crypto = require('crypto'),
    validator = require('validator'),
    hat = require('hat');
var ModelBase = require('./base');

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
        this.group = user.group ? user.group : 'members';
    }
    this.pwprehashed = pwprehashed;
}

util.inherits(Users, ModelBase);

Users.prototype.set = function (u) {
    if (u) {
        this._id = u._id;
        this.username = u.username;
        this.username_clean = u.username_clean;
        this.email = u.email;
        this.regDate = u.regDate;
        this.password = u.password;
        this.salt = u.salt;
        this.group = u.group;
    } else {
        this._id = this.username = this.username_clean = 
            this.email = this.regDate = this.password = 
            this.salt = this.group = undefined;
    }
    return u;
};

Users.prototype.valueOf = function () {
    return {
        _id: this._id,
        username: this.username,
        //username_clean: this.username_clean,
        email: this.email,
        regDate: this.regDate,
        //password: this.password,
        //salt: this.salt,
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
    var password_hash = this.password;

    if (!this.pwprehashed) {
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

    var user = {
        username: this.username,
        username_clean: this.username_clean,
        email: this.email.toLowerCase(),
        regDate: new Date().getTime(),
        password: password_hash,
        salt: salt,
        group: this.group
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

module.exports = Users;

ModelBase.register('users', Users);
