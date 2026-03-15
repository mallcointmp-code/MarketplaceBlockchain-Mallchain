// backend/controllers/deliveryController.js
const DeliveryTask = require('../models/DeliveryTask.js');
const DeliveryAgent = require('../models/DeliveryAgent.js');
const DeliveryHistory = require('../models/DeliveryHistory.js');
const Wallet = require('../models/Wallet.js');
const WalletTransaction = require('../models/WalletTransaction.js');
const mongoose = require('mongoose');

async function fetchRoutePolylineWithCache(lat1, lng1, lat2, lng2) {
  // Placeholder: integrate with directionsService for route polyline
  return null;
}

/**
 * Create a delivery task for an order
 */
const createTask = async (req, res) => {
  try {
    const { orderId, buyerId, sellerId, pickupLocation, dropoffLocation, fee } = req.body;
    if (!pickupLocation || !dropoffLocation) return res.status(400).json({ error: "pickup/dropoff required" });

    const taskData = {
      orderId,
      buyerId,
      sellerId,
      pickupLocation,
      dropoffLocation,
      fee: fee || 0,
      agentPayout: (fee || 0) * 0.7,
      status: "unassigned"
    };

    // Try to fetch route polyline
    try {
      const route = await fetchRoutePolylineWithCache(pickupLocation.lat, pickupLocation.lng, dropoffLocation.lat, dropoffLocation.lng);
      if (route) {
        taskData.routePolylineEncoded = route.encoded;
        taskData.routePolylineCoords = route.decoded;
        if (route.durationSec) taskData.expectedDurationSec = route.durationSec;
      }
    } catch (e) { console.warn("route fetch error", e?.message || e); }

    const task = new DeliveryTask(taskData);
    await task.save();

    // Create history
    const hist = new DeliveryHistory({ taskId: task._id, events: [{ type: "created", note: "task created" }] });
    await hist.save();

    // Try to enqueue assignment job if worker exists
    try {
      const m = await import("../workers/assignmentWorker.js");
      if (m?.assignAgentToTask) await m.assignAgentToTask(task._id);
    } catch (e) {
      // no assignment worker present, ignore
    }

    const io = req.app.get("io");
    if (io) io.to("admin:delivery").emit("task:new", task);

    res.json({ ok: true, task });
  } catch (err) {
    console.error("createTask err", err);
    res.status(500).json({ error: "failed to create task" });
  }
};

/**
 * Admin assigns agent to task
 */
const assignAgent = async (req, res) => {
  try {
    const { taskId, agentId } = req.body;
    const task = await DeliveryTask.findById(taskId);
    if (!task) return res.status(404).json({ error: "task not found" });
    task.assignedAgentId = agentId;
    task.status = "assigned";
    await task.save();
    await DeliveryHistory.updateOne({ taskId: task._id }, { $push: { events: { type: "assigned", note: `assigned to ${agentId}` } } }, { upsert: true });
    req.app.get("io")?.to(`agent:${agentId}`)?.emit("task:assigned", task);
    res.json({ ok: true, task });
  } catch (err) {
    console.error("assignAgent err", err);
    res.status(500).json({ error: "failed to assign" });
  }
};

/**
 * Agent accepts the task
 */
const agentAcceptTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const agentId = req.user?.agentId || req.user?._id;

    const agent = await DeliveryAgent.findOne({ $or: [{ _id: agentId }, { userId: req.user._id }] });
    if (!agent) return res.status(403).json({ error: "Not an agent" });

    const task = await DeliveryTask.findById(taskId);
    if (!task) return res.status(404).json({ error: "task not found" });

    if (task.assignedAgentId && String(task.assignedAgentId) !== String(agent._id)) {
      return res.status(403).json({ error: "Not assigned to you" });
    }

    task.status = "accepted";
    task.assignedAgentId = agent._id;
    await task.save();

    await DeliveryHistory.updateOne({ taskId: task._id }, { $push: { events: { type: "accepted", ts: new Date() } } }, { upsert: true });

    const io = req.app.get("io");
    if (io) {
      io.to(`agent:${agent._id}`).emit("task:accepted", task);
      io.to(`user:${task.buyerId}`).emit("task:update", { taskId, status: "accepted" });
      io.to("admin:delivery").emit("task:update", task);
    }

    res.json({ ok: true, task });
  } catch (err) {
    console.error("agentAcceptTask err", err);
    res.status(500).json({ error: "failed" });
  }
};

