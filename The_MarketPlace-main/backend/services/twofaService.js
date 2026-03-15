const TwoFA = require('../models/TwoFA.js');
const { sendSms } = require('./smsService.js');
const { sendEmail } = require('./emailService.js');

export async function createOTP({ userId, phone, email, purpose = "withdraw", amount = 0, ttlSec = 300 }) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + ttlSec * 1000);
  const doc = await TwoFA.create({ userId, code, purpose, amount, expiresAt });
  if (phone) await sendSms(phone, `Your OTP is ${code}. Expires in ${Math.floor(ttlSec/60)} minutes.`);
  if (email) await sendEmail(email, "Your OTP", `<p>Your OTP is <b>${code}</b></p>`);
  return doc;
}

export async function verifyOTP({ userId, code, purpose = "withdraw" }) {
  const doc = await TwoFA.findOne({ userId, code, purpose, used: false }).sort({ createdAt: -1 });
  if (!doc) return { ok: false, reason: "not_found" };
  if (doc.expiresAt < new Date()) return { ok: false, reason: "expired" };
  doc.used = true;
  await doc.save();
  return { ok: true };
}

module.exports = { TwoFA, code, expiresAt, doc, doc };