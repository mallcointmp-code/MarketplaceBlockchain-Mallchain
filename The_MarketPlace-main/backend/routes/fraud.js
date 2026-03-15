// backend/routes/fraud.js
const express = require("express");
const FraudScore = require("../models/FraudScore");
const User = require("../models/User");
const { authMiddleware } = require("../middlewares/authMiddleware");

const router = express.Router();

/**
 * 🔒 Admin-only route to list all fraud reports
 * Optional query: ?riskLevel=high or ?userId=<id>
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.email !== "avastaian36@gmail.com")
      return res.status(403).json({ message: "Unauthorized" });

    const filter = {};
    if (req.query.riskLevel) filter.riskLevel = req.query.riskLevel;
    if (req.query.userId) filter.userId = req.query.userId;

    const reports = await FraudScore.find(filter)
      .populate("userId", "email username lastIp deviceId")
      .sort({ createdAt: -1 });

    res.json({ total: reports.length, reports });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch fraud reports", error: err.message });
  }
});

/**
 * 🚨 Admin mark as reviewed or resolved
 * PATCH /api/fraud/:id
 */
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.email !== "avastaian36@gmail.com")
      return res.status(403).json({ message: "Unauthorized" });

    const updated = await FraudScore.findByIdAndUpdate(
      req.params.id,
      { ...req.body, reviewedAt: new Date() },
      { new: true }
    );
    res.json({ message: "Report updated", updated });
  } catch (err) {
    res.status(500).json({ message: "Failed to update fraud report", error: err.message });
  }
});

/**
 * 🔧 Admin clear all old low-risk logs
 * DELETE /api/fraud/clean
 */
router.delete("/clean", authMiddleware, async (req, res) => {
  try {
    if (req.user.email !== "avastaian36@gmail.com")
      return res.status(403).json({ message: "Unauthorized" });

    const result = await FraudScore.deleteMany({
      riskLevel: "low",
      createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7 days old
    });

    res.json({ message: "Old low-risk logs cleaned", deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: "Cleanup failed", error: err.message });
  }
});

module.exports = router;