/**
 * Agent updates live location
 */
const updateAgentLocation = async (req, res) => {
  try {
    const { lat, lng, taskId } = req.body;
    const agentId = req.user?.agentId || req.user?._id;

    if (lat == null || lng == null) return res.status(400).json({ error: "lat/lng required" });

    // Update agent location
    try {
      await DeliveryAgent.findOneAndUpdate(
        { $or: [{ _id: agentId }, { userId: req.user._id }] },
        { lastLocation: { lat: Number(lat), lng: Number(lng), updatedAt: new Date() }, online: true }
      );
    } catch (e) {
      console.warn("Agent location update failed", e);
    }

    // Broadcast via socket
    const io = req.app.get("io");
    const payload = { agentId, lat: Number(lat), lng: Number(lng), ts: new Date().toISOString(), taskId };

    if (io) {
      if (taskId) io.to(`task:${taskId}`).emit("agent:location", payload);
      io.to(`agent:${agentId}`).emit("agent:location:me", payload);
      io.to("admin:delivery").emit("agent:location", payload);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("updateAgentLocation err", err);
    res.status(500).json({ error: "failed" });
  }
};

/**
 * Confirm pickup
 */
const confirmPickup = async (req, res) => {
  try {
    const agentId = req.user?.agentId || req.user?._id;
    const { taskId } = req.params.taskId ? req.params : req.body;

    const task = await DeliveryTask.findById(taskId);
    if (!task) return res.status(404).json({ error: "task not found" });

    if (task.assignedAgentId && String(task.assignedAgentId) !== String(agentId)) {
      return res.status(403).json({ error: "not assigned to you" });
    }

    task.status = "picked_up";
    task.pickedAt = new Date();
    await task.save();

    await DeliveryHistory.updateOne({ taskId: task._id }, { $push: { events: { type: "picked", ts: new Date() } } }, { upsert: true });

    const io = req.app.get("io");
    if (io) io.to(`task:${taskId}`).emit("task:update", { status: task.status, taskId });

    res.json({ ok: true, task });
  } catch (err) {
    console.error("confirmPickup err", err);
    res.status(500).json({ error: "failed" });
  }
};

/**
 * Confirm delivery
 */
const confirmDelivery = async (req, res) => {
  try {
    const agentId = req.user?.agentId || req.user?._id;
    const { taskId, deliveredAt, actualDurationSec } = req.params.taskId ? { ...req.params, ...req.body } : req.body;

    const task = await DeliveryTask.findById(taskId);
    if (!task) return res.status(404).json({ error: "task not found" });

    if (task.assignedAgentId && String(task.assignedAgentId) !== String(agentId)) {
      return res.status(403).json({ error: "not assigned to you" });
    }

    task.status = "delivered";
    task.deliveredAt = deliveredAt ? new Date(deliveredAt) : new Date();
    task.actualDurationSec = actualDurationSec || (task.pickedAt ? Math.round((task.deliveredAt - task.pickedAt) / 1000) : 0);
    await task.save();

    // Update history
    await DeliveryHistory.updateOne(
      { taskId: task._id },
      {
        $push: { events: { type: "delivered", ts: new Date() } },
        $set: { actualDurationSec: task.actualDurationSec, amountPaid: task.agentPayout }
      },
      { upsert: true }
    );

    // Pay out to agent
    const agent = await DeliveryAgent.findById(task.assignedAgentId);
    if (agent) {
      agent.earningsBalance = (agent.earningsBalance || 0) + (task.agentPayout || 0);
      agent.totalCompleted = (agent.totalCompleted || 0) + 1;
      await agent.save();

      // Credit wallet
      const wallet = await Wallet.findOne({ ownerId: agent.userId });
      if (wallet) {
        const before = wallet.mallmoney;
        wallet.mallmoney += (task.agentPayout || 0);
        await wallet.save();
        await WalletTransaction.create({
          walletId: wallet._id,
          ownerId: agent.userId,
          type: "receive",
          amount: task.agentPayout || 0,
          balanceBefore: before,
          balanceAfter: wallet.mallmoney,
          relatedModel: "DeliveryTask",
          relatedId: task._id
        });
      }
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`task:${taskId}`).emit("task:delivered", task);
      io.to(`user:${task.buyerId}`).emit("task:update", task);
      io.to("admin:delivery").emit("task:update", task);
    }

    res.json({ ok: true, task });
  } catch (err) {
    console.error("confirmDelivery err", err);
    res.status(500).json({ error: "failed" });
  }
};

