const express = require('express');
const { requestOTP, verifyOtpController, generateOtp, verifyOtp, sendWithdrawOtp, verifyWithdrawOtp } = require('../controllers/otpController.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');

const router = express.Router();

// Generic generate/verify (admin or test usage)
router.post('/generate', generateOtp);
router.post('/verify', verifyOtp);

// Endpoints for authenticated flow
router.post('/request', authMiddleware, requestOTP);
router.post('/verify-auth', authMiddleware, verifyOtpController);

// Withdraw-specific OTPs
router.post('/withdraw/send', authMiddleware, sendWithdrawOtp);
router.post('/withdraw/verify', authMiddleware, verifyWithdrawOtp);

module.exports = router;

module.exports = { express, router };