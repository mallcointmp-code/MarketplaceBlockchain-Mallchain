const express = require('express');
const { createPaymentQr, verifyQrAndPay } = require('../controllers/qrController.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const router = express.Router();

router.post('/create', authMiddleware, createPaymentQr);
router.post('/pay', authMiddleware, verifyQrAndPay);

module.exports = router;
