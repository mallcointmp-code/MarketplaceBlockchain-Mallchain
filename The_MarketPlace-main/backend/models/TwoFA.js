const mongoose = require('mongoose');

const TwoFASchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, ref: "User", required: true, index: true },
  code: { type: String, required: true },
  purpose: { type: String, enum: ["withdraw"], required: true },
  amount: { type: Number },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

TwoFASchema.index({ userId: 1, purpose: 1 });

module.exports = mongoose.model("TwoFA", TwoFASchema);

module.exports = { mongoose, TwoFASchema };