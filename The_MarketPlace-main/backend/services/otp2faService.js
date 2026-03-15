const Otp = require('../models/Otp.js');
const smsModule = require('./smsService.js');
const { sendEmail } = require('./emailService.js');

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTP(user) {
  const code = generateCode();

  await Otp.create({ userId: user._id, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) });

  if (user.phone) {
    try {
      if (smsModule && smsModule.sendSMS) {
        await smsModule.sendSMS(user.phone, `Your OTP is: ${code}`);
      } else if (smsModule && smsModule.send) {
        await smsModule.send(user.phone, `Your OTP is: ${code}`);
      }
    } catch (e) { console.warn('sms send failed', e && e.message); }
  }

  if (user.email) {
    try {
      await sendEmail(user.email, 'Your Security OTP', `Your OTP is ${code}`);
    } catch (e) { console.warn('email send failed', e && e.message); }
  }

  return true;
}

export async function verifyOTP(userId, code) {
  const otp = await Otp.findOne({ userId, code, verified: false });
  if (!otp) return false;
  if (otp.expiresAt < new Date()) return false;
  otp.verified = true;
  await otp.save();
  return true;
}

module.exports = { sendOTP, verifyOTP };

module.exports = { Otp, smsModule, code, otp };