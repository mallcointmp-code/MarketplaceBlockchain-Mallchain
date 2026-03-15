const express = require("express");
const Notification = require("../models/Notification");
const { authMiddleware } = require("../middlewares/authMiddleware");

const router = express.Router();

/**
 * @route   GET /api/notification
 * @desc    Get all notifications (Admin only)
 * @access  Private/Admin
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json({ success: true, total: notifications.length, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch notifications", error: err.message });
  }
});

/**
 * @route   GET /api/notification/my
 * @desc    Get notifications for the logged-in user
 * @access  Private
 */
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({
      $or: [{ userId: userId }, { user: userId }, { userId: null }, { user: null }],
    }).sort({ createdAt: -1 });
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch notifications", error: err.message });
  }
});

/**
 * @route   PATCH /api/notification/:id/read
 * @desc    Mark a single notification as read
 * @access  Private
 */
router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, $or: [{ userId: userId }, { user: userId }] },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found or not yours" });
    }

    res.json({ success: true, message: "Notification marked read", notification });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update failed", error: err.message });
  }
});

/**
 * @route   PUT /api/notification/mark-all-read
 * @desc    Mark all notifications as read for the logged-in user
 * @access  Private
 */
router.put("/mark-all-read", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    await Notification.updateMany(
      { $or: [{ userId: userId }, { user: userId }], read: false },
      { read: true }
    );
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to mark all read", error: err.message });
  }
});

/**
 * @route   DELETE /api/notification/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      $or: [{ userId: userId }, { user: userId }],
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Notification not found or not yours" });
    }

    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete failed", error: err.message });
  }
});

module.exports = router;

module.exports = router;
