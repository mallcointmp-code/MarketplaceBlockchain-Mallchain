const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const TaskCompletion = require("../models/TaskCompletion");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { v4: uuidv4 } = require("uuid");

// --- View Available Tasks ---
router.get("/available", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({
      status: "active",
      creator: { $ne: req.user.userId }, // exclude own tasks
    }).select("platform contentLink instructions pricePerCompletion");

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Take a Task ---
router.post("/take/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (task.status !== "active") {
      return res.status(400).json({ error: "Task is not available" });
    }

    if (task.completionsCount >= task.maxCompletions) {
      return res.status(400).json({ error: "Task has reached max completions" });
    }

    // Prevent duplicate attempts
    const alreadyTaken = await TaskCompletion.findOne({
      task: task._id,
      user: req.user.userId,
    });
    if (alreadyTaken) {
      return res.status(400).json({ error: "You already took this task" });
    }

    const completion = new TaskCompletion({
      task: task._id,
      user: req.user.userId,
      reward: task.pricePerCompletion,
    });
    await completion.save();

    res.json({ message: "Task taken successfully. Submit proof when done.", completion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Submit Proof ---
router.post("/submit/:id", authMiddleware, async (req, res) => {
  try {
    const { proof } = req.body;

    const completion = await TaskCompletion.findOne({
      _id: req.params.id,
      user: req.user.userId,
    }).populate("task");

    if (!completion) return res.status(404).json({ error: "Completion not found" });

    if (completion.status !== "pending") {
      return res.status(400).json({ error: "Task already reviewed" });
    }

    completion.proof = proof;
    await completion.save();

    res.json({ message: "Proof submitted. Awaiting admin review." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Admin Reviews Task Completion ---
router.post("/review/:id", authMiddleware, async (req, res) => {
  try {
    // only admin can review
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "Admin only" });
    }

    const { status } = req.body;
    const completion = await TaskCompletion.findById(req.params.id).populate("task user");
    if (!completion) return res.status(404).json({ error: "Completion not found" });

    if (completion.status !== "pending") {
      return res.status(400).json({ error: "Already reviewed" });
    }

    if (status === "approved") {
      completion.status = "approved";
      completion.reviewedAt = new Date();
      await completion.save();

      // Reward user
      const user = await User.findById(completion.user._id);
      user.wallets.mallpoints += completion.reward;
      await user.save();

      // Increment task completions
      const task = await Task.findById(completion.task._id);
      task.completionsCount += 1;
      await task.save();

      // Record transaction
      const tx = new Transaction({
        user: user._id,
        type: "reward",
        currency: "mallpoints",
        amount: completion.reward,
        status: "completed",
        description: `Reward for completing task ${task._id}`,
        reference: uuidv4(),
      });
      await tx.save();

      return res.json({ message: "Completion approved. User rewarded." });
    }

    if (status === "rejected") {
      completion.status = "rejected";
      completion.reviewedAt = new Date();
      await completion.save();

      return res.json({ message: "Completion rejected." });
    }

    res.status(400).json({ error: "Invalid review status" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
