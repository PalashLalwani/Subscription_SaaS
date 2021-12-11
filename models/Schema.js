const mongoose = require("mongoose");

const Schema = {}

Schema.UserSchema = new mongoose.Schema({
    user_name: String,
    created_at: Date,
    amount_balance: {type: Number, default: 0}
}) 

Schema.SubscriptionSchema = new mongoose.Schema({
    user_name: String,
    start_date: String,
    valid_till: String,
    plan_id: String 
}) 

module.exports = Schema;