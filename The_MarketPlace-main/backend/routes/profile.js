const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const User = require('../models/User.js');
const multer = require('multer');

const router = express.Router();
const fs = require('fs');
const path = require('path');

// Ensure uploads/avatars directory exists
const uploadDir = path.join(process.cwd(), 'uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup for avatar upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/avatars"),
  filename: (req, file, cb) => cb(null, `${req.user.userId}_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// Update profile (with avatar and social links)
router.put("/", authMiddleware, upload.single("avatar"), async (req, res) => {
  console.log('[PROFILE] Update request body:', req.body);
  if (req.file) console.log('[PROFILE] Avatar file received:', req.file.filename);
  try {
    const allowedFields = ["username", "email", "phone", "bio", "countryCode", "idNumber", "notificationSettings", "whatsappNumber", "socialLinks", "preferences"];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (req.file) {
      updates.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    console.log('[PROFILE] Updating user:', req.user._id);
    console.log('[PROFILE] Updates:', JSON.stringify(updates, null, 2));

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');

    console.log('[PROFILE] Update successful for user:', user.username);

    res.json({ success: true, user });
  } catch (error) {
    console.error('[PROFILE] Update error:', error);
    res.status(500).json({ success: false, error: 'Internal server error', detail: error.message });
  }
});

// View profile
router.get("/", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.json({ success: true, user });
});

// Delete account
router.delete("/", authMiddleware, async (req, res) => {
  await User.findByIdAndDelete(req.user._id);
  // Optionally, delete related data
  res.json({ success: true, message: "Your account and data have been deleted." });
});

// Update last known location for the authenticated user
router.put('/location', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, accuracy } = req.body;
    if (lat == null || lng == null) return res.status(400).json({ success: false, error: 'lat and lng required' });
    const loc = { lat: Number(lat), lng: Number(lng), accuracy: accuracy ? Number(accuracy) : undefined, updatedAt: new Date() };
    const user = await User.findByIdAndUpdate(req.user._id, { lastLocation: loc }, { new: true }).select('-password');

    // Broadcast via socket for live features (admin/delivery rooms + user-specific)
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${req.user.userId}`).emit('location:update', { userId: req.user.userId, location: loc });
        io.to('admin:delivery').emit('location:update', { userId: req.user.userId, location: loc });
      }
    } catch (e) {
      console.warn('socket broadcast failed', e?.message || e);
    }

    return res.json({ success: true, user });
  } catch (err) {
    console.error('update location err', err);
    return res.status(500).json({ success: false, error: 'failed to update location' });
  }
});

module.exports = router;