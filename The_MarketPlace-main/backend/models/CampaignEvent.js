const mongoose = require('mongoose');

const CampaignEventSchema = new mongoose.Schema({
  adId: { type: mongoose.Types.ObjectId, ref: "Ad", index: true },
  userId: { type: mongoose.Types.ObjectId, ref: "User", index: true, default: null },
  type: { type: String, enum: ["impression","click"], required: true },
  ip: String,
  ua: String,
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model("CampaignEvent", CampaignEventSchema);

module.exports = { mongoose, CampaignEventSchema };