const mongoose = require('mongoose');

const WalletTransactionSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["deposit", "withdraw", "transfer", "send", "receive", "conversion", "task_charge", "task_reward", "buy_mallcoin", "sell_mallcoin", "reserve", "release", "charge", "refund", "admin_credit"], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "KSH" },
  balanceBefore: { type: Number },
  balanceAfter: { type: Number },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
  checkoutRequestId: { type: String, index: true },
  referenceId: { type: String, unique: true },
  refId: { type: mongoose.Types.ObjectId },
  meta: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

WalletTransactionSchema.pre('save', function (next) {
  if (!this.referenceId) {
    this.referenceId = 'WTXN-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString().slice(-4);
  }
  next();
});

WalletTransactionSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.models.WalletTransaction || mongoose.model("WalletTransaction", WalletTransactionSchema);