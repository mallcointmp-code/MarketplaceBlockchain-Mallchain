const mongoose = require('mongoose');

const BuyerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    address: { type: String },
    orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    preferences: [{ type: String }], // e.g., electronics, fashion
  },
  { timestamps: true }
);

module.exports = mongoose.models.Buyer || mongoose.model("Buyer", BuyerSchema);

module.exports = { mongoose, BuyerSchema };