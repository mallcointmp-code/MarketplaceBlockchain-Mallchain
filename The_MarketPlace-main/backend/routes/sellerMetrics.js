const express = require('express');
const ctrl = require('../controllers/sellerMetricsController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.get('/overview', authMiddleware, ctrl.overview);
router.get('/sales', authMiddleware, ctrl.salesChart);
router.get('/kpis', authMiddleware, ctrl.kpis);
router.get('/reviews', authMiddleware, ctrl.reviewsSummary);
router.get('/recent', authMiddleware, ctrl.recentActivity);
module.exports = router;
