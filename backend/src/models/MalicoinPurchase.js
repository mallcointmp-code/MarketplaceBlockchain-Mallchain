const mongoose = require('mongoose');

const MallcoinPurchaseSchema = new mongoose.Schema({
  quoteId: { type: String, required: true, unique: true },
  walletAddress: { type: String, required: true },
  amount: { type: Number, required: true }, // MLCNS
  fiatAmount: { type: Number, required: true },
  currency: { type: String, default: 'KES' },
  phone: { type: String, required: true },
  status: { type: String, enum: ['pending', 'payment_initiated', 'confirmed', 'credited', 'failed'], default: 'pending' },
  paymentId: { type: String },
  mpesaRef: { type: String },
  txHash: { type: String }, // blockchain tx hash
  reason: { type: String }, // failure reason
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) }, // 10 min
});

module.exports = mongoose.model('MallcoinPurchase', MallcoinPurchaseSchema);
