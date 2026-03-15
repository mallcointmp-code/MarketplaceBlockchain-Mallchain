const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  directReward: { type: Number, default: 15 },
  indirectReward: { type: Number, default: 3.75 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Referral", referralSchema);
