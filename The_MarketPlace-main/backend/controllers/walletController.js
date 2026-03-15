const mongoose = require('mongoose');
const Wallet = require('../models/Wallet.js');
const WalletTransaction = require('../models/WalletTransaction.js');
const User = require('../models/User.js');
const PendingWithdrawal = require('../models/PendingWithdrawal.js');
const WithdrawalPin = require('../models/WithdrawalPin.js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { initiateStkPush } = require('../services/mpesaService.js');
const { generateAndSendOtp, verifyOtp } = require('../services/otpService.js');
const { sendSms } = require('../services/smsService.js');
const { sendEmail } = require('../services/emailService.js');
const ethServiceModule = require("../services/ethService.js");
const { runInTransaction } = require('../utils/transactionHelper.js');

// Emit wallet update via Socket.IO
function emitBalanceUpdate(req, wallet) {
  try {
    const io = req.app.get("io");
    if (!io) return;
    io.to(`user:${wallet.userId || wallet.ownerId}`).emit("wallet:update", {
      userId: wallet.userId || wallet.ownerId,
      mallmoney: wallet.mallmoney,
      mallcoins: wallet.mallcoins,
      mallpoints: wallet.mallpoints
    });
  } catch (err) { console.warn("emitBalanceUpdate err", err); }
}

// Get or create wallet helper
async function getOrCreateWalletMain(ownerId) {
  let w = await Wallet.findOne({ ownerId });
  if (!w) {
    w = await Wallet.findOne({ userId: ownerId }); // try alternate
    if (!w) {
      w = new Wallet({ ownerId, userId: ownerId, mallmoney: 0, reserved: 0 });
      await w.save();
    }
  }
  return w;
}

exports.getWallet = async (req, res) => {
  try {
    const userId = req.user._id;
    const wallet = await getOrCreateWalletMain(userId);

    // Genesis Balance for SuperAdmins: If they have 0 Mallmoney/Coins/Points, seed them with 1M
    if (req.user.role === 'superadmin' && wallet.mallmoney === 0 && wallet.mallcoins === 0 && wallet.mallpoints === 0) {
      wallet.mallmoney = 1000000;
      wallet.mallcoins = 1000000;
      wallet.mallpoints = 1000000;
      await wallet.save();

      // Log a special genesis transaction
      await WalletTransaction.create({
        ownerId: userId,
        userId: userId,
        type: "deposit",
        amount: 1000000,
        description: "SuperAdmin Genesis Balance Initialization",
        status: "completed",
        meta: { source: "genesis_provisioning", role: "superadmin" }
      });
    }

    const txs = await WalletTransaction.find({ ownerId: userId }).sort({ createdAt: -1 }).limit(100);
    res.json({ wallet, txs });
  } catch (err) {
    console.error("getWallet err", err);
    res.status(500).json({ error: "Failed to get wallet" });
  }
};

exports.checkPinStatus = async (req, res) => {
  try {
    const pin = await WithdrawalPin.findOne({ userId: req.user._id });
    res.json({ isSet: !!pin });
  } catch (err) {
    res.status(500).json({ error: "Failed to check PIN status" });
  }
};

exports.setWithdrawalPin = async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: "PIN must be 4-6 digits" });

    const existing = await WithdrawalPin.findOne({ userId: req.user._id });
    if (existing) return res.status(400).json({ error: "PIN already set" });

    const pinHash = await bcrypt.hash(pin, 12);
    await WithdrawalPin.create({ userId: req.user._id, pinHash });

    res.json({ ok: true, message: "PIN set successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to set PIN" });
  }
};

exports.changeWithdrawalPin = async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;
    if (!newPin || !/^\d{4,6}$/.test(newPin)) return res.status(400).json({ error: "New PIN must be 4-6 digits" });

    const pinDoc = await WithdrawalPin.findOne({ userId: req.user._id });
    if (!pinDoc) return res.status(404).json({ error: "PIN not set" });

    const isValid = await pinDoc.verifyPin(oldPin);
    if (!isValid) return res.status(403).json({ error: "Invalid current PIN" });

    pinDoc.pinHash = await bcrypt.hash(newPin, 12);
    await pinDoc.save();

    res.json({ ok: true, message: "PIN changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(err.message.includes("locked") ? 423 : 500).json({ error: err.message || "Failed to change PIN" });
  }
};

