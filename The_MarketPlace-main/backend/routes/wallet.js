// backend/routes/walletRoutes.js
const express = require('express');
const ctrl = require('../controllers/walletController.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');

const router = express.Router();

// Wallet summary (support both `/api/wallet` and `/api/wallet/me`)
router.get("/", authMiddleware, ctrl.getWallet);
router.get("/me", authMiddleware, ctrl.getWallet);

// Deposit, Withdraw, Send
router.post("/deposit", authMiddleware, ctrl.deposit);
router.post("/withdraw", authMiddleware, ctrl.withdraw);
router.post("/send", authMiddleware, ctrl.sendMoney);

// PIN Management
router.get("/check-pin", authMiddleware, ctrl.checkPinStatus);
router.post("/set-pin", authMiddleware, ctrl.setWithdrawalPin);
router.post("/change-pin", authMiddleware, ctrl.changeWithdrawalPin);
router.post("/reset-pin", authMiddleware, ctrl.resetWithdrawalPin);

router.get("/buy-price", authMiddleware, (req, res) => {
  const mp = require("../services/mallcoinPrice.js");
  res.json({ buyPrice: mp.getMallcoinBuyPrice() });
});

router.get("/rate", authMiddleware, (req, res) => {
  // MallPoint is valued at 0.62 KES (reward currency)
  res.json({ rate: 0.62 });
});

router.get("/market-rates", authMiddleware, (req, res) => {
  const { getMarketRates } = require("../services/marketRateService.js");
  res.json(getMarketRates());
});

// Reserve escrow
router.post("/reserve-escrow", authMiddleware, async (req, res) => {
  try {
    const { amount, meta } = req.body;
    const result = await ctrl.reserveEscrow(req.user._id, amount, meta);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || "reserve failed" });
  }
});

// Create receive link / QR
router.post('/receive-link', authMiddleware, async (req, res) => {
  try {
    req.body.toUserId = req.user._id;
    const handler = ctrl.createQr || (ctrl.default && ctrl.default.createQr);
    if (!handler) return res.status(501).json({ error: 'not implemented' });
    return handler(req, res);
  } catch (err) {
    console.error('receive-link err', err);
    res.status(500).json({ error: 'failed' });
  }
});

// Release escrow
router.post("/release-escrow", authMiddleware, async (req, res) => {
  try {
    const { ownerId, amount, type, reason, meta } = req.body;
    const r = await ctrl.releaseEscrow(ownerId || req.user._id, amount, { type, reason, meta });
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message || "release failed" });
  }
});

// Download receipt
router.get("/receipt/:txId", authMiddleware, ctrl.downloadReceipt);

// Transactions list
router.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const WalletTransaction = require("../models/WalletTransaction.js");
    const transactions = await WalletTransaction.find({ ownerId: userId }).sort({ createdAt: -1 }).limit(100);
    res.json({ data: transactions });
  } catch (err) {
    res.status(500).json({ error: "failed" });
  }
});

