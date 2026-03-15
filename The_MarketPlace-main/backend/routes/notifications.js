const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const Notification = require("../models/Notification");
const User = require("../models/User");

// Get all notifications for user
router.get("/", authMiddleware, async (req, res) => {
  const notifications = await Notification.find({ user: req.user.userId, archived: false }).sort({ createdAt: -1 });
  res.json({ success: true, notifications });
});

// Mark notification as read
router.post("/read/:id", authMiddleware, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ success: true });
});

// Archive notification
router.post("/archive/:id", authMiddleware, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { archived: true });
  res.json({ success: true });
});

// Delete notification
router.delete("/:id", authMiddleware, async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Set notification preferences (example)
router.post("/preferences", authMiddleware, async (req, res) => {
  // Save preferences in user profile or a separate model
  // req.body: { email: true, push: false, sms: false }
  // ...save logic...
  res.json({ success: true, message: "Preferences updated" });
});

// Bulk notification (admin only)
router.post("/broadcast", authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ success: false, error: "Admin only" });
  const users = await User.find({}, "_id");
  const notifications = [];
  for (const u of users) {
    notifications.push({
      user: u._id,
      type: req.body.type || "announcement",
      category: req.body.category || "system",
      message: req.body.message,
      details: req.body.details || {},
      priority: req.body.priority || "normal"
    });
  }
  await Notification.insertMany(notifications);
  res.json({ success: true, count: notifications.length });
});

// Unread count endpoint
router.get("/unread-count", authMiddleware, async (req, res) => {
  const count = await Notification.countDocuments({ user: req.user.userId, read: false, archived: false });
  res.json({ success: true, unread: count });
});

// Update notification settings
router.post("/settings", authMiddleware, async (req, res) => {
  await User.findByIdAndUpdate(req.user.userId, { notificationSettings: req.body });
  res.json({ success: true, message: "Settings updated" });
});

module.exports = router;