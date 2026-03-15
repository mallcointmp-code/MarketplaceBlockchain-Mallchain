const mongoose = require("mongoose");

const investmentSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  projectName: { type: String, required: true },
  description: { type: String },
  totalAmountNeeded: { type: Number, required: true },
  minContribution: { type: Number, required: true },
  slotsAvailable: { type: Number, required: true },
  slotsTaken: { type: Number, default: 0 },
  raisedAmount: { type: Number, default: 0 },
  monthlyReturnPercent: { type: Number, required: true },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ["open", "closed", "refunded"], default: "open" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Investment", investmentSchema);
