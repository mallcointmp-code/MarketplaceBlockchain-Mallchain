// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const DeliveryAgent = require('../models/DeliveryAgent.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const Joi = require('joi');
const { OAuth2Client } = require('google-auth-library');

const RefreshToken = require('../models/RefreshToken.js');
const crypto = require('crypto');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService.js');

const router = express.Router();
const monitoring = require('../utils/monitoring.js');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(userId) {
  return jwt.sign({ _id: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await RefreshToken.create({ userId, token, expiresAt });
  return token;
}

const signupSchema = Joi.object({
  name: Joi.string().min(3).max(80).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().min(6).max(20).required(),
  gender: Joi.string().valid('female', 'male', 'non-binary', 'prefer-not-to-say').optional(),
  country: Joi.string().max(80).allow('').optional(),
  city: Joi.string().max(80).allow('').optional(),
  age: Joi.number().integer().min(0).max(120).optional(),
  dateOfBirth: Joi.string().isoDate().optional(),
  role: Joi.string().valid('buyer', 'seller', 'creator', 'delivery', 'admin').optional(),
  countryCode: Joi.string().length(2).optional()
}).unknown(true);

// Check username availability
router.get('/check-username', async function (req, res) {
  try {
    const { username } = req.query;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ available: false, message: 'Username is required' });
    }
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9]{3,30}$/.test(clean)) {
      return res.status(400).json({ available: false, message: 'Username must be 3-30 alphanumeric characters' });
    }
    const existing = await User.findOne({ username: clean });
    return res.json({ available: !existing, message: existing ? 'Username taken' : 'Available' });
  } catch (err) {
    console.error('[AUTH] check-username error:', err);
    res.status(500).json({ available: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", async function (req, res) {
  console.log('[AUTH] Register request received:', { ...req.body, password: '***' });

  const { error } = signupSchema.validate(req.body);
  if (error) {
    console.warn('[AUTH] Register validation failed:', error.details[0].message);
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  try {
    const { name, username, email, phone, password, role } = req.body;

    // Strict requirement check
    if (!username) {
      return res.status(400).json({ success: false, message: "Username is required" });
    }

    const usernameClean = username.trim().toLowerCase();
    if (!/^[a-z0-9]{3,30}$/.test(usernameClean)) {
      return res.status(400).json({ success: false, message: "Username must be 3-30 alphanumeric characters" });
    }

    // Ensure username/email/phone uniqueness
    const existing = await User.findOne({
      $or: [
        { email },
        { phone },
        { username: usernameClean }
      ]
    });

    if (existing) {
      if (existing.email === email) return res.status(400).json({ success: false, message: "Email already registered" });
      if (existing.username === usernameClean) return res.status(400).json({ success: false, message: "Username already taken" });
      if (existing.phone === phone) return res.status(400).json({ success: false, message: "Phone number already registered" });
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const roleClean = (role || 'buyer').toLowerCase();

    const userData = {
      fullName: name,
      username: usernameClean,
      email,
      phone,
      countryCode: req.body.countryCode || 'KE',
      password,
      role: roleClean,
      referralCode: req.body.referralCode || `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now()}`
    };

    const user = await User.create(userData);
    monitoring.activeUsers.inc(); // Track system growth

    // If role is delivery, create DeliveryAgent record and attach to user
    if (user.role === 'delivery') {
      try {
        const agent = await DeliveryAgent.create({ userId: user._id, name: name, phone });
        user.agentId = agent._id;
        await user.save();
      } catch (agentErr) {
        console.warn('failed to create DeliveryAgent for user', agentErr && agentErr.message);
      }
    }

    // Auto-create wallet and include balances
    const Wallet = require('../models/Wallet.js');
    let wallet = await Wallet.findOne({ ownerId: user._id });
    if (!wallet) {
      wallet = await Wallet.create({ ownerId: user._id, mallmoney: 0, mallcoins: 0, mallpoints: 0 });
    }

    console.log('[AUTH] User registered successfully:', user._id);
    res.status(201).json({
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        agentId: user.agentId,
        mallCoins: wallet.mallcoins,
        mallPoints: wallet.mallpoints
      },
      token: signToken(user._id),
      refreshToken: await generateRefreshToken(user._id),
      message: "Registration successful"
    });

    // Send Welcome Email (async, don't block response)
    sendWelcomeEmail(user).catch(err => console.error('[AUTH] Welcome email failed:', err.message));
  } catch (err) {
    console.error("[AUTH] Register error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// Login
router.post("/login", async function (req, res) {
  console.log('[AUTH] Login attempt:', req.body.email);
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await user.matchPassword(password);
    if (!ok) {
      monitoring.loginAttempts.labels('failure').inc();
      return res.status(401).json({ message: "Invalid credentials" });
    }

    monitoring.loginAttempts.labels('success').inc();

    // Fetch wallet for balances
    const Wallet = require('../models/Wallet.js');
    let wallet = await Wallet.findOne({ ownerId: user._id });
    if (!wallet) {
      wallet = await Wallet.create({ ownerId: user._id, mallmoney: 0, mallcoins: 0, mallpoints: 0 });
    }

    console.log('[AUTH] Login success:', user._id);
    res.json({
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        mallCoins: wallet.mallcoins,
        mallPoints: wallet.mallpoints
      },
      token: signToken(user._id),
      refreshToken: await generateRefreshToken(user._id),
    });
  } catch (err) {
    console.error("[AUTH] Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout
router.post("/logout", async function (req, res) {
  console.log('[AUTH] Logout requested');
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await RefreshToken.findOneAndUpdate({ token: refreshToken }, { revokedAt: new Date() });
    }
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Logout failed" });
  }
});

// Refresh Token
router.post("/refresh-token", async function (req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "Refresh token required" });

  try {
    const rt = await RefreshToken.findOne({ token: refreshToken });
    if (!rt || rt.revokedAt || Date.now() >= rt.expiresAt) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    // Generate new access token
    const token = signToken(rt.userId);

    // Optional: Rotate refresh token
    const newRefreshToken = await generateRefreshToken(rt.userId);
    rt.revokedAt = new Date();
    rt.replacedByToken = newRefreshToken;
    await rt.save();

    res.json({ token, refreshToken: newRefreshToken });
  } catch (err) {
    console.error("[AUTH] Refresh token error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Profile (protected)
router.get("/profile", authMiddleware, async function (req, res) {
  try {
    const Wallet = require('../models/Wallet.js');
    let wallet = await Wallet.findOne({ ownerId: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({ ownerId: req.user._id });
    }

    const userData = {
      id: req.user._id,
      _id: req.user._id,
      username: req.user.username,
      fullName: req.user.fullName,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      avatar: req.user.avatar,
      badgeOwned: req.user.badgeOwned,
      agentId: req.user.agentId,
      mallCoins: wallet.mallcoins,
      mallPoints: wallet.mallpoints,
      preferences: req.user.preferences
    };

    res.json({ user: userData });
  } catch (err) {
    console.error("[AUTH] Profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Change Password (authenticated)
router.post("/change-password", authMiddleware, async function (req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password required" });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("[AUTH] Change password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// Update last known location for authenticated user
router.put('/location', authMiddleware, async function (req, res) {
  try {
    const { lat, lng, accuracy } = req.body;
    if (lat == null || lng == null) return res.status(400).json({ success: false, error: 'lat and lng required' });
    const loc = { lat: Number(lat), lng: Number(lng), accuracy: accuracy ? Number(accuracy) : undefined, updatedAt: new Date() };
    const user = await User.findByIdAndUpdate(req.user._id, { lastLocation: loc }, { new: true }).select('-password');

    // Broadcast via socket
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${req.user._id}`).emit('location:update', { userId: req.user._id, location: loc });
        io.to('admin:delivery').emit('location:update', { userId: req.user._id, location: loc });
      }
    } catch (e) {
      console.warn('socket broadcast failed', e?.message || e);
    }

    return res.json({ success: true, user });
  } catch (err) {
    console.error('auth location update err', err);
    return res.status(500).json({ success: false, error: 'failed to update location' });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Generate password reset token
 * @access  Public
 */
router.post("/forgot-password", async function (req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if user exists
      return res.json({ message: "If an account exists with this email, a reset link will be sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // In production, send email. In dev, log it.
    // Send Reset Email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    await sendPasswordResetEmail(email, resetUrl);

    res.json({
      success: true,
      message: "If an account exists with this email, a reset link will be sent.",
      // Return URL in dev mode for easy testing
      debugUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
    });
  } catch (err) {
    console.error("[AUTH] Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password using token
 * @access  Public
 */
router.post("/reset-password/:token", async function (req, res) {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) return res.status(400).json({ message: "New password is required" });

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Set new password (pre-save hook will hash it)
    console.log('[AUTH] Resetting password for user:', user.email);
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // Mark password as modified to ensure pre-save hook runs
    user.markModified('password');
    await user.save();

    console.log('[AUTH] Password reset successful for:', user.email);
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("[AUTH] Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Google auth
router.post("/google", async function (req, res) {
  const { token } = req.body;
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  // Find or create user logic here
  res.json({ success: true, user: payload });
});

module.exports = router;
