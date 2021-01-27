const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    host: String,
    tag: String
});

module.exports = UserSchema;