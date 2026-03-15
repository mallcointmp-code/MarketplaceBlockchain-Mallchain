const mongoose = require('mongoose');

const AdEventSchema = new mongoose.Schema({
  adId: { type: mongoose.Types.ObjectId, ref: "Ad", required: true, index: true },
  userId: { type: mongoose.Types.ObjectId, ref: "User" },
  type: { type: String, enum: ["impression", "click", "engagement"], required: true, index: true },
  ip: String,
  ua: String,
  meta: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.AdEvent || mongoose.model("AdEvent", AdEventSchema);

module.exports = { mongoose, AdEventSchema };