const express = require('express');
const DeliveryTask = require('../models/DeliveryTask.js');
const DeliveryAgent = require('../models/DeliveryAgent.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const roleMiddleware = require('../middlewares/roleMiddleware.js');

const router = express.Router();

router.get("/analytics/summary", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
  const total = await DeliveryTask.countDocuments();
  const delivered = await DeliveryTask.countDocuments({ status: "delivered" });
  const pending = await DeliveryTask.countDocuments({ status: { $in: ["unassigned","assigned","accepted","enroute_pickup","picked_up","enroute_dropoff"] }});
  const avgDuration = await DeliveryTask.aggregate([{ $match: { actualDurationSec: { $exists: true } } }, { $group: { _id: null, avgSec: { $avg: "$actualDurationSec" } } }]);
  const activeAgents = await DeliveryAgent.countDocuments({ online: true });
  res.json({ total, delivered, pending, avgDurationSec: avgDuration[0]?.avgSec || null, activeAgents });
});

module.exports = router;

module.exports = { express, DeliveryTask, DeliveryAgent, roleMiddleware, router, total, delivered, pending, avgDuration, activeAgents };