const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/migrationController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/polyline-log', authMiddleware, roleMiddleware('admin'), ctrl.downloadMigrationLog);

module.exports = router;
