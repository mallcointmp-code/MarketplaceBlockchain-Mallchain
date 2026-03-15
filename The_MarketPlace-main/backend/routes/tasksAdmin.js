const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { v4: uuidv4 } = require("uuid");

const adminOnly = require("../middlewares/adminOnly");

// --- Get Pending Tasks ---
router.get("/pending", authMiddleware, adminOnly, async (req, res) => {
  try {
    const tasks = await Task.find({ status: "pending" }).populate("creator", "email name");
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Approve & Publish a Task ---
router.post("/approve/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { pricePerCompletion, maxCompletions } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (task.status !== "pending") {
      return res.status(400).json({ error: "Task is not pending" });
    }

    task.pricePerCompletion = pricePerCompletion;
    task.maxCompletions = maxCompletions;
    task.status = "active";
    task.publishedAt = new Date();
    await task.save();

    res.json({ message: "Task approved and published.", task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Reject a Task (Refund Budget) ---
router.post("/reject/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (task.status !== "pending") {
      return res.status(400).json({ error: "Task cannot be rejected now" });
    }

    // Refund creator budget
    const creator = await User.findById(task.creator);
    creator.wallets.mallpoints += task.budget;
    await creator.save();

    // Record refund transaction
    const tx = new Transaction({
      user: creator._id,
      type: "reward",
      currency: "mallpoints",
      amount: task.budget,
      status: "completed",
      description: "Refund from rejected task",
      reference: uuidv4(),
    });
    await tx.save();

    task.status = "rejected";
    await task.save();

    res.json({ message: "Task rejected and budget refunded." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- View Active Tasks ---
router.get("/active", authMiddleware, adminOnly, async (req, res) => {
  try {
    const tasks = await Task.find({ status: "active" }).populate("creator", "email name");
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
