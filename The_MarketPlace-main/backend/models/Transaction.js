
const mongoose = require('mongoose');

const TxSchema = new mongoose.Schema({
  referenceId: { type: String, unique: true },
  walletId: { type: mongoose.Types.ObjectId, ref: 'Wallet', required: true, index: true },
  userId: { type: mongoose.Types.ObjectId, ref: 'User', index: true },
  type: { type: String, enum: ["deposit", "withdraw", "send", "receive", "buy_mallcoin", "sell_mallcoin", "convert", "fee", "roi", "earn_points", "payment", "purchase", "campaign_spend", "mpesa_stk_push"], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "KSH" },
  counterparty: { type: String, default: null },
  checkoutRequestId: { type: String, index: true },
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" }
});

TxSchema.pre('save', function (next) {
  if (!this.referenceId) {
    this.referenceId = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString().slice(-4);
  }
  next();
});

module.exports = mongoose.model('Transaction', TxSchema);


