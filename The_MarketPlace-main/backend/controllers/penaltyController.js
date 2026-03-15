const mongoose = require('mongoose');
const Penalty = require('../models/Penalty');
const DeliveryAgent = require('../models/DeliveryAgent');
const DeliveryTask = require('../models/DeliveryTask');
const Wallet = require('../models/Wallet');

exports.createPenalty = async (req, res) => {
  try {
    const { agentId, taskId, amount = 0, reason, notes } = req.body;
    if (!agentId || !reason) return res.status(400).json({ error: 'agentId and reason required' });

    const penalty = new Penalty({
      agentId: mongoose.Types.ObjectId(agentId),
      taskId: taskId ? mongoose.Types.ObjectId(taskId) : undefined,
      adminId: req.user && req.user._id ? mongoose.Types.ObjectId(req.user._id) : undefined,
      amount,
      reason,
      notes
    });
    await penalty.save();

    // increment counters on agent
    await DeliveryAgent.findByIdAndUpdate(agentId, { $inc: { penaltyCount: 1, penaltyAmountTotal: amount } }, { new: true }).catch(() => {});

    // optionally deduct from agent wallet/earnings
    if (amount > 0) {
      const agent = await DeliveryAgent.findById(agentId).catch(() => null);
      if (agent) {
        agent.earningsBalance = Math.max(0, (agent.earningsBalance || 0) - amount);
        await agent.save().catch(() => {});

        const w = await Wallet.findOne({ ownerId: agent.userId }).catch(() => null);
        if (w) {
          w.mallmoney = Math.max(0, (w.mallmoney || 0) - amount);
          await w.save().catch(() => {});
        }
      }
    }

    if (taskId) {
      await DeliveryTask.findByIdAndUpdate(taskId, { $push: { reasonTags: 'penalized' } }).catch(() => {});
    }

    res.json({ ok: true, penalty });
  } catch (err) {
    console.error('createPenalty err', err);
    res.status(500).json({ error: 'create penalty failed' });
  }
};

exports.listPenalties = async (req, res) => {
  try {
    const q = {};
    if (req.query.agentId) q.agentId = mongoose.Types.ObjectId(req.query.agentId);
    const items = await Penalty.find(q).sort({ createdAt: -1 }).limit(500).lean();
    res.json(items);
  } catch (err) {
    console.error('listPenalties err', err);
    res.status(500).json({ error: 'list penalties failed' });
  }
};
