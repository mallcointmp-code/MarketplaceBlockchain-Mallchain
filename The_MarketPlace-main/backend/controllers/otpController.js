const redisClient = require('../config/redis.js');
const { generateOtp as generateOtpService, verifyOtp as verifyOtpService, generateAndSendOtp } = require('../services/otpService.js');
const smsService = require('../services/smsService.js');
const emailService = require('../services/emailService.js');
const User = require('../models/User.js');

const { sendSms } = smsService || {};
const { sendEmail } = emailService || {};

const OTP_TTL = Number(process.env.OTP_TTL || 300);

export async function generateOtp(req, res) {
  try {
    const { userId, phone, email, via = 'sms' } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const key = `otp:${userId}`;
    if (redisClient && redisClient.set) await redisClient.set(key, code, 'EX', OTP_TTL);
    else global._otpFallback = global._otpFallback || {}, global._otpFallback[key] = { code, expiresAt: Date.now() + OTP_TTL * 1000 };

    if (via === 'sms' && phone) await sendSms(phone, `Your MarketPlace verification code is ${code}`);
    else if (via === 'email' && email) await sendEmail(email, 'Your verification code', `Code: ${code}`, `<p>Code: <b>${code}</b></p>`);
    else console.log('OTP generated for', userId, code);

    return res.json({ ok: true, ttl: OTP_TTL });
  } catch (err) {
    console.error('generateOtp err', err);
    res.status(500).json({ error: 'failed' });
  }
}

export async function verifyOtp(req, res) {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: 'missing' });
    const key = `otp:${userId}`;
    let stored = null;
    if (redisClient && redisClient.get) stored = await redisClient.get(key);
    else {
      const f = global._otpFallback && global._otpFallback[key];
      if (f && f.expiresAt > Date.now()) stored = f.code;
    }
    if (!stored) return res.status(400).json({ ok: false, error: 'no otp or expired' });
    if (String(stored) !== String(code)) return res.status(400).json({ ok: false, error: 'invalid' });
    if (redisClient && redisClient.del) await redisClient.del(key);
    else delete global._otpFallback[key];
    return res.json({ ok: true });
  } catch (err) {
    console.error('verifyOtp err', err);
    res.status(500).json({ error: 'failed' });
  }
}

const sendWithdrawOtp = async (req, res) => {
  try {
    const userId = String(req.user._id);
    const phone = req.user.phone;
    const email = req.user.email;
    const { amount } = req.body;

    const { code } = await generateOtpService({ keyPrefix: "withdraw_otp", identifier: userId, ttlSec: 300 });

    if (phone && smsService && smsService.sendSms) {
      try { await smsService.sendSms({ to: phone, message: `Your withdrawal OTP is ${code}. Expires in 5 minutes.` }); } catch (e) { console.warn('sms send failed', e && e.message); }
    }
    if (email && emailService && emailService.sendEmail) {
      try { await emailService.sendEmail({ to: email, subject: 'Withdrawal OTP', text: `Your OTP: ${code}` }); } catch (e) { console.warn('email send failed', e && e.message); }
    }

    // also return small hint for dev/testing (do not in production)
    res.json({ ok: true, note: 'otp_sent' });
  } catch (err) {
    console.error('sendWithdrawOtp err', err);
    res.status(500).json({ error: 'failed to send otp' });
  }
};

const verifyWithdrawOtp = async (req, res) => {
  try {
    const userId = String(req.user._id);
    const { code } = req.body;
    const ok = await verifyOtpService({ keyPrefix: 'withdraw_otp', identifier: userId, code });
    if (!ok) return res.status(400).json({ error: 'invalid_otp' });
    res.json({ ok: true });
  } catch (err) {
    console.error('verifyWithdrawOtp err', err);
    res.status(500).json({ error: 'failed' });
  }
};

const requestOTP = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const via = req.body.via || (user.phone ? "sms" : "email");
    const r = await generateAndSendOtp({ userId: String(userId), phone: user.phone, email: user.email, method: via, purpose: req.body.purpose || '2fa' });
    if (!r || !r.ok) return res.status(500).json({ error: "Failed to send OTP", detail: r });
    return res.json({ ok: true, message: "OTP sent" });
  } catch (err) {
    console.error("requestOTP err", err);
    return res.status(500).json({ error: "request otp failed" });
  }
};

const verifyOtpController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Code required" });

    const ok = await verifyOtpService({ userId: String(userId), code });
    if (!ok) return res.status(400).json({ error: "invalid_or_expired" });

    // set short-lived 2FA allow flag in redis (5 minutes)
    try {
      if (redisClient && redisClient.set) await redisClient.set(`2fa:${String(userId)}`, "1", "EX", Number(process.env.TWOFA_WINDOW || 300));
    } catch (e) { console.warn('failed setting 2fa redis flag', e && e.message); }

    return res.json({ ok: true, message: "OTP verified" });
  } catch (err) {
    console.error("verifyOtpController err", err);
    return res.status(500).json({ error: "verify failed" });
  }
};

module.exports = { generateOtp, verifyOtp, sendWithdrawOtp, verifyWithdrawOtp, requestOTP, verifyOtpController };

// CommonJS compatibility
try {
  if (typeof module !== 'undefined' && module.exports) {
    if (typeof exports !== 'undefined' && exports && exports.default) module.exports = exports.default;
    module.exports.default = module.exports;
  }
} catch (e) {}

module.exports = { redisClient, smsService, emailService, User, OTP_TTL, code, key, key, f, sendWithdrawOtp, userId, phone, email, verifyWithdrawOtp, userId, ok, requestOTP, userId, user, via, r, verifyOtpController, userId, ok };