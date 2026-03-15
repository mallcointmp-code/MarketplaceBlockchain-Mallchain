const express = require('express');
const { reserve } = require('../controllers/adWalletController.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const router = express.Router();
router.post("/:adId/reserve", authMiddleware, reserve);
module.exports = router;

module.exports = { express, router };