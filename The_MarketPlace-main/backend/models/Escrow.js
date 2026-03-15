const mongoose = require('mongoose');

const EscrowSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  adId: { type: mongoose.Types.ObjectId, ref: "Ad" },
  amount: { type: Number, required: true },
  currency: { type: String, default: "KSH" },
  status: { type: String, enum: ["held","released","refunded"], default: "held" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

module.exports = mongoose.models.Escrow || mongoose.model("Escrow", EscrowSchema);

module.exports = { mongoose, EscrowSchema };