// Buy MallCoins with KES
router.post("/buy", authMiddleware, async (req, res) => {
  try {
    const { amountKES } = req.body;
    if (!amountKES || Number(amountKES) <= 0) return res.status(400).json({ error: "amountKES required" });

    const mp = require("../services/mallcoinPrice.js");
    const ethServiceModule = require("../services/ethService.js");
    const User = require("../models/User.js");
    const Wallet = require("../models/Wallet.js");
    const Transaction = require("../models/Transaction.js");

    const getMallcoinBuyPrice = mp.getMallcoinBuyPrice || (mp.default && mp.default.getMallcoinBuyPrice);
    const recordMallcoinBuy = mp.recordMallcoinBuy || (mp.default && mp.default.recordMallcoinBuy);
    const ethService = ethServiceModule.default || ethServiceModule;

    const buyPrice = Number(getMallcoinBuyPrice());
    const mlcns = Number(amountKES) / buyPrice;

    // DB ops
    const user = await User.findById(req.user._id);
    let wallet = await Wallet.findOne({ ownerId: req.user._id });
    if (!wallet) {
      wallet = new Wallet({ ownerId: req.user._id, mallmoney: 0, mallcoins: 0 });
      await wallet.save();
    }

    if (wallet.mallmoney < Number(amountKES)) {
      return res.status(400).json({ error: "Insufficient MallMoney balance. Please deposit funds first." });
    }

    let mintResult = null;
    // ... (wallet generation logic remains same)
    if (!user.walletAddress) {
      if (!req.body.generateWallet) {
        return res.status(400).json({ error: 'No linked walletAddress. Set it in profile or send generateWallet=true.' });
      }
      if (!process.env.WALLET_GEN_SECRET) {
        return res.status(400).json({ error: 'Server not configured to generate wallets.' });
      }

      const { ethers } = require('ethers');
      const newWallet = ethers.Wallet.createRandom();
      user.walletAddress = newWallet.address;

      try {
        const crypto = require('crypto');
        const secret = process.env.WALLET_GEN_SECRET;
        const ivBuf = crypto.randomBytes(12);
        const iv = ivBuf.toString('hex');
        const key = crypto.createHash('sha256').update(secret).digest();
        const cipher = crypto.createCipheriv('aes-256-gcm', key, ivBuf);
        let enc = cipher.update(newWallet.privateKey, 'utf8', 'hex');
        enc += cipher.final('hex');
        const tag = cipher.getAuthTag().toString('hex');
        user.walletKeyEncrypted = { iv, tag, data: enc };
        await user.save();
      } catch (e) {
        console.warn('wallet gen store err', e && e.message);
        await user.save();
      }
    }

    try {
      if (user && user.walletAddress) {
        if (ethService.init) await ethService.init();
        mintResult = await ethService.mintMallcoin(user.walletAddress, String(mlcns));
      }
    } catch (err) {
      console.warn('mint error, falling back to DB credit', err.message || err);
      mintResult = { success: false, error: String(err) };
    }

    const beforeKES = wallet.mallmoney;
    const beforeMLCNS = wallet.mallcoins;

    wallet.mallmoney -= Number(amountKES);
    wallet.mallcoins = Number(wallet.mallcoins || 0) + Number(mlcns);
    wallet.updatedAt = new Date();
    await wallet.save();

    const tx = new Transaction({
      walletId: wallet._id,
      userId: req.user._id,
      type: 'buy_mallcoin',
      amount: mlcns,
      currency: 'MLCNS',
      meta: {
        amountKES,
        pricePer: buyPrice,
        mintResult,
        balanceBeforeKES: beforeKES,
        balanceAfterKES: wallet.mallmoney,
        balanceBeforeMLCNS: beforeMLCNS,
        balanceAfterMLCNS: wallet.mallcoins
      }
    });
    await tx.save();

    try { recordMallcoinBuy(mlcns); } catch (e) { /* ignore */ }

    res.json({ ok: true, txId: tx._id, message: `Successfully purchased ${mlcns.toFixed(6)} MLCNS for KES ${amountKES}`, wallet });
  } catch (err) {
    console.error('wallet buy err', err);
    res.status(500).json({ error: err.message || 'buy failed' });
  }
});

// Export encrypted wallet key (superadmin + MFA)
router.get('/key/export/:userId', authMiddleware, async (req, res) => {
  try {
    const requester = req.user;
    const mfaHeader = req.headers['x-superadmin-mfa'] || req.headers['x-superadmin-mfa-token'];
    if (!requester || requester.role !== 'superadmin') return res.status(403).json({ error: 'forbidden' });
    if (!mfaHeader || String(mfaHeader) !== String(process.env.SUPERADMIN_MFA_SECRET)) return res.status(403).json({ error: 'mfa required' });

    const User = require('../models/User.js');
    const user = await User.findById(req.params.userId).lean();
    if (!user) return res.status(404).json({ error: 'user not found' });
    if (!user.walletKeyEncrypted) return res.status(404).json({ error: 'no encrypted key stored' });

    return res.json({ ok: true, walletAddress: user.walletAddress, walletKeyEncrypted: user.walletKeyEncrypted });
  } catch (err) {
    console.error('export encrypted key err', err);
    res.status(500).json({ error: 'failed' });
  }
});

module.exports = router;
