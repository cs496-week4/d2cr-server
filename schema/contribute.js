const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: String,
    shop: String,
    code: String,
});

module.exports = UserSchema;