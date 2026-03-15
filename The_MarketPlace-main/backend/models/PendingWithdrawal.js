const mongoose = require('mongoose');

const PendingWithdrawalSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  method: { type: String, default: 'mpesa' },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

PendingWithdrawalSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.PendingWithdrawal || mongoose.model('PendingWithdrawal', PendingWithdrawalSchema);