// backend/routes/delivery.js
const express = require('express');
const ctrl = require("../controllers/deliveryController.js");
const { authMiddleware, optionalAuth } = require('../middlewares/authMiddleware.js');
const roleMiddleware = require('../middlewares/roleMiddleware.js');

const router = express.Router();

router.post("/create", authMiddleware, ctrl.createTask);
router.post("/assign", authMiddleware, ctrl.assignAgent);
router.post("/agent/accept", authMiddleware, roleMiddleware(["agent"]), ctrl.agentAcceptTask);
router.post("/agent/location", authMiddleware, ctrl.updateAgentLocation);
router.post("/pickup", authMiddleware, ctrl.confirmPickup);
router.post("/deliver", authMiddleware, ctrl.confirmDelivery);
router.post('/rate', authMiddleware, ctrl.rateDelivery);
router.get("/task/:taskId", authMiddleware, ctrl.getTaskDetail);
router.get("/seller/tasks", authMiddleware, ctrl.listTasksForSeller);
// Allow optional auth for listing tasks so preview pages can load without a token
router.get("/tasks", optionalAuth, ctrl.listTasks);

module.exports = router;
