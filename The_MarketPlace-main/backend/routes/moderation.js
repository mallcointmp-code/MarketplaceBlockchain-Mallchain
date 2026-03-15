const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const adminOnly = require("../middlewares/adminOnly");
const Feed = require("../models/Feed");
const Report = require("../models/Report");
const User = require("../models/User");

// Report a feed post or comment or user
router.post("/report", authMiddleware, async (req, res) => {
  const { targetType, targetId, reason } = req.body;
  const report = await Report.create({
    reporter: req.user.userId,
    targetType,
    targetId,
    reason
  });
  res.json({ success: true, message: "Report submitted", report });
});

// Admin: view reports
router.get("/reports", adminOnly, async (req, res) => {
  const reports = await Report.find().sort({ createdAt: -1 }).limit(100).populate("reporter", "username");
  res.json({ success: true, reports });
});

// Admin: resolve report
router.post("/report/:id/resolve", adminOnly, async (req, res) => {
  const report = await Report.findByIdAndUpdate(req.params.id, { status: "resolved" }, { new: true });
  res.json({ success: true, report });
});

// Admin: analytics - top reported users/posts/comments
router.get("/analytics/reports", adminOnly, async (req, res) => {
  const topReportedUsers = await Report.aggregate([
    { $match: { targetType: "user" } },
    { $group: { _id: "$targetId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  const topReportedPosts = await Report.aggregate([
    { $match: { targetType: "feed" } },
    { $group: { _id: "$targetId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  res.json({ success: true, topReportedUsers, topReportedPosts });
});

// Admin: ban user
router.post("/ban-user/:id", adminOnly, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { banned: true });
  res.json({ success: true, message: "User banned" });
});

module.exports = router;