const express = require("express");
const User = require("../models/User");
const { authMiddleware } = require("../middlewares/authMiddleware");

const router = express.Router();

// --- Get Active Sessions ---
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("activeSessions");
    res.json(user.activeSessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Terminate a Session ---
router.post("/terminate", authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.activeSessions = user.activeSessions.filter(
      (session) => session._id.toString() !== sessionId
    );

    await user.save();

    res.json({ message: "Session terminated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Terminate All Sessions (log out everywhere) ---
router.post("/terminate-all", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.activeSessions = [];
    await user.save();

    res.json({ message: "All sessions terminated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
