const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    email: String,
    desc: String,
    file: Object,
    malls: Array,
    Status: String,
    status: String
});

module.exports = UserSchema;