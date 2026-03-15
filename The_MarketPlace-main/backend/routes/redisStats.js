const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/redisStatsController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/scan', authMiddleware, roleMiddleware('admin'), ctrl.scanKeys);

module.exports = router;
