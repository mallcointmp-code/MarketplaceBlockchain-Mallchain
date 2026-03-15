const mongoose = require('mongoose');
const axios = require('axios');
const User = require('../models/User.js');
const Wallet = require('../models/Wallet.js');
const STKOrder = require('../models/STKOrder.js');
const WalletTransaction = require('../models/WalletTransaction.js');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/marketplace';
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || process.env.MPESA_URL || 'http://localhost:5000/api/mpesa/stk-callback';

async function run() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to mongo');

  let user = await User.findOne({ email: 'mpesa-test@example.com' });
  if (!user) {
    user = await User.create({ email: 'mpesa-test@example.com', phone: '254700000000', fullName: 'MPESA Test', countryCode: 'KE', password: 'x', referralCode: 'testref' + Date.now() });
    console.log('Created user', user._id);
  } else console.log('Found user', user._id);

  let wallet = await Wallet.findOne({ ownerId: user._id });
  if (!wallet) {
    wallet = await Wallet.create({ ownerId: user._id, mallmoney: 0 });
    console.log('Created wallet', wallet._id);
  } else console.log('Found wallet', wallet._id, 'balance', wallet.mallmoney);

  const checkoutId = 'TESTCHK' + Date.now();
  const amount = 150;
  const phone = user.phone;

  const stk = await STKOrder.create({ userId: user._id, phone, amount, checkoutRequestID: checkoutId, status: 'pending' });
  console.log('Created STKOrder', stk._id, checkoutId);

  const callback = {
    Body: {
      stkCallback: {
        MerchantRequestID: '12345',
        CheckoutRequestID: checkoutId,
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: amount },
            { Name: 'MpesaReceiptNumber', Value: 'ABC123XYZ' },
            { Name: 'TransactionDate', Value: Number(Date.now()) },
            { Name: 'PhoneNumber', Value: phone }
          ]
        }
      }
    }
  };

  console.log('Posting simulated callback to', MPESA_CALLBACK_URL);
  try {
    const res = await axios.post(MPESA_CALLBACK_URL, callback, { headers: { 'Content-Type': 'application/json' } });
    console.log('Callback POST response:', res.status, res.data);
  } catch (err) {
    console.error('Callback POST error', err?.response?.status, err?.response?.data || err?.message);
    console.log('Falling back to local processing of callback (server unreachable).');
    // local processing: emulate server callback handler transactionally
    try {
      const checkoutRequestID = callback.Body.stkCallback.CheckoutRequestID;
      const resultCode = callback.Body.stkCallback.ResultCode;
      const items = callback.Body.stkCallback.CallbackMetadata?.Item || [];
      let amountParsed = amount;
      for (const it of items) {
        if (it.Name === 'Amount') amountParsed = it.Value;
      }

      if (Number(resultCode) === 0) {
        console.log('Processing local credit for', checkoutRequestID, amountParsed);
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const stkDoc = await STKOrder.findOne({ checkoutRequestID }).session(session);
          if (!stkDoc) throw new Error('STKOrder not found locally');
          stkDoc.mpesaResponse = callback;
          stkDoc.status = 'success';
          stkDoc.updatedAt = new Date();
          await stkDoc.save({ session });

          const w = await Wallet.findOneAndUpdate({ ownerId: stkDoc.userId }, { $inc: { mallmoney: amountParsed }, $set: { updatedAt: new Date() } }, { new: true, upsert: true, session });

          await WalletTransaction.create([{ walletId: w._id, ownerId: stkDoc.userId, type: 'deposit', amount: amountParsed, direction: 'credit', reference: checkoutRequestID, meta: { source: 'mpesa_stk' } }], { session });

          await session.commitTransaction();
          console.log('Local credit applied. New balance:', w.mallmoney);
        } catch (le) {
          await session.abortTransaction();
          console.error('Local transaction failed', le);
          // fallback for single-node Mongo (no replica set): apply non-transactional update
          if (le && le.code === 20) {
            try {
              console.log('Falling back to non-transactional update (single-node Mongo).');
              const stkDoc2 = await STKOrder.findOne({ checkoutRequestID });
              stkDoc2.mpesaResponse = callback;
              stkDoc2.status = 'success';
              stkDoc2.updatedAt = new Date();
              await stkDoc2.save();

              const w2 = await Wallet.findOneAndUpdate({ ownerId: stkDoc2.userId }, { $inc: { mallmoney: amountParsed }, $set: { updatedAt: new Date() } }, { new: true, upsert: true });
              await WalletTransaction.create({ walletId: w2._id, ownerId: stkDoc2.userId, type: 'deposit', amount: amountParsed, direction: 'credit', reference: checkoutRequestID, meta: { source: 'mpesa_stk', fallback: true } });
              console.log('Fallback credit applied. New balance:', w2.mallmoney);
            } catch (fe) {
              console.error('Fallback non-transactional processing failed', fe);
            }
          }
        } finally {
          session.endSession();
        }
      } else {
        console.log('ResultCode not success, marking STKOrder failed');
        await STKOrder.findOneAndUpdate({ checkoutRequestID }, { status: 'failed', mpesaResponse: callback, updatedAt: new Date() });
      }
    } catch (procErr) {
      console.error('Local processing failed', procErr);
    }
  }

  // wait a moment for server to process
  await new Promise(r => setTimeout(r, 1500));

  const w2 = await Wallet.findOne({ ownerId: user._id });
  console.log('Wallet after callback:', w2 && w2.mallmoney);

  const txs = await WalletTransaction.find({ ownerId: user._id }).sort({ createdAt: -1 }).limit(5).lean();
  console.log('Recent WalletTxs:', txs);

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(e => { console.error(e); process.exit(1); });

module.exports = { mongoose, axios, User, Wallet, STKOrder, WalletTransaction, MONGO_URI, MPESA_CALLBACK_URL, checkoutId, amount, phone, stk, callback, res, checkoutRequestID, resultCode, items, session, stkDoc, w, stkDoc2, w2, w2, txs };