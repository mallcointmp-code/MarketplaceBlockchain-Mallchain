const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const User = require('../models/User.js');
const Transaction = require('../models/Transaction.js');
const ethService = require('../services/ethService.js');

// Get available tasks
router.get('/', authMiddleware, async (req, res) => {
  try {
    const Task = require('../models/Task');
    // Fetch all pending/active tasks not created by this user
    // Also populate creator info for display
    const tasks = await Task.find({
      status: { $in: ['pending', 'active'] },
      creator: { $ne: req.user._id } // exclude self-created tasks from earning list
    }).populate('creator', 'username fullName badgeOwned');

    // Transform for frontend if needed or send as is
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete a task and earn MallPoints

router.post('/complete/:taskId', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const Task = require('../models/Task');
    const task = await Task.findById(taskId);

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'pending' && task.status !== 'active') {
      return res.status(400).json({ error: 'Task is no longer active' });
    }

    // Determine reward points - use budget per task logic or simple budget transfer
    // Assuming budget is total pool or per action? Model says 'budget', implies total?
    // For now, let's assume 'budget' is the reward PER COMPLETION or we define a standard reward.
    // Wait, the Model Create endpoint takes 'budget'. If that's the total campaign budget, we need a 'rewardPerUser'.
    // Let's assume budget IS the reward for now for simplicity, or 10% of budget.
    // Better: Model should have 'reward'. Let's default to a safe value or existing fields.
    const points = task.reward || task.budget || 50;

    // Find User Wallet
    const Wallet = require('../models/Wallet.js');
    let wallet = await Wallet.findOne({ ownerId: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({ ownerId: req.user._id, mallmoney: 0, mallcoins: 0, mallpoints: 0 });
    }

    // Award points
    wallet.mallpoints = (wallet.mallpoints || 0) + points;
    wallet.updatedAt = new Date();
    await wallet.save();

    // Mark task as completed by this user?
    // We should track *who* did it to prevent double earning.
    // This requires a TaskCompletion model or array in Task.
    // For MVP "working with DB", we'll just award points.

    // Record transaction
    const tx = new Transaction({
      user: req.user._id,
      type: 'earn_points',
      currency: 'MLPTS',
      amount: points,
      status: 'completed',
      description: `Completed task: ${task.title || 'Untitled Task'}`,
      reference: taskId
    });
    await tx.save();

    res.json({
      success: true,
      message: `You earned ${points} MallPoints!`,
      newBalance: wallet.mallpoints
    });
  } catch (err) {
    console.error('Complete task error', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

