const express = require('express');
const DeliveryAgent = require('../models/DeliveryAgent');
const DeliveryTask = require('../models/DeliveryTask');
const Wallet = require('../models/Wallet');
const { authMiddleware } = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const router = express.Router();

// Admin: List all agents
router.get('/list', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const agents = await DeliveryAgent.find().lean();
    res.json(agents);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// Get current agent profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const agent = await DeliveryAgent.findOne({ userId: req.user._id }).lean();
    if (agent) {
      // Include user avatar if available
      agent.avatar = req.user.avatar;
    }
    res.json(agent || {});
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// Get agent stats (dynamic data for dashboard)
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const agent = await DeliveryAgent.findOne({ userId: req.user._id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // Get task counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalCompleted, todayCompleted, activeTasks, failedTasks] = await Promise.all([
      DeliveryTask.countDocuments({ assignedAgentId: agent._id, status: 'delivered' }),
      DeliveryTask.countDocuments({ assignedAgentId: agent._id, status: 'delivered', deliveredAt: { $gte: today } }),
      DeliveryTask.countDocuments({ assignedAgentId: agent._id, status: { $in: ['assigned', 'accepted', 'enroute_pickup', 'picked_up', 'enroute_dropoff'] } }),
      DeliveryTask.countDocuments({ assignedAgentId: agent._id, status: 'failed' })
    ]);

    // Calculate success rate
    const totalAttempted = totalCompleted + failedTasks;
    const successRate = totalAttempted > 0 ? ((totalCompleted / totalAttempted) * 100).toFixed(1) : 100;

    // Get today's earnings
    const todayTasks = await DeliveryTask.find({
      assignedAgentId: agent._id,
      status: 'delivered',
      deliveredAt: { $gte: today }
    }).select('agentPayout');
    const todayEarnings = todayTasks.reduce((sum, t) => sum + (t.agentPayout || 0), 0);

    // Get daily goal progress (assume 10 deliveries per day goal)
    const dailyGoal = 10;
    const goalProgress = Math.min((todayCompleted / dailyGoal) * 100, 100);

    res.json({
      activeTasks,
      totalCompleted,
      todayCompleted,
      successRate: parseFloat(successRate),
      rating: agent.rating || 5.0,
      todayEarnings,
      totalEarnings: agent.earningsBalance || 0,
      online: agent.online,
      dailyGoal,
      goalProgress,
      deliveriesRemaining: Math.max(0, dailyGoal - todayCompleted)
    });
  } catch (e) {
    console.error('Agent stats error:', e);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// Get agent earnings breakdown
router.get('/earnings', authMiddleware, async (req, res) => {
  try {
    const agent = await DeliveryAgent.findOne({ userId: req.user._id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // Get earnings by period
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const [todayTasks, weekTasks, monthTasks] = await Promise.all([
      DeliveryTask.find({ assignedAgentId: agent._id, status: 'delivered', deliveredAt: { $gte: todayStart } }).select('agentPayout'),
      DeliveryTask.find({ assignedAgentId: agent._id, status: 'delivered', deliveredAt: { $gte: weekStart } }).select('agentPayout'),
      DeliveryTask.find({ assignedAgentId: agent._id, status: 'delivered', deliveredAt: { $gte: monthStart } }).select('agentPayout')
    ]);

    const todayEarnings = todayTasks.reduce((sum, t) => sum + (t.agentPayout || 0), 0);
    const weekEarnings = weekTasks.reduce((sum, t) => sum + (t.agentPayout || 0), 0);
    const monthEarnings = monthTasks.reduce((sum, t) => sum + (t.agentPayout || 0), 0);

    // Get wallet balance
    const wallet = await Wallet.findOne({ ownerId: req.user._id });

    res.json({
      today: todayEarnings,
      week: weekEarnings,
      month: monthEarnings,
      total: agent.earningsBalance || 0,
      available: wallet?.mallmoney || 0,
      pending: 0, // Could track pending payouts
      todayDeliveries: todayTasks.length,
      weekDeliveries: weekTasks.length,
      monthDeliveries: monthTasks.length
    });
  } catch (e) {
    console.error('Agent earnings error:', e);
    res.status(500).json({ error: 'Failed to load earnings' });
  }
});

// Get delivery history with pagination
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const agent = await DeliveryAgent.findOne({ userId: req.user._id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status; // Optional filter

    const query = { assignedAgentId: agent._id };
    if (status) query.status = status;

    const [tasks, total] = await Promise.all([
      DeliveryTask.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('buyerId', 'fullName')
        .populate('sellerId', 'fullName')
        .lean(),
      DeliveryTask.countDocuments(query)
    ]);

    res.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (e) {
    console.error('Agent history error:', e);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// Toggle online status
router.post('/online', authMiddleware, async (req, res) => {
  try {
    const agent = await DeliveryAgent.findOne({ userId: req.user._id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const newStatus = req.body.online !== undefined ? req.body.online : !agent.online;
    agent.online = newStatus;
    agent.lastLocation = { ...agent.lastLocation, updatedAt: new Date() };
    await agent.save();

    // Broadcast status change via socket
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('admin:delivery').emit('agent:status', { agentId: agent._id, online: newStatus });
      }
    } catch (e) { /* ignore socket errors */ }

    res.json({ success: true, online: newStatus });
  } catch (e) {
    console.error('Agent online toggle error:', e);
    res.status(500).json({ error: 'Failed to toggle status' });
  }
});

// Update agent profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const agent = await DeliveryAgent.findOne({ userId: req.user._id });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const { displayName, phone, vehicle } = req.body;
    if (displayName) agent.displayName = displayName;
    if (phone) agent.phone = phone;
    if (vehicle) agent.vehicle = { ...agent.vehicle, ...vehicle };

    await agent.save();
    res.json({ success: true, agent });
  } catch (e) {
    console.error('Agent profile update error:', e);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
