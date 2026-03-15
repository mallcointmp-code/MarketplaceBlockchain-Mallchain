// backend/routes/adminAudit.js (CommonJS)
const express = require('express');
const { listTransactions } = require('../controllers/auditController.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const roleMiddleware = require('../middlewares/roleMiddleware.js');

const router = express.Router();

router.get('/transactions', authMiddleware, roleMiddleware('admin'), listTransactions);

module.exports = router;
