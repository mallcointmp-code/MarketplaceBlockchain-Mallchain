// backend/routes/adminWeb3.js
const express = require("express");
const ethService = require("../services/ethService");
const { protect } = require("../middlewares/authMiddleware");
const Transaction = require("../models/Transaction");

const router = express.Router();

/**
 * Middleware to restrict access to the one admin
 */
const isAdmin = (req, res, next) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (req.user.email !== adminEmail) {
    return res.status(403).json({ message: "Access denied: Admin only" });
  }
  next();
};

/**
 * POST /api/admin/web3/mint
 * Admin mints new Mallcoins to any address
 */
router.post("/mint", protect, isAdmin, async (req, res) => {
  try {
    const { toAddress, amount } = req.body;
    if (!toAddress || !amount) {
      return res.status(400).json({ message: "Address and amount required" });
    }

    await ethService.init();
    const result = await ethService.mintMallcoin(toAddress, amount);

    if (!result.success)
      return res.status(500).json({ message: "Minting failed", error: result.error });

    await Transaction.create({
      type: "mint",
      mlcnsAmount: amount,
      externalTxHash: result.txHash,
      status: "completed",
    });

    res.json({ message: "✅ Mint successful", txHash: result.txHash });
  } catch (err) {
    console.error("Mint error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * POST /api/admin/web3/burn
 * Admin burns Mallcoins from an address
 */
router.post("/burn", protect, isAdmin, async (req, res) => {
  try {
    const { fromAddress, amount } = req.body;
    if (!fromAddress || !amount) {
      return res.status(400).json({ message: "Address and amount required" });
    }

    await ethService.init();
    const result = await ethService.burnMallcoin(fromAddress, amount);

    if (!result.success)
      return res.status(500).json({ message: "Burn failed", error: result.error });

    await Transaction.create({
      type: "burn",
      mlcnsAmount: amount,
      externalTxHash: result.txHash,
      status: "completed",
    });

    res.json({ message: "🔥 Burn successful", txHash: result.txHash });
  } catch (err) {
    console.error("Burn error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * GET /api/admin/web3/stats
 * Fetch token stats & conversion metrics
 */
router.get("/stats", protect, isAdmin, async (req, res) => {
  try {
    await ethService.init();
    const totalSupply = await ethService.getMallcoinTotalSupply();
    const burned = await ethService.getMallcoinBurned();
    const holders = await ethService.getHolderCount();

    const txs = await Transaction.find().sort({ createdAt: -1 }).limit(20);

    res.json({
      totalSupply,
      burned,
      holders,
      recentTransactions: txs,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load stats", error: err.message });
  }
});

module.exports = router;
