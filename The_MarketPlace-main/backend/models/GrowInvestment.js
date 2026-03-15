const mongoose = require('mongoose');

const growInvestmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  totalGoal: { type: Number, required: true }, // Total fundraising target (in Mallmoney)
  slotPrice: { type: Number, required: true }, // Price per investment slot
  totalSlots: { type: Number, required: true },
  slotsTaken: { type: Number, default: 0 },
  roiPercent: { type: Number, required: true }, // e.g., 10 = 10% per month
  durationMonths: { type: Number, required: true },
  deadline: { type: Date, required: true },
  status: {
    type: String,
    enum: ["Active", "Funded", "Failed", "Closed"],
    default: "Active",
  },
  raisedAmount: { type: Number, default: 0 },
  createdBy: { type: String, default: "Admin" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("GrowInvestment", growInvestmentSchema);

module.exports = { mongoose, growInvestmentSchema };