exports.resetWithdrawalPin = async (req, res) => {
  try {
    const { idNumber, newPin } = req.body;
    if (!idNumber) return res.status(400).json({ error: "Identification Number is required" });
    if (!newPin || !/^\d{4,6}$/.test(newPin)) return res.status(400).json({ error: "New PIN must be 4-6 digits" });

    const user = await User.findById(req.user._id);
    if (!user.idNumber) return res.status(400).json({ error: "Identity verification not configured. Please set your ID Number in Profile settings first." });

    if (user.idNumber !== idNumber) {
      return res.status(403).json({ error: "Identity verification failed. Information does not match our records." });
    }

    let pinDoc = await WithdrawalPin.findOne({ userId: req.user._id });
    const pinHash = await bcrypt.hash(newPin, 12);

    if (!pinDoc) {
      await WithdrawalPin.create({ userId: req.user._id, pinHash });
    } else {
      pinDoc.pinHash = pinHash;
      pinDoc.failedAttempts = 0;
      pinDoc.lockedUntil = null;
      await pinDoc.save();
    }

    res.json({ ok: true, message: "PIN reset successful. You can now use your new PIN." });
  } catch (err) {
    console.error("resetWithdrawalPin err", err);
    res.status(500).json({ error: "Failed to reset PIN" });
  }
};

