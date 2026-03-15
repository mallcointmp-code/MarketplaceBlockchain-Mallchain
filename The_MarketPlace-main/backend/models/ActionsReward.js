const mongoose = require('mongoose');

const ActionRewardSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  actionType: { type: String, required: true }, // e.g., "tiktok_view"
  mlptsAwarded: { type: Number, required: true },
  verified: { type: Boolean, default: false }, // admin/system verification
  proof: { type: String }, // url or metadata for proof
  awardedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.models.ActionReward || mongoose.model("ActionReward", ActionRewardSchema);

module.exports = { mongoose, ActionRewardSchema };