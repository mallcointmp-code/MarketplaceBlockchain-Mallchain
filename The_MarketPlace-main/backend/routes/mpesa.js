const express = require('express');
const mpesaService = require('../services/mpesaService.js');
const Transaction = require('../models/Transaction.js');

const router = express.Router();

// STK push endpoint
router.post("/stk", async (req, res) => {
  try {
    const { amount, phone } = req.body;
    const userId = req.user?._id;
    // Optional: create a pending record mapping CheckoutRequestID -> userId before calling stkPush
    const result = await mpesaService.stkPush({
      amount,
      phone,
      accountReference: `Topup-${userId}`
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "STK push failed", details: err?.message });
  }
});

// STK callback endpoint (MPESA will POST here)
router.post("/stk-callback", express.json({ limit: '1mb' }), async (req, res) => {
  // respond immediately to M-Pesa
  res.json({ ResultCode: 0, ResultDesc: "Received" });

  try {
    const parsed = mpesaService.parseStkCallback(req.body);
    if (!parsed) return;

    const { CheckoutRequestID, ResultCode, ResultDesc, metadata } = parsed;

    // Track in general transaction log
    await Transaction.create({
      type: "mpesa_stk_callback",
      raw: req.body,
      checkoutRequestId: CheckoutRequestID,
      resultCode: ResultCode,
      resultDesc: ResultDesc,
      mpesaReceipt: metadata?.MpesaReceiptNumber || metadata?.ReceiptNumber || null,
      amount: metadata?.Amount || null,
      phone: metadata?.PhoneNumber || null,
      transactionDate: metadata?.TransactionDate ? new Date(String(metadata.TransactionDate)) : new Date()
    });

    // If successful, find pending wallet transaction and complete it
    if (ResultCode === 0 || ResultCode === "0") {
      const WalletTransaction = require("../models/WalletTransaction.js");
      const Wallet = require("../models/Wallet.js");
      const pendingTx = await WalletTransaction.findOne({ checkoutRequestId: CheckoutRequestID, status: "pending" });

      if (pendingTx) {
        const wallet = await Wallet.findOne({ ownerId: pendingTx.ownerId });
        if (wallet) {
          const before = wallet.mallmoney || 0;
          wallet.mallmoney = (wallet.mallmoney || 0) + Number(metadata.Amount || pendingTx.amount);
          wallet.updatedAt = new Date();
          await wallet.save();

          pendingTx.status = "completed";
          pendingTx.balanceBefore = before;
          pendingTx.balanceAfter = wallet.mallmoney;
          pendingTx.meta = { ...pendingTx.meta, mpesaReceipt: metadata.MpesaReceiptNumber, callback: parsed };
          await pendingTx.save();

          // Emit update if socket available
          const io = req.app?.get("io");
          if (io) {
            io.to(`user:${wallet.ownerId}`).emit("wallet:update", {
              mallmoney: wallet.mallmoney,
              mallcoins: wallet.mallcoins,
              mallpoints: wallet.mallpoints
            });
            io.to(`user:${wallet.ownerId}`).emit("notification:new", {
              title: "Deposit Successful",
              message: `Your deposit of KSH ${metadata.Amount} was successful.`,
              type: "wallet"
            });
          }
        }
      }
    } else {
      // Mark as failed
      const WalletTransaction = require("../models/WalletTransaction.js");
      await WalletTransaction.updateMany({ checkoutRequestId: CheckoutRequestID, status: "pending" }, { status: "failed", meta: { error: ResultDesc } });
    }
  } catch (err) {
    console.error("stk-callback processing error", err);
  }
});

// B2C payout result
router.post("/payout-result", express.json({ limit: '1mb' }), (req, res) => {
  res.json({ ok: true });
  // parse payout results here and reconcile
});

// CommonJS export
module.exports = {
  express,
  router,
  mpesaService,
  Transaction
};
