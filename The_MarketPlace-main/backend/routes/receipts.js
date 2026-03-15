const express = require('express');
const router = express.Router();
const { createReceiptForOrder, listReceipts, getReceipt } = require('../controllers/receiptController');

router.post('/', createReceiptForOrder);
router.get('/', listReceipts);
router.get('/:id', getReceipt);

module.exports = router;
