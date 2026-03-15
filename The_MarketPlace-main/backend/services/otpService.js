const redisClient = require('../config/redis.js');
const { sendEmail } = require('./emailService.js');
const Twilio = require('twilio');
const Otp = require('../models/Otp.js');

const OTP_TTL = Number(process.env.OTP_TTL || 300); // seconds
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || null;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || null;
const TWILIO_FROM = process.env.TWILIO_FROM || null;

const SMTP_HOST = process.env.SMTP_HOST || null;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null;
const SMTP_USER = process.env.SMTP_USER || null;
const SMTP_PASS = process.env.SMTP_PASS || null;
const SMTP_FROM = process.env.SMTP_FROM || `no-reply@${process.env.APP_DOMAIN || 'localhost'}`;

let twilioClient = null;
if (TWILIO_SID && TWILIO_TOKEN) {
  try { twilioClient = Twilio(TWILIO_SID, TWILIO_TOKEN); } catch (e) { console.warn('twilio init failed', e && e.message); }
}

// Email helper handled by centralized emailService

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function generateAndSendOtp({ userId, phone, email, method = "sms", purpose = 'withdraw' }) {
  const code = generateCode();
  const key = `otp:${userId}:${code}`;

  // rate-limit using DB fallback or Redis meta
  const RATE_LIMIT_SECONDS = Number(process.env.OTP_RATE_LIMIT_SECONDS || 60);
  try {
    if (redisClient && redisClient.get) {
      // list recent keys for user (not efficient in redis without set structure) - skip; rely on DB when available
    } else {
      // check recent OTP in DB
      const recent = await Otp.findOne({ userId }).sort({ createdAt: -1 }).lean();
      if (recent) {
        const secondsSince = (Date.now() - new Date(recent.createdAt).getTime()) / 1000;
        if (secondsSince < RATE_LIMIT_SECONDS) {
          return { ok: false, rateLimit: true, retryAfter: Math.ceil(RATE_LIMIT_SECONDS - secondsSince) };
        }
      }
    }
  } catch (e) {
    console.warn('otp rate-check failed', e && e.message);
  }

  const text = `Your verification code is ${code}. It expires in ${Math.round(OTP_TTL / 60)} minutes.`;

  // store OTP either in redis or DB
  try {
    if (redisClient && redisClient.set) {
      // redisClient might be v4 (promises) or v3 (callbacks converted). adapting to typical usage.
      // Assuming redisClient.set supports arguments like "EX"
      if (typeof redisClient.set === 'function') {
        await redisClient.set(key, "1", "EX", OTP_TTL);
      }
    } else {
      const expiresAt = new Date(Date.now() + OTP_TTL * 1000);
      const otpDoc = new Otp({ userId, code, purpose, expiresAt });
      await otpDoc.save();
    }
  } catch (e) {
    console.warn('otp store failed', e && e.message);
  }

  if (method === "sms") {
    if (twilioClient && TWILIO_FROM && phone) {
      try {
        await twilioClient.messages.create({ body: text, from: TWILIO_FROM, to: phone });
        return { ok: true, sent: true };
      } catch (e) {
        console.warn('twilio send failed', e && e.message);
      }
    }
    console.log(`OTP (sms) for user ${userId} -> ${phone}: ${code}`);
    return { ok: true, sent: false };
  }

  if (email) {
    try {
      await sendEmail(email, 'Your verification code', `<p>${text}</p>`);
      return { ok: true, sent: true };
    } catch (e) {
      console.warn('email send failed', e && e.message);
    }
  }

  console.log(`OTP (email) for user ${userId} -> ${email}: ${code}`);
  return { ok: true, sent: false };
}

async function verifyOtp({ userId, code }) {
  const key = `otp:${userId}:${code}`;
  try {
    if (redisClient && redisClient.get) {
      const exists = await redisClient.get(key);
      if (!exists) return false;
      await redisClient.del(key);
      return true;
    }
    // fallback to DB
    const otp = await Otp.findOne({ userId, code, used: false });
    if (!otp) return false;
    if (new Date() > new Date(otp.expiresAt)) return false;
    otp.used = true;
    await otp.save();
    return true;
  } catch (e) {
    // console.warn('otp verify failed', e && e.message);
    return false;
  }
}

module.exports = { generateAndSendOtp, verifyOtp };