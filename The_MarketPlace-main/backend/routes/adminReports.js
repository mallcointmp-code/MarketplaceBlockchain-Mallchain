const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Order = require("../models/Order");
const Job = require("../models/JobListing");
const Career = require("../models/Career");
const { authMiddleware } = require("../middlewares/authMiddleware");

// Admin-only middleware
function adminOnly(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// --- Get All Transactions ---
router.get("/transactions", authMiddleware, adminOnly, async (req, res) => {
  try {
    const WalletTransaction = require("../models/WalletTransaction");

    const [txs, wtxs] = await Promise.all([
      Transaction.find().populate("userId", "email fullName").lean(),
      WalletTransaction.find().populate("ownerId", "email fullName").lean()
    ]);

    // Normalize WalletTransaction to look like Transaction for the UI
    const normalizedWtxs = wtxs.map(w => ({
      ...w,
      userId: w.ownerId, // Map ownerId to userId for UI consistency
      status: w.status || 'completed'
    }));

    const combined = [...txs, ...normalizedWtxs].sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(combined);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Get Badge Sales ---
router.get("/badges", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find().populate("badge jobBadge");
    const badgeStats = {
      general: users.filter(u => u.badge).length,
      job: users.filter(u => u.jobBadge).length,
    };
    res.json({ badgeStats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Get Orders Summary ---
router.get("/orders", authMiddleware, adminOnly, async (req, res) => {
  try {
    const WalletTransaction = require("../models/WalletTransaction");

    // Aggregates from regular orders
    const orders = await Order.find().populate("buyerId", "email fullName");
    const orderRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Aggregates from revenue-generating wallet actions (buy_mallcoin, task_charge etc)
    const walletRevenue = await WalletTransaction.aggregate([
      { $match: { type: { $in: ["buy_mallcoin", "charge", "task_charge"] }, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const totalRevenue = orderRevenue + ((walletRevenue[0] && walletRevenue[0].total) || 0);

    res.json({
      count: orders.length,
      orderRevenue,
      walletRevenue: (walletRevenue[0] && walletRevenue[0].total) || 0,
      totalRevenue,
      orders
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Get Jobs & Applications ---
router.get("/jobs", authMiddleware, adminOnly, async (req, res) => {
  try {
    const jobs = await Job.find().populate("employer", "fullName email");
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Get Careers & Applications ---
router.get("/careers", authMiddleware, adminOnly, async (req, res) => {
  try {
    const careers = await Career.find().populate("applicants", "fullName email");
    res.json(careers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Wallet Balances ---
router.get("/wallets", authMiddleware, adminOnly, async (req, res) => {
  try {
    const Wallet = require("../models/Wallet");
    const mp = require("../services/mallcoinPrice.js");
    const wallets = await Wallet.find().populate("ownerId", "email fullName");

    let totals = { mallmoney: 0, mallcoins: 0, mallpoints: 0 };
    wallets.forEach(w => {
      totals.mallmoney += (w.mallmoney || 0);
      totals.mallcoins += (w.mallcoins || 0);
      totals.mallpoints += (w.mallpoints || 0);
    });

    // Calculate weighted asset value in KES
    const getMallcoinBuyPrice = mp.getMallcoinBuyPrice || (mp.default && mp.default.getMallcoinBuyPrice);
    const mlcRate = getMallcoinBuyPrice ? getMallcoinBuyPrice() : 2.0;
    const mpRate = 0.62; // MallPoints are valued at 0.62 KES each (reward currency)

    const weightedAssetValue = totals.mallmoney + (totals.mallcoins * mlcRate) + (totals.mallpoints * mpRate);

    res.json({
      totals,
      wallets,
      weightedAssetValue,
      rates: { mallcoinToKES: mlcRate, mallpointToKES: mpRate }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