// Deposit Logic
exports.deposit = async (req, res) => {
  // Try STK push if phone provided, else manual deposit logic?
  // Using the logic from original Section 2
  try {
    const { phone, amount } = req.body;
    if (phone && amount) {
      // Mpesa STK
      const stk = await initiateStkPush(phone, amount, `Deposit:${req.user._id}`);
      if (stk && stk.ResponseCode === '0') {
        const wallet = await getOrCreateWalletMain(req.user._id);
        await WalletTransaction.create({
          ownerId: req.user._id,
          type: "deposit",
          amount: Number(amount),
          status: "pending",
          checkoutRequestId: stk.CheckoutRequestID,
          meta: { phone, method: "mpesa_stk" }
        });
      }
      return res.json({ ok: true, message: "STK initiated", stk });
    }
    // Fallback/Demo deposit (from Section 1)
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    await runInTransaction(async (session) => {
      const wallet = await getOrCreateWalletMain(req.user._id);
      const before = wallet.mallmoney;
      wallet.mallmoney = Number((wallet.mallmoney || 0) + Number(amount));
      wallet.updatedAt = new Date();
      await wallet.save({ session });

      const tx = new WalletTransaction({
        walletId: wallet._id,
        ownerId: req.user._id,
        userId: req.user._id,
        type: "deposit",
        amount,
        balanceBefore: before,
        balanceAfter: wallet.mallmoney,
        meta: { source: req.body.source || "manual" }
      });
      await tx.save({ session });
      emitBalanceUpdate(req, wallet);
      res.json({ ok: true, tx, wallet });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Deposit failed" });
  }
};

exports.mpesaCallback = async (req, res) => {
  // Placeholder
  res.json({ ok: true });
};

exports.withdrawRequest = async (req, res) => {
  try {
    const { amount, pin, method = "mpesa", phone, otpMethod = "sms" } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    const wallet = await getOrCreateWalletMain(req.user._id);

    const pinDoc = await WithdrawalPin.findOne({ userId: req.user._id });
    if (!pinDoc) return res.status(400).json({ error: "PIN not set" });

    const okPin = await pinDoc.verifyPin(pin);
    if (!okPin) return res.status(403).json({ error: "Invalid PIN" });

    if ((wallet.mallmoney || 0) < amount) return res.status(400).json({ error: "Insufficient balance" });

    // OTP for large amounts
    const LARGE_THRESHOLD = Number(process.env.LARGE_WITHDRAWAL_THRESHOLD || 10000);
    if (amount >= LARGE_THRESHOLD) {
      await generateAndSendOtp({ userId: String(req.user._id), phone: phone || req.user.phone, email: req.user.email, method: otpMethod, purpose: 'withdraw' });
      // Store pending... (omitted detailed redis logic for brevity, using DB)
      // Assuming PendingWithdrawal model
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await PendingWithdrawal.create({ userId: req.user._id, amount, method, phone, expiresAt });
      return res.json({ ok: true, next: "verify_otp", message: "OTP sent" });
    }

    // Process immediate withdrawal
    const before = wallet.mallmoney;
    wallet.mallmoney = Number((wallet.mallmoney - amount).toFixed(2));
    await wallet.save();
    const tx = new WalletTransaction({
      walletId: wallet._id, userId: req.user._id, ownerId: req.user._id,
      type: "withdraw", amount, balanceBefore: before, balanceAfter: wallet.mallmoney,
      meta: { method, phone }
    });
    await tx.save();
    emitBalanceUpdate(req, wallet);
    res.json({ ok: true, tx });
  } catch (err) {
    console.error("withdrawRequest err", err);
    res.status(err.message.includes("locked") ? 423 : 500).json({ error: err.message || "Failed" });
  }
};

exports.verifyWithdrawOtp = async (req, res) => {
  // Implementation similar to Section 2
  try {
    const { code } = req.body;
    const userId = String(req.user._id);
    const ok = await verifyOtp({ userId, code });
    if (!ok) return res.status(400).json({ error: "Invalid OTP" });
    const p = await PendingWithdrawal.findOne({ userId }).sort({ createdAt: -1 });
    if (!p) return res.status(400).json({ error: "No pending" });

    const wallet = await getOrCreateWalletMain(req.user._id);
    if (wallet.mallmoney < p.amount) return res.status(400).json({ error: "NSF" });

    const before = wallet.mallmoney;
    wallet.mallmoney -= p.amount;
    await wallet.save();

    const tx = new WalletTransaction({
      walletId: wallet._id, userId: req.user._id, ownerId: req.user._id,
      type: "withdraw", amount: p.amount, balanceBefore: before, balanceAfter: wallet.mallmoney,
      meta: { method: p.method, phone: p.phone, via: "otp" }
    });
    await tx.save();
    await PendingWithdrawal.deleteOne({ _id: p._id });
    emitBalanceUpdate(req, wallet);
    res.json({ ok: true, tx });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Verify failed" });
  }
};

exports.sendToUser = async (req, res) => {
  // P2P transfer
  try {
    const { toUsername, amount, pin } = req.body;
    if (!toUsername || !amount) return res.status(400).json({ error: "Missing params" });
    const fromWallet = await getOrCreateWalletMain(req.user._id);
    const pinDoc = await WithdrawalPin.findOne({ userId: req.user._id });
    if (!pinDoc) return res.status(400).json({ error: "PIN not set" });

    const okPin = await pinDoc.verifyPin(pin);
    if (!okPin) return res.status(403).json({ error: "Invalid PIN" });

    if ((fromWallet.mallmoney || 0) < amount) return res.status(400).json({ error: "Insufficient" });

    const toUser = await User.findOne({
      $or: [
        { username: toUsername },
        { email: toUsername }
      ]
    });
    if (!toUser) return res.status(404).json({ error: "User not found" });
    const toWallet = await getOrCreateWalletMain(toUser._id);

    await runInTransaction(async (session) => {
      const beforeFrom = fromWallet.mallmoney;
      const beforeTo = toWallet.mallmoney;
      const transferId = uuidv4(); // Unique ID for this specific transfer event

      fromWallet.mallmoney -= amount;
      toWallet.mallmoney += amount;
      await fromWallet.save({ session });
      await toWallet.save({ session });

      const tx1 = new WalletTransaction({
        walletId: fromWallet._id, ownerId: req.user._id, userId: req.user._id,
        type: "send", amount, balanceBefore: beforeFrom, balanceAfter: fromWallet.mallmoney,
        meta: {
          transferId,
          toUserId: toUser._id,
          toUsername: toUser.username,
          toEmail: toUser.email,
          fromEmail: req.user.email
        }
      });
      const tx2 = new WalletTransaction({
        walletId: toWallet._id, ownerId: toUser._id, userId: toUser._id,
        type: "receive", amount, balanceBefore: beforeTo, balanceAfter: toWallet.mallmoney,
        meta: {
          transferId,
          fromUserId: req.user._id,
          fromUsername: req.user.username,
          fromEmail: req.user.email,
          toEmail: toUser.email
        }
      });
      await tx1.save({ session });
      await tx2.save({ session });
      emitBalanceUpdate(req, fromWallet);
      req.app.get("io")?.to(`user:${toUser._id}`).emit("wallet:received", { from: req.user._id, amount });
      res.json({ ok: true, txOut: tx1, txIn: tx2 });
    });
  } catch (e) {
    console.error(e);
    res.status(e.message.includes("locked") ? 423 : 500).json({ error: e.message || "Send failed" });
  }
};

exports.createQr = async (req, res) => {
  try {
    const { toUserId, amount, currency = "KSH" } = req.body;
    const payload = { type: "receive", toUserId: toUserId || req.user._id, amount, currency, ts: Date.now() };
    const json = JSON.stringify(payload);
    const b64 = Buffer.from(json).toString("base64");
    const qrDataUrl = await QRCode.toDataURL(b64);
    res.json({ ok: true, payload: b64, qrDataUrl });
  } catch (e) {
    res.status(500).json({ error: "QR failed" });
  }
};

exports.confirmQrPayment = async (req, res) => {
  // ... similar logic to Section 1 confirmQrPayment ...
  // Simplified for brevity
  res.status(501).json({ error: "Not implemented yet" });
};

exports.downloadReceipt = async (req, res) => {
  try {
    const { txId } = req.params;
    const tx = await WalletTransaction.findById(txId).lean();
    if (!tx) return res.status(404).json({ error: "Not found" });
    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);
    doc.text(`Receipt ${tx._id} - Amount: ${tx.amount} ${tx.currency || 'KSH'}`);
    doc.end();
  } catch (e) {
    res.status(500).json({ error: "Receipt failed" });
  }
};

exports.reserveEscrow = async (ownerId, amount, meta) => {
  // Helper function for direct calls
  const wallet = await getOrCreateWalletMain(ownerId);
  if (wallet.mallmoney < amount) throw new Error("Insufficient");
  wallet.mallmoney -= amount;
  wallet.reserved = (wallet.reserved || 0) + amount;
  await wallet.save();
  const tx = new WalletTransaction({
    walletId: wallet._id, ownerId, userId: ownerId, type: "escrow_reserve",
    amount, balanceBefore: wallet.mallmoney + amount, balanceAfter: wallet.mallmoney, meta
  });
  await tx.save();
  return { tx, wallet };
};

exports.releaseEscrow = async (ownerId, amount, { type, reason, meta }) => {
  const wallet = await getOrCreateWalletMain(ownerId);
  if ((wallet.reserved || 0) < amount) throw new Error("Insufficient reserved");
  wallet.reserved -= amount;
  await wallet.save();
  // If refund, add back to mallmoney
  if (type === 'refund') {
    const before = wallet.mallmoney;
    wallet.mallmoney += amount;
    await wallet.save();
    await new WalletTransaction({
      walletId: wallet._id, ownerId, userId: ownerId, type: "refund", amount,
      balanceBefore: before, balanceAfter: wallet.mallmoney, meta
    }).save();
  } else {
    await new WalletTransaction({
      walletId: wallet._id, ownerId, userId: ownerId, type: "ad_charge", amount,
      balanceBefore: wallet.mallmoney, balanceAfter: wallet.mallmoney, meta: { ...meta, reason }
    }).save();
  }
  return { ok: true };
};

exports.withdraw = exports.withdrawRequest; // alias
exports.sendMoney = exports.sendToUser; // alias
exports.getOrCreateWallet = getOrCreateWalletMain; // export helper




