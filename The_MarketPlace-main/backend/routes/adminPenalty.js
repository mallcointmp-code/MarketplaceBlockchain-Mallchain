const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/penaltyController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// admin-only endpoints
router.post('/penalty', authMiddleware, roleMiddleware('admin'), ctrl.createPenalty);
router.get('/penalties', authMiddleware, roleMiddleware('admin'), ctrl.listPenalties);

module.exports = router;
