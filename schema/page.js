const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    url: String,
    reviews: Array,
    curReviews: Array,
    curQueries: String,
    wordCloud: Array,
    monthlyRate: Array
});

module.exports = UserSchema;