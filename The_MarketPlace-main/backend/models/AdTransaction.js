const mongoose = require('mongoose');

const AdTransactionSchema = new mongoose.Schema({
  adId: { type: mongoose.Types.ObjectId, ref: "Ad", required: true, index: true },
  sellerId: { type: mongoose.Types.ObjectId, ref: "User" },
  type: { type: String, enum: ["reserve", "charge", "refund", "release", "flagged", "charge_failed", "manual_adjust"], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "KSH" },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

AdTransactionSchema.index({ adId: 1, createdAt: -1 });

module.exports = mongoose.models.AdTransaction || mongoose.model("AdTransaction", AdTransactionSchema);

module.exports = { mongoose, AdTransactionSchema };