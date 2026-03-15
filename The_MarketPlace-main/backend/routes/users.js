const express = require("express");
const User = require("../models/User");
const { authMiddleware } = require("../middlewares/authMiddleware");
const adminOnly = require("../middlewares/adminOnly");

const router = express.Router();

// Get all users (admin only)
router.get("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get specific user profile
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @route   PUT /api/users/role
 * @desc    Update user's role (buyer, seller, delivery, creator)
 * @access  Private (requires auth token)
 */
router.put("/role", authMiddleware, async (req, res) => {
  try {
    const { role } = req.body;

    // Validate role
    const validRoles = ['buyer', 'seller', 'delivery', 'creator'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be one of: buyer, seller, delivery, creator"
      });
    }

    const userId = req.user._id;

    // Update user role
    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log(`[USER] Role updated to ${role} for user ${userId}`);

    res.json({
      success: true,
      user,
      message: `Role updated to ${role}`
    });
  } catch (err) {
    console.error('[USER] Role update error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// Update user profile
router.put("/:id", async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