/**
 * Get task detail with history
 */
const getTaskDetail = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await DeliveryTask.findById(taskId).lean();
    if (!task) return res.status(404).json({ error: "not found" });
    const history = await DeliveryHistory.findOne({ taskId: task._id }).lean();
    res.json({ task, history });
  } catch (err) {
    console.error("getTaskDetail err", err);
    res.status(500).json({ error: "failed" });
  }
};

/**
 * Submit a rating for a delivery task (buyer or seller)
 * body: { taskId, role: 'buyer'|'seller', rating: number, comment?: string }
 */
const rateDelivery = async (req, res) => {
  try {
    const { taskId, role, rating, comment } = req.body;
    if (!taskId || !role || typeof rating !== 'number') return res.status(400).json({ error: 'taskId, role and numeric rating required' });
    if (!['buyer', 'seller'].includes(role)) return res.status(400).json({ error: 'role must be buyer or seller' });

    const task = await DeliveryTask.findById(taskId);
    if (!task) return res.status(404).json({ error: 'task not found' });

    const updates = {};
    if (!task.rating) task.rating = {};
    if (role === 'buyer') { task.rating.buyerRating = rating; if (comment) task.rating.buyerComment = comment; }
    else { task.rating.sellerRating = rating; if (comment) task.rating.sellerComment = comment; }

    task.updatedAt = new Date();
    await task.save();

    await DeliveryHistory.updateOne({ taskId: task._id }, { $push: { events: { type: 'rating', who: role, rating, comment, ts: new Date() } } }, { upsert: true });

    // emit update
    const io = req.app.get('io');
    if (io) io.to(`task:${task._id}`).emit('task:rating', { taskId: task._id, role, rating });

    res.json({ ok: true, task });
  } catch (err) { console.error('rateDelivery err', err); res.status(500).json({ error: 'failed' }); }
};

/**
 * List tasks for seller
 */
const listTasksForSeller = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const tasks = await DeliveryTask.find({ sellerId }).sort({ createdAt: -1 }).limit(200);
    res.json({ data: tasks });
  } catch (err) {
    console.error("listTasksForSeller err", err);
    res.status(500).json({ error: "failed" });
  }
};

/**
 * Get single task
 */
const getTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await DeliveryTask.findById(taskId);
    if (!task) return res.status(404).json({ error: "task not found" });
    res.json({ task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed" });
  }
};

/**
 * List tasks (agent, seller, or general)
 * Query params: assignedAgent, sellerId, status, unassigned=true
 */
const listTasks = async (req, res) => {
  try {
    const q = {};
    const { assignedAgent, sellerId, status, unassigned } = req.query;
    if (assignedAgent) q.assignedAgentId = assignedAgent;
    if (sellerId) q.sellerId = sellerId;
    if (status) q.status = status;
    if (unassigned === 'true') q.status = 'unassigned';

    const tasks = await DeliveryTask.find(q).sort({ createdAt: -1 }).limit(200).lean();
    res.json(tasks);
  } catch (err) {
    console.error("listTasks err", err);
    res.status(500).json({ error: "failed" });
  }
};

// cleaned module exports
module.exports = {
  createTask,
  assignAgent,
  agentAcceptTask,
  updateAgentLocation,
  confirmPickup,
  confirmDelivery,
  getTaskDetail,
  getTask,
  listTasksForSeller,
  listTasks,
  rateDelivery
};