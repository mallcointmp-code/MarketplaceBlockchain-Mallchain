// backend/routes/creator.js
const express = require("express");
const Task = require("../models/Task");
const Campaign = require("../models/Campaign");
const Wallet = require("../models/Wallet");
const { protect } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");

const router = express.Router();

// Creator posts new task
router.post("/task", authMiddleware, async (req, res) => {
  try {
    const task = new Task({
      platform: req.body.platform, // e.g. TikTok, YouTube
      link: req.body.link,
      daysActive: req.body.daysActive,
      budget: req.body.budget,
      timeToStart: req.body.timeToStart,
      createdBy: req.user._id,
      status: "pending",
    });
    await task.save();
    res.json({ message: "Task created and sent for review", task });
  } catch (err) {
    res.status(500).json({ message: "Failed to create task", error: err.message });
  }
});


// Creator funds a campaign with MLPTS (wallet must have MLPTS)
router.post("/fund-campaign", protect, requireRole(["creator"]), async (req, res) => {
  try {
    const { campaignId, amountMlpts } = req.body;
    const wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet || wallet.mallpoints < Number(amountMlpts)) return res.status(400).json({ message: "Insufficient MLPTS" });

    wallet.mallpoints -= Number(amountMlpts);
    await wallet.save();

    const camp = await Campaign.findById(campaignId);
    if (!camp) return res.status(404).json({ message: "Campaign not found" });

    camp.totalMlptsFunded = (camp.totalMlptsFunded || 0) + Number(amountMlpts);
    await camp.save();

    res.json({ message: "Campaign funded", campaign: camp });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Creator: view own tasks
router.get("/my-tasks", protect, requireRole(["creator"]), async (req, res) => {
  try {
    const tasks = await Task.find({ creatorId: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
