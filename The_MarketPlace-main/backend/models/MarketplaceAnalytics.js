const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  totalSales: Number,
  totalTransactions: Number,
  newUsers: Number,
  topProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  topSellers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  hourlySales: [Number], // Array of 24 numbers for each hour
  categorySales: [{ category: String, count: Number }],
  userGrowth: [Number], // Array for user growth over time
  transactionVolume: [Number] // Array for transaction volume over time
});

module.exports = mongoose.model("MarketplaceAnalytics", analyticsSchema);