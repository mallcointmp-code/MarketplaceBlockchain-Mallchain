const mongoose = require('mongoose');

const fraudScoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ip: { type: String },
  deviceId: { type: String },
  riskLevel: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "low",
  },
  issues: [String],
  action: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("FraudScore", fraudScoreSchema);

module.exports = { mongoose, fraudScoreSchema };