// backend/models/ConversionHistory.js
const mongoose = require("mongoose");

const ConversionHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mlptsAmount: { type: Number, required: true },
  mlcnsAmount: { type: Number, required: true },
  rateUsed: { type: Number, required: true }, // mlpts per 1 mlcns (e.g., 1000)
  kshValue: { type: Number, required: true }, // computed using current mallcoin price
  conversionType: { type: String, enum: ["monthly_window", "annual_auto", "manual"], default: "monthly_window" },
  convertedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("ConversionHistory", ConversionHistorySchema);

