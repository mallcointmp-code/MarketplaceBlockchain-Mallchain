const express = require('express');
const router = express.Router();
const sendCtrl = require('../controllers/sendController');

// Send mallcoins from one wallet to another
router.post('/mallcoins', sendCtrl.sendMallcoins);

// Pay for something using mallcoins
router.post('/payment', sendCtrl.processPayment);

// Get transaction status
router.get('/status/:txHash', sendCtrl.getTransactionStatus);

// Get account metadata (account number / sequence) for signing
router.get('/account/:address', sendCtrl.getAccountInfo);

module.exports = router;
