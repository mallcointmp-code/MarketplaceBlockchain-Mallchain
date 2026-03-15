import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import redisClient from '../config/redis.js';
import { generateAndSendOtp, verifyOtp } from '../services/otpService.js';
import Otp from '../models/Otp.js';

dotenv.config();

async function main() {
  const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/the_market_place_test';
  await connectDB(MONGO);
  const testUser = process.env.TEST_USER_ID || null;
  if (!testUser) {
    console.error('Set TEST_USER_ID env to a valid user id to run test');
    process.exit(1);
  }

  console.log('Generating OTP...');
  const phone = process.env.TEST_USER_PHONE || '+254700000000';
  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const r = await generateAndSendOtp({ userId: testUser, phone, email, method: 'sms' });
  console.log('generateAndSendOtp result:', r);

  // try to fetch code from redis keys (scan) or DB
  if (redisClient && redisClient.keys) {
    try {
      const keys = await redisClient.keys(`otp:${testUser}:*`);
      if (keys && keys.length) {
        console.log('Found redis otp keys:', keys);
        const code = keys[0].split(':').pop();
        console.log('Using code from redis:', code);
        const v = await verifyOtp({ userId: testUser, code });
        console.log('verifyOtp result:', v);
        process.exit(0);
      }
    } catch (e) { console.warn('redis check failed', e && e.message); }
  }

  // fallback to DB
  const otpDoc = await Otp.findOne({ userId: testUser }).sort({ createdAt: -1 }).lean();
  if (!otpDoc) {
    console.error('No OTP found in DB');
    process.exit(2);
  }
  console.log('Found OTP in DB:', otpDoc.code);
  const v = await verifyOtp({ userId: testUser, code: otpDoc.code });
  console.log('verifyOtp result:', v);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(3); });
