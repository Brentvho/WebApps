/**
 * Created by brent on 2016-11-20.
 */
var mongoose = require('mongoose');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var iterations = 1000;
var keyLength = 64;
var expiriationDate = 60;


var UserSchema = new mongoose.Schema({
    username: {type: String, lowercase: true, unique: true},
    hash: String,
    salt: String
});

UserSchema.methods.setPassword = function (password) {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, iterations, keyLength).toString('hex');
};

UserSchema.methods.validPassword = function(password) {
    var hash = crypto.pbkdf2Sync(password, this.salt, iterations, keyLength).toString('hex');

    return this.hash === hash;
};

UserSchema.methods.generateJWT = function() {

    var today = new Date();
    var exp = new Date(today);
    exp.setDate(today.getDate() + expiriationDate);

    return jwt.sign({
        _id: this._id,
        username: this.username,
        exp: parseInt(exp.getTime() / 1000)
    }, 'SECRET');
};

mongoose.model('User', UserSchema);