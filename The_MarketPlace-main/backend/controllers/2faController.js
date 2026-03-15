const { sendOTP, verifyOTP } = require('../services/otp2faService.js');
const User = require('../models/User.js');

const requestOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await sendOTP(user);
    res.json({ success: true, message: "OTP sent to phone & email" });
  } catch (err) {
    console.error('requestOtp err', err);
    res.status(500).json({ error: "Could not send OTP" });
  }
};

const confirmOtp = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { code } = req.body;
    const ok = await verifyOTP(userId, code);
    if (!ok) return res.status(400).json({ error: "Invalid or expired OTP" });
    res.json({ success: true, message: "OTP Verified" });
  } catch (err) {
    console.error('confirmOtp err', err);
    res.status(500).json({ error: "OTP verify failed" });
  }
};

module.exports = { requestOtp, confirmOtp };

// CommonJS compatibility
try {
  if (typeof module !== 'undefined' && module.exports) {
    if (typeof exports !== 'undefined' && exports && exports.default) module.exports = exports.default;
    module.exports.default = module.exports;
  }
} catch (e) {}

module.exports = { User, requestOtp, user, confirmOtp, userId, ok };