
const mongoose = require("mongoose");

const investmentParticipationSchema = new mongoose.Schema({
  investmentId: { type: mongoose.Schema.Types.ObjectId, ref: "GrowInvestment", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  slotsBought: { type: Number, required: true },
  amountInvested: { type: Number, required: true },
  expectedReturn: { type: Number, required: true },
  refunded: { type: Boolean, default: false },
  roiPaid: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
});

investmentParticipationSchema.index({ investmentId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("InvestmentParticipation", investmentParticipationSchema);
