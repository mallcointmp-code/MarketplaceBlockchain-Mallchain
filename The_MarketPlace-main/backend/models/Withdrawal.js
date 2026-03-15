// backend/models/Withdrawal.js
const mongoose = require("mongoose");

const WithdrawalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ["Mallmoney","Mallcoins"], required: true },
  destinationType: { type: String, enum: ["bank","external_wallet"], default: "bank" },
  destinationDetails: { type: Object }, // bank account or external wallet addr (masked)
  pinVerified: { type: Boolean, default: false },
  status: { type: String, enum: ["requested","processing","completed","failed","cancelled"], default: "requested" },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Withdrawal", WithdrawalSchema);
