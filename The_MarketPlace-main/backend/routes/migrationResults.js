const express = require('express');
const ctrl = require('../controllers/migrationResultsController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('admin'), ctrl.listMigrationResults);
router.post('/retry/:taskId', authMiddleware, roleMiddleware('admin'), ctrl.retryTaskMigration);

module.exports = router;
