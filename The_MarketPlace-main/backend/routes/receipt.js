const express = require('express');
const { downloadReceipt } = require('../controllers/receiptController.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const router = express.Router();

router.get('/tx/:txId', authMiddleware, downloadReceipt);

module.exports = router;

module.exports = { express, authMiddleware, router };