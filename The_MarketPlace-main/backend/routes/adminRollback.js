const express = require('express');
const { rollback } = require('../controllers/adminRollbackController.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const roleMiddleware = require('../middlewares/roleMiddleware.js');
const router = express.Router();
router.post("/ads/rollback", authMiddleware, roleMiddleware("admin"), rollback);
module.exports = router;

module.exports = { express, roleMiddleware, router };