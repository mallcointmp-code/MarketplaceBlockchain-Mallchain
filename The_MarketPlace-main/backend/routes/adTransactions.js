const express = require('express');
const txCtrl = require('../controllers/adTransactionController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();
router.get('/', authMiddleware, roleMiddleware('admin'), txCtrl.listAdTransactions);
router.post('/complete', authMiddleware, roleMiddleware('admin'), txCtrl.completeAdController);
router.post('/refund', authMiddleware, roleMiddleware('admin'), txCtrl.refundAdController);
module.exports = router;
