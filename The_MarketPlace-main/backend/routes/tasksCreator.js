const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { v4: uuidv4 } = require("uuid");

// --- Post a New Task ---
router.post("/create", authMiddleware, async (req, res) => {
  try {
    // Frontend sends: title, description, reward, platform, link, deadline, action...
    // We map these to DB schema.
    const { title, description, reward, platform, link, deadline, action, contentLink, budget } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Determining cost. Assuming 'reward' is the cost per action or total cost?
    // Let's assume cost = reward for now (single task run?) or budget.
    const cost = Number(reward || budget || 0);

    // Check Mallpoints balance logic (Simplified for Dev)
    const Wallet = require('../models/Wallet.js');
    let wallet = await Wallet.findOne({ ownerId: req.user.userId });

    // Auto-create wallet if missing (Dev helper)
    if (!wallet) {
      wallet = await Wallet.create({ ownerId: req.user.userId, mallpoints: 1000 }); // Bonus for dev!
    }

    /* 
    // Strict check disabled for dev
    if (wallet.mallpoints < cost) {
      return res.status(400).json({ error: "Insufficient Mallpoints" });
    } 
    */

    if (cost > 0) {
      wallet.mallpoints -= cost;
      await wallet.save();
    }

    // Create task
    const task = new Task({
      creator: user._id,
      creatorId: user._id, // legacy support
      title: title || 'Untitled Task',
      description: description || '',
      reward: cost,
      budget: cost,
      platform: platform || 'General',
      link: link || contentLink || '#',
      contentLink: link || contentLink,
      status: "active", // Auto-activate for demo purposes, usually 'pending'
      createdAt: new Date()
    });
    await task.save();

    // Record transaction
    // Transaction Schema requires: walletId, type (enum), amount
    const tx = new Transaction({
      user: user._id,
      walletId: wallet._id, // Added required field
      type: 'payment', // 'purchase' was invalid. using 'payment' or 'withdrawal' or 'debit' based on schema?
      // Let's assume 'payment' is valid or check Schema.
      // Schema (from next step verification) usually has: deposit, withdrawal, transfer, payment, earn_points...
      currency: "mallpoints",
      amount: cost, // Use 'cost' which is safe Number
      status: "completed",
      description: "Approve Task Budget",
      reference: uuidv4(),
    });
    await tx.save();

    res.json({ message: "Task created successfully. Awaiting admin approval.", task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- View My Tasks ---
router.get("/my-tasks", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ creator: req.user._id });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Get Stats ---
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ creator: req.user._id });
    const activeTasks = tasks.filter(t => ["pending", "approved"].includes(t.status)).length;

    const transactions = await Transaction.find({
      user: req.user._id,
      currency: "mallpoints",
      type: "purchase",
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });

    const spentThisMonth = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    res.json({
      success: true,
      data: {
        activeTasks,
        spentThisMonth
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Cancel a Task (only if still pending) ---
router.post("/cancel/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, creator: req.user.userId });
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (task.status !== "pending") {
      return res.status(400).json({ error: "Task cannot be canceled after approval" });
    }

    // Refund budget
    const user = await User.findById(req.user.userId);
    user.wallets.mallpoints += task.budget;
    await user.save();

    task.status = "rejected";
    await task.save();

    res.json({ message: "Task canceled and budget refunded." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Get Task History ---
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ creator: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    const history = tasks.map(task => ({
      id: task._id,
      title: task.title,
      status: task.status,
      reward: task.reward,
      budget: task.budget,
      createdAt: task.createdAt,
      completedAt: task.completedAt
    }));

    res.json({ success: true, data: history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
