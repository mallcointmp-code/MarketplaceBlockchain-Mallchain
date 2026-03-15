const express = require("express");
const Task = require("../models/Task");
const UserTask = require("../models/UserTask");
const Campaign = require("../models/Campaign");
const { protect } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");

const router = express.Router();

// Get all pending creator tasks 
router.get("/pending", protect, requireRole(["admin"]), async (req, res) => {
  try {
    const tasks = await Task.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Approve a creator task and publish it
router.put("/approve/:id", protect, requireRole(["admin"]), async (req, res) => {
  try {
    const { pricePerAction, actionsTarget } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.status = "published";
    task.pricePerAction = pricePerAction || task.pricePerAction;
    task.actionsTarget = actionsTarget || task.actionsTarget;
    await task.save();

    res.json({ message: "Task approved and published", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reject creator task
router.put("/reject/:id", protect, requireRole(["admin"]), async (req, res) => {
  try {
    const { reason } = req.body;
    const task = await Task.findByIdAndUpdate(req.params.id, { status: "rejected", rejectionReason: reason }, { new: true });
    res.json({ message: "Task rejected", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Review user submission and release MLPTS reward
router.put("/review-submission/:userTaskId", protect, requireRole(["admin"]), async (req, res) => {
  try {
    const { approved, reward } = req.body;
    const userTask = await UserTask.findById(req.params.userTaskId);
    if (!userTask) return res.status(404).json({ message: "Submission not found" });

    userTask.status = approved ? "approved" : "rejected";
    if (approved) userTask.reward = reward || userTask.reward;
    await userTask.save();

    res.json({ message: "Submission reviewed", userTask });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//  list campaigns waiting for approval
router.get("/campaigns/pending", protect, requireRole(["admin"]), async (req, res) => {
  try {
    const list = await Campaign.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
