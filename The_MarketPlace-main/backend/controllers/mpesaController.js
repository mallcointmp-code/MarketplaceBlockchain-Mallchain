const Wallet = require('../models/Wallet.js');
const WalletTransaction = require('../models/WalletTransaction.js');
const STKOrder = require('../models/STKOrder.js');
const mpesaService = require('../services/mpesaService.js');
const mongoose = require('mongoose');

export async function initiateStk(req, res) {
  try {
    const { userId, phone, amount } = req.body;
    if (!userId || !phone || !amount) return res.status(400).json({ error: 'userId, phone and amount required' });

    const stk = new STKOrder({ userId, phone, amount, status: 'pending' });
    await stk.save();

    const mpRes = await mpesaService.initiateSTK({ phone, amount, accountRef: `Topup-${stk._id}`, txDesc: `Topup ${stk._id}` });
    if (mpRes?.ResponseCode === '0' || mpRes?.responseCode === 0 || mpRes?.ResponseDescription) {
      stk.checkoutRequestID = mpRes.CheckoutRequestID || stk.checkoutRequestID;
      stk.mpesaResponse = mpRes;
      await stk.save();
      return res.json({ ok: true, stkId: stk._id, checkoutRequestID: stk.checkoutRequestID });
    }
    stk.status = 'failed';
    stk.mpesaResponse = mpRes;
    await stk.save();
    return res.status(500).json({ error: 'stk failed', mpRes });
  } catch (err) {
    console.error('initiateStk err', err);
    res.status(500).json({ error: 'initiate error' });
  }
}

export async function stkCallback(req, res) {
  try {
    const body = req.body;
    const callback = body?.Body?.stkCallback || body?.stkCallback || body;
    const checkoutRequestID = callback?.CheckoutRequestID || callback?.Body?.stkCallback?.CheckoutRequestID;
    const resultCode = callback?.ResultCode ?? callback?.Body?.stkCallback?.ResultCode ?? null;
    try { res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' }); } catch (e) { }

    if (!checkoutRequestID) {
      console.warn('stkCallback missing id', body);
      return;
    }

    const stk = await STKOrder.findOne({ checkoutRequestID });
    if (!stk) {
      console.warn('stkCallback unknown CheckoutRequestID', checkoutRequestID);
      return;
    }

    stk.mpesaResponse = callback;
    stk.updatedAt = new Date();

    if (Number(resultCode) === 0) {
      stk.status = 'success';
      let amount = stk.amount;
      try {
        const items = callback?.CallbackMetadata?.Item || callback?.Body?.stkCallback?.CallbackMetadata?.Item || [];
        for (const it of items) if (it?.Name === 'Amount') amount = it?.Value;
      } catch (e) { }

      const { runInTransaction } = require('../utils/transactionHelper.js');
      try {
        await runInTransaction(async (session) => {
          const w = await Wallet.findOneAndUpdate(
            { ownerId: stk.userId },
            { $inc: { mallmoney: amount }, $set: { updatedAt: new Date() } },
            { new: true, upsert: true, session }
          );

          await WalletTransaction.create([{
            walletId: w._id,
            ownerId: stk.userId,
            type: 'deposit',
            amount,
            direction: 'credit',
            reference: checkoutRequestID,
            meta: { source: 'mpesa_stk' }
          }], { session });

          // Emit real-time update
          try {
            const io = req.app.get('io');
            if (io) {
              io.to(`user:${stk.userId}`).emit("wallet:update", {
                userId: stk.userId,
                mallmoney: w.mallmoney,
                mallcoins: w.mallcoins,
                mallpoints: w.mallpoints
              });
            }
          } catch (e) { console.warn('stkCallback socket emit failed', e.message); }
        });
      } catch (err) {
        console.error('stkCallback credit failed', err);
      }
    } else {
      stk.status = 'failed';
    }

    await stk.save();
  } catch (err) {
    console.error('stkCallback outer err', err);
  }
}

export async function b2cResult(req, res) {
  try {
    const body = req.body;
    res.status(200).json({ ok: true });
    console.log('B2C result received', JSON.stringify(body).slice(0, 400));
    // TODO: map ConversationID/transaction to payout records and update statuses
  } catch (err) {
    console.error('b2cResult err', err);
    res.status(500).json({ error: 'err' });
  }
}

export async function b2cTimeout(req, res) {
  res.status(200).json({ ok: true });
  console.warn('B2C timeout callback:', req.body);
}

module.exports = { initiateStk, stkCallback, b2cResult, b2cTimeout };

// CommonJS compatibility
try {
  if (typeof module !== 'undefined' && module.exports) {
    if (typeof exports !== 'undefined' && exports && exports.default) module.exports = exports.default;
    module.exports.default = module.exports;
  }
} catch (e) { }

module.exports = { Wallet, WalletTransaction, STKOrder, mpesaService, mongoose, stk, mpRes, body, callback, checkoutRequestID, resultCode, stk, items, session, w, w, body };