const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const Wallet = require('../models/Wallet.js');
const WalletTransaction = require('../models/WalletTransaction.js');

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/marketplace';
console.log('Connecting to mongo', MONGO);
await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });

const ownerId = process.env.MPESA_TEST_USER_ID || new mongoose.Types.ObjectId();
let wallet = await Wallet.findOne({ ownerId });
if (!wallet) {
  wallet = await Wallet.create({ ownerId, mallmoney: 0, reserved: 0 });
  console.log('Created wallet for', ownerId.toString());
} else {
  console.log('Using existing wallet', wallet._id.toString());
}

const CHECKOUT = 'CHK123';
const AMOUNT = 100;

await WalletTransaction.create({ ownerId, type: 'deposit', amount: AMOUNT, reference: CHECKOUT, status: 'pending' });
console.log('Inserted pending WalletTransaction with reference', CHECKOUT);

const body = {
  Body: {
    stkCallback: {
      MerchantRequestID: 'MREQ123',
      CheckoutRequestID: CHECKOUT,
      ResultCode: 0,
      ResultDesc: 'The service request is processed successfully.',
      CallbackMetadata: {
        Item: [
          { Name: 'Amount', Value: AMOUNT },
          { Name: 'MpesaReceiptNumber', Value: 'ABC123XYZ' },
          { Name: 'TransactionDate', Value: Number(new Date().toISOString().replace(/[^0-9]/g, '').slice(0,14)) },
          { Name: 'PhoneNumber', Value: '254712345678' }
        ]
      }
    }
  }
};

const CALLBACK_URL = process.env.MPESA_CALLBACK_POST_URL || 'http://localhost:5000/api/mpesa/stk-callback';
console.log('Posting callback to', CALLBACK_URL);
try {
  const r = await axios.post(CALLBACK_URL, body, { headers: { 'Content-Type': 'application/json' } });
  console.log('Callback POST response status', r.status, r.data);
} catch (err) {
  console.error('Callback POST failed', err && err.response ? err.response.data : err && err.message);
}

process.exit(0);

module.exports = { mongoose, axios, dotenv, Wallet, WalletTransaction, MONGO, ownerId, CHECKOUT, AMOUNT, body, CALLBACK_URL, r };