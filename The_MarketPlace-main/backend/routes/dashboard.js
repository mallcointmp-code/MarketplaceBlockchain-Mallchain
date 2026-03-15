// backend/routes/dashboard.js
const express = require("express");
const Notification = require("../models/Notification");
const FraudScore = require("../models/FraudScore");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

/**
 * 🧭 Admin dashboard overview
 * Returns counts and highlights
 */
router.get("/overview", authMiddleware, async (req, res) => {
  try {
    if (req.user.email !== "avastaian36@gmail.com")
      return res.status(403).json({ message: "Unauthorized" });

    // Unread notifications
    const unreadCount = await Notification.countDocuments({ read: false });

    // Latest 5 notifications
    const recent = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title message type createdAt");

    // Fraud summary
    const highRiskCount = await FraudScore.countDocuments({
      riskLevel: { $in: ["high", "critical"] },
    });

    const latestFraud = await FraudScore.find({ riskLevel: { $in: ["high", "critical"] } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "email username lastIp deviceId")
      .select("riskLevel issues createdAt");

    res.json({
      overview: {
        unreadNotifications: unreadCount,
        highRiskAlerts: highRiskCount,
        recentNotifications: recent,
        recentFraudAlerts: latestFraud,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch dashboard overview", error: err.message });
  }
});

module.exports = router;
