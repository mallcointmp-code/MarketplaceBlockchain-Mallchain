const mongoose = require("mongoose");


const web3StatsSchema = new mongoose.Schema({
  totalSupply: { type: Number, default: 0 },
  burned: { type: Number, default: 0 },
  holders: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });
module.exports = mongoose.model("Web3Stats", web3StatsSchema);

// backend/models/Web3Stats.js (append below existing schema)
const historySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  totalSupply: Number,
  burned: Number,
  holders: Number,
});

module.exports.Web3StatsHistory = mongoose.model("Web3StatsHistory", historySchema);
