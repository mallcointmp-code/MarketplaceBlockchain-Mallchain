const express = require("express");
const Config = require("../models/Config");
const { protect } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");

const router = express.Router();

// Get config by key (public)
router.get("/:key", async (req, res) => {
  try {
    const cfg = await Config.findOne({ key: req.params.key });
    res.json(cfg ? cfg.value : null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: set or update config
router.post("/", protect, requireRole(["admin"]), async (req, res) => {
  try {
    const { key, value, description } = req.body;
    const cfg = await Config.findOneAndUpdate({ key }, { value, description, updatedAt: Date.now() }, { upsert: true, new: true });
    res.json({ message: "Config saved", cfg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: list all configs
router.get("/", protect, requireRole(["admin"]), async (req, res) => {
  try {
    const all = await Config.find().sort({ key: 1 });
    res.json(all);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
