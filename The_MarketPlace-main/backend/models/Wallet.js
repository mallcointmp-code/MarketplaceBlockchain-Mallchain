const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Types.ObjectId, ref: "User", required: true, unique: true },
  mallmoney: { type: Number, default: 0 },   // fiat-like internal balance (KSH)
  mallcoins: { type: Number, default: 0 },    // 1 MallCoin = 0.62 KES
  mallpoints: { type: Number, default: 0 },   // 1 MallPoint = 2 KES
  reserved: { type: Number, default: 0 },    // escrow/reserved funds
  currency: { type: String, default: "KSH" },
  blockchainVaultId: { type: String },       // Reference to blockchain vault
  lastBlockchainSync: { type: Date },        // Last sync with blockchain
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

WalletSchema.index({ ownerId: 1 });

module.exports = mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);

