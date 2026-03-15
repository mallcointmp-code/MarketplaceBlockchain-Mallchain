// backend/workers/b2cWorker.js
const Queue = require('bull');
const { b2cPayout } = require('../services/mpesaService.js');
const redisConfig = require('../config/redis.js');
const Wallet = require('../models/Wallet.js');
const { deposit as creditWallet } = require('../services/walletService.js');
const AdTransaction = require('../models/AdTransaction.js');
const WalletTransaction = require('../models/WalletTransaction.js');
const { v4 as uuidv4 } = require('uuid');

const REDIS_URL = process.env.BULL_REDIS_URL || process.env.REDIS_URL || "redis://127.0.0.1:6379";
const concurrency = Number(process.env.B2C_CONCURRENCY || 3);
const B2C_QUEUE = new Queue("b2c-payouts", REDIS_URL);

// job data: { payoutId, userId, phone, amount, metadata }
B2C_QUEUE.process(concurrency, async (job) => {
  const { payoutId, userId, phone, amount, metadata } = job.data;
  try {
    if (!process.env.MPESA_B2C_API_URL) throw new Error("MPESA_B2C_API_URL not configured");
    const resp = await b2cPayout({ phone, amount, accountRef: payoutId, metadata });
    // successful call will usually return a conversation or transaction id
    await WalletTransaction.updateOne({ txId: metadata.debitTxId }, { $set: { "metadata.externalRef": resp } });
    return { ok: true, resp };
  } catch (err) {
    console.error("B2C worker error:", err && err.message ? err.message : err);
    const attempts = job.attemptsMade || 0;
    const maxAttempts = Number(process.env.B2C_MAX_RETRIES || 5);
    if (attempts >= maxAttempts) {
      // permanent failure: credit user back and create refund ledger entry
      try {
        await creditWallet({ userId, amount, type: "b2c_refund", metadata: { payoutId, reason: String(err && err.message) } });
      } catch (cErr) {
        console.error("Failed to credit user after B2C failure", cErr && cErr.message);
      }
      // if linked to an AdTransaction, mark it for review
      if (metadata && metadata.adTxId) {
        try {
          const adTx = await AdTransaction.findById(metadata.adTxId);
          if (adTx) {
            adTx.meta = { ...(adTx.meta || {}), payoutFailure: true, payoutError: String(err && err.message) };
            await adTx.save();
          }
        } catch (x) { console.warn("adTx update failed", x && x.message); }
      }
      return { ok: false, reason: String(err && err.message) };
    }
    // let Bull handle retry backoff
    throw err;
  }
});

module.exports = B2C_QUEUE;

module.exports = { Queue, redisConfig, Wallet, AdTransaction, WalletTransaction, REDIS_URL, concurrency, B2C_QUEUE, resp, attempts, maxAttempts, adTx };