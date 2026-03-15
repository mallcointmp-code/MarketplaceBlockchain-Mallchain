const Otp = require('../models/Otp.js');

module.exports = async function requireVerifiedOtp(req, res, next) {
  try {
    const userId = req.user._id || req.user.userId;
    const record = await Otp.findOne({ userId, verified: true }).sort({ expiresAt: -1 });
    if (!record) return res.status(403).json({ error: "OTP verification required" });
    return next();
  } catch (err) {
    console.error('requireVerifiedOtp err', err);
    return res.status(500).json({ error: 'internal' });
  }
}

module.exports = { Otp, userId, record };