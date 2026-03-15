const withdrawQueue = require('../queues/withdrawQueue.js');
const mpesaService = require('../services/mpesaService.js');
const { deposit } = require('../services/walletService.js');
const Wallet = require('../models/Wallet.js');
const WalletTransaction = require('../models/WalletTransaction.js');
const { sendSms } = require('../services/smsService.js');
const { sendEmail } = require('../services/emailService.js');
const mongoose = require('mongoose');

// Process withdrawal jobs: attempt MPESA B2C payout, on final failure refund user
withdrawQueue.process(async (job) => {
  const { withdrawRequestId, userId, amount, phone } = job.data || {};
  try {
    console.log('[withdrawWorker] processing', { withdrawRequestId, userId, amount, phone });

    // Attempt payout via MPESA B2C
    const resp = await mpesaService.mpesaPayout({ phone, amount, remarks: `Payout ${withdrawRequestId}`, occasion: '' });
    console.log('[withdrawWorker] mpesa response', resp && resp.ResponseCode);

    if (!resp || String(resp.ResponseCode) !== '0') {
      throw new Error(`mpesa payout failed: ${resp && (resp.errorMessage || resp.ResponseDescription || JSON.stringify(resp))}`);
    }

    // mark original withdrawal tx meta with mpesa info
    try {
      await WalletTransaction.findByIdAndUpdate(withdrawRequestId, { $set: { 'meta.mpesa': resp } });
    } catch (e) { console.warn('[withdrawWorker] failed to update withdraw tx meta', e && e.message); }

    console.log('[withdrawWorker] payout successful for', userId);
    return Promise.resolve();
  } catch (err) {
    console.warn('[withdrawWorker] payout error', err && err.message);

    // If this was the final attempt, refund
    const attempts = job.opts?.attempts || (job.opts?.defaultJobOptions && job.opts.defaultJobOptions.attempts) || 5;
    const attemptsMade = job.attemptsMade || 0;
    const isFinal = attemptsMade >= (attempts - 1);

    if (isFinal) {
      console.log('[withdrawWorker] final failure - performing refund for', userId);
      const { runInTransaction } = require('../utils/transactionHelper.js');

      try {
        await runInTransaction(async (session) => {
          // credit wallet using deposit helper (atomic when sessions supported)
          await deposit(String(userId), Number(amount), { source: 'mpesa_b2c_refund', originalWithdrawId: withdrawRequestId });

          // create refund ledger entry if deposit didn't already create one - safe to create duplicate meta
          const w = await Wallet.findOne({ ownerId: userId }).session(session);
          if (w) {
            await WalletTransaction.create([{
              walletId: w._id,
              ownerId: userId,
              type: 'refund',
              amount: Number(amount),
              balanceBefore: undefined,
              balanceAfter: undefined,
              meta: { reason: 'b2c_final_failure_refund', originalWithdrawId: withdrawRequestId }
            }], { session });
          }

          // mark original withdrawal as failed by setting meta.failed = true
          await WalletTransaction.findByIdAndUpdate(withdrawRequestId, { $set: { 'meta.failed': true, 'meta.failureReason': err.message } }, { session });
        });
      } catch (refundErr) {
        console.error('[withdrawWorker] refund failed', refundErr && refundErr.message);
      }

      // Notify user via SMS + Email
      try {
        await sendSms(phone || '', `Your withdrawal of KSH ${amount} failed. The amount has been refunded to your wallet.`);
      } catch (e) { console.warn('[withdrawWorker] sms notify failed', e && e.message); }
      try {
        // try to find user email via Wallet ownerId mapping
        const w = await Wallet.findOne({ ownerId: userId });
        const email = w && (w.email || null);
        if (email) await sendEmail(email, 'Withdrawal Failed — Refunded', `<p>We could not complete your withdrawal of KSH ${amount}. The amount has been refunded to your wallet.</p>`);
      } catch (e) { console.warn('[withdrawWorker] email notify failed', e && e.message); }

      console.log('[withdrawWorker] refund completed and user notified', userId);
    }

    // rethrow to allow bull to manage retries and failed job state
    throw err;
  }
});

console.log('[withdrawWorker] worker started');

module.exports = { withdrawQueue, mpesaService, Wallet, WalletTransaction, mongoose, resp, attempts, attemptsMade, isFinal, w, before, w, email };