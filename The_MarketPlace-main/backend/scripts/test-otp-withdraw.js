const dotenv = require('dotenv');
const connectDB = require('../config/db.js');
const axios = require('axios');
const User = require('../models/User.js');
const Wallet = require('../models/Wallet.js');
const WalletTransaction = require('../models/WalletTransaction.js');

dotenv.config();

async function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function main(){
  const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/the_market_place_test';
  await connectDB(MONGO);

  const email = process.env.TEST_USER_EMAIL || 'testuser@example.com';
  const user = await User.findOne({ email });
  if (!user) { console.error('Test user not found. Run create-test-user.mjs first or set TEST_USER_EMAIL.'); process.exit(1); }

  // ensure wallet exists and seed balance
  let wallet = await Wallet.findOne({ ownerId: user._id });
  if (!wallet) { wallet = new Wallet({ ownerId: user._id, mallmoney: 5000 }); await wallet.save(); }
  else { wallet.mallmoney = Math.max(wallet.mallmoney, 5000); await wallet.save(); }
  console.log('Wallet ready:', wallet._id.toString(), 'balance=', wallet.mallmoney);

  // Prepare axios instance with auth header: use simple x-user-id header if your auth middleware supports it
  const api = axios.create({ baseURL: process.env.TEST_API_BASE || 'http://localhost:3000', timeout: 10000, headers: { 'x-user-id': String(user._id) } });

  // Trigger withdraw that requires OTP (set LARGE threshold low via env or request large amount)
  const amount = Number(process.env.TEST_WITHDRAW_AMOUNT || 3000);
  console.log('Requesting withdraw for', amount);
  try {
    const r = await api.post('/api/wallet/withdraw', { amount, pin: process.env.TEST_WITHDRAW_PIN || '0000', phone: user.phone });
    console.log('Withdraw response:', r.data);
    if (r.data.next === 'verify_otp' || r.data.needOtp || r.data.next === 'verify_otp') {
      console.log('OTP requested. Searching in DB for OTP...');
      // wait shortly for OTP to be saved
      await wait(1000);
      // Find OTP in db
      const otpDoc = await (await import('../models/Otp.js')).default.findOne({ userId: user._id }).sort({ createdAt: -1 }).lean();
      if (!otpDoc) { console.error('No OTP doc found in DB. If you use Redis, check redis keys manually.'); process.exit(1); }
      console.log('Found OTP:', otpDoc.code);
      // Verify
      const v = await api.post('/api/wallet/withdraw/verify', { code: otpDoc.code });
      console.log('Verify response:', v.data);
    } else {
      console.log('Withdraw was immediate:', r.data);
    }
  } catch (err) {
    if (err.response) console.error('API error', err.response.status, err.response.data);
    else console.error('Request error', err.message);
  }
  process.exit(0);
}

main();

module.exports = { dotenv, connectDB, axios, User, Wallet, WalletTransaction, MONGO, email, user, api, amount, r, otpDoc, v };