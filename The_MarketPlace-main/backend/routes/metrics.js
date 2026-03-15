const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Job = require("../models/JobListing");
const Delivery = require("../models/Delivery");
const FraudReport = require("../models/FraudScore");
const metricsController = require("../controllers/metricsController");

router.get("/", async (req, res) => {
  try {
    const [users, jobs, deliveries, frauds] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      Delivery.countDocuments({ status: { $ne: "delivered" } }),
      FraudReport.countDocuments({ status: "flagged" }),
    ]);
    res.json({
      activeUsers: users,
      openJobs: jobs,
      pendingDeliveries: deliveries,
      fraudFlagged: frauds,
    });
  } catch (err) {
    res.status(500).json({ error: "Metrics error" });
  }
});

// Delivery metrics endpoints
router.get('/delivery/monthly/:agentId?', metricsController.monthlyPerformance);
router.get('/delivery/yearly/:agentId?', metricsController.yearlyIncome);
router.get('/delivery/kpi', metricsController.deliveryKPI);
router.get('/delivery/history/:agentId', metricsController.listAgentHistory);
router.get('/delivery/history/:agentId/export', metricsController.exportHistoryCSV);
router.get('/delivery/task/:taskId', metricsController.getTaskDetail);

module.exports = router;