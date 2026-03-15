// routes/2fa.js (CommonJS)
const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware.js');
const { requestOtp, confirmOtp } = require('../controllers/2faController.js');

const router = express.Router();

router.post('/request', authMiddleware, requestOtp);
router.post('/verify', authMiddleware, confirmOtp);

module.exports = router;
