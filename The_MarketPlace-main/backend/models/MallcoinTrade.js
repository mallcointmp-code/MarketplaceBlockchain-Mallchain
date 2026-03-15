const mongoose = require("mongoose");

const mallcoinTradeSchema = new mongoose.Schema({
  type: { type: String, enum: ["buy", "sell"], required: true },
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("MallcoinTrade", mallcoinTradeSchema);