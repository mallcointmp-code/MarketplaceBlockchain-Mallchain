const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/authMiddleware");
const ethService = require("../services/web3Service");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

const {
  getMallcoinBuyPrice,
  getMallcoinSellPrice,
  getMallcoinSupply,
  recordMallcoinBuy,
  recordMallcoinSell
} = require("../services/mallcoinPrice");

const {
  getMallcoinSupplies,
  useReferralCoins,
  useSocialCoins,
  useSellingCoins,
  useConversionCoins
} = require("../services/mallcoinSupply");

const { ethers } = require("ethers");

/* ===========================
   WALLET MANAGEMENT
=========================== */

// Register wallet
router.post("/register-wallet", authMiddleware, async (req, res) => {
  const { walletAddress } = req.body;
  if (!ethers.isAddress(walletAddress)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.walletAddress = walletAddress;
  await user.save();

  res.json({ message: "Wallet linked", walletAddress });
});

// Get wallet
router.get("/wallet-address", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ walletAddress: user?.walletAddress || null });
});

// Update wallet
router.put("/wallet-address", authMiddleware, async (req, res) => {
  const { walletAddress } = req.body;
  if (!ethers.isAddress(walletAddress)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const user = await User.findById(req.user._id);
  user.walletAddress = walletAddress;
  await user.save();

  res.json({ message: "Wallet updated", walletAddress });
});

// Remove wallet
router.delete("/wallet-address", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id);
  user.walletAddress = undefined;
  await user.save();

  res.json({ message: "Wallet removed" });
});

/* ===========================
   USER SIGNED TRANSACTIONS
=========================== */

router.post("/user-transfer-mallcoin", authMiddleware, async (req, res) => {
  const { signedTx } = req.body;

  try {
    await ethService.init();
    const provider = ethService.provider();
    const txResponse = await provider.sendTransaction(signedTx);
    const receipt = await txResponse.wait();

    res.json({ success: true, txHash: receipt.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   BLOCKCHAIN BALANCES (PUBLIC)
=========================== */

router.get("/mallpoints-balance/:address", async (req, res) => {
  await ethService.init();
  const balance = await ethService.getMallpointsBalance(req.params.address);
  res.json({ mallpoints: balance });
});

router.get("/mallcoin-balance/:address", async (req, res) => {
  await ethService.init();
  const balance = await ethService.getMallcoinBalance(req.params.address);
  res.json({ mallcoin: balance });
});

/* ===========================
   ADMIN BLOCKCHAIN ACTIONS
=========================== */

router.post("/transfer-mallcoin", authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);

  const { fromPrivateKey, toAddress, amount } = req.body;
  await ethService.init();

  const result = await ethService.transferMallcoin(
    fromPrivateKey,
    toAddress,
    amount
  );

  res.json(result);
});

router.post("/mint-mallpoints", authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);

  await ethService.init();
  const result = await ethService.mintMallpoints(
    req.body.toAddress,
    req.body.amount
  );

  res.json(result);
});

router.post("/mint-mallcoin", authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);

  await ethService.init();
  const result = await ethService.mintMallcoin(
    req.body.toAddress,
    req.body.amount
  );

  res.json(result);
});

/* ===========================
   MARKET + WALLET LOGIC
=========================== */

router.get("/balance", authMiddleware, async (req, res) => {
  const balance = await ethService.getMallcoinBalance(req.user.walletAddress);
  res.json({
    mallcoin: balance,
    buyPrice: getMallcoinBuyPrice(),
    sellPrice: getMallcoinSellPrice()
  });
});

// Buy Mallcoin
router.post("/buy", authMiddleware, async (req, res) => {
  const { amount } = req.body;

  useSellingCoins(amount);
  recordMallcoinBuy(amount);

  res.json({
    message: "Mallcoin purchased",
    supply: getMallcoinSupply(),
    price: getMallcoinBuyPrice()
  });
});

// Sell Mallcoin
router.post("/sell", authMiddleware, async (req, res) => {
  const { amount } = req.body;

  recordMallcoinSell(amount);

  res.json({
    message: "Mallcoin sold",
    supply: getMallcoinSupply(),
    price: getMallcoinSellPrice()
  });
});

// Convert MLPTS → MLCNS
router.post("/convert", authMiddleware, async (req, res) => {
  const { amount } = req.body;

  useConversionCoins(amount);

  res.json({
    message: "Conversion successful",
    supplies: getMallcoinSupplies()
  });
});

/* ===========================
   REWARDS
=========================== */

router.post("/reward/referral", authMiddleware, async (req, res) => {
  useReferralCoins(req.body.amount);
  res.json({ message: "Referral reward granted" });
});

router.post("/reward/social", authMiddleware, async (req, res) => {
  useSocialCoins(req.body.amount);
  res.json({ message: "Social reward granted" });
});

/* ===========================
   TRANSACTION HISTORY
=========================== */

router.get("/history", authMiddleware, async (req, res) => {
  const history = await Transaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ history });
});

module.exports = router;
