// backend/routes/sellerAnalyticsRoutes.js
const express = require('express');
const ctrl = require('../controllers/sellerAnalyticsController.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');

const router = express.Router();

router.get("/ad/:adId/series", authMiddleware, ctrl.adTimeSeries);
router.get("/ad/:adId/summary", authMiddleware, ctrl.adSummary);

module.exports = router;
