const DeliveryTask = require('../models/DeliveryTask');
const DeliveryAgent = require('../models/DeliveryAgent');
const DeliveryLog = require('../models/DeliveryLog');
const { sendSMS } = require('./smsService');
const { sendEmail } = require('./emailService');

/**
 * Naive nearest-agent selector stub.
 */
async function findNearestAgent(pickupLat, pickupLng, maxDistanceMeters = 5000) {
  // If no coordinates provided, fallback to any online agent
  if (!pickupLat || !pickupLng) {
    const any = await DeliveryAgent.findOne({ online: true });
    return any || null;
  }

  try {
    // GeoJSON uses [lng, lat]
    const agents = await DeliveryAgent.find({
      online: true,
      lastLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(pickupLng), Number(pickupLat)] },
          $maxDistance: maxDistanceMeters
        }
      }
    }).limit(10);

    return agents.length ? agents[0] : null;
  } catch (e) {
    // fallback to naive scanning
    const agents = await DeliveryAgent.find({ online: true }).limit(50);
    if (!agents || agents.length === 0) return null;
    let best = null; let bestDist = Infinity;
    agents.forEach(a => {
      const coords = a.lastLocation && a.lastLocation.coordinates;
      if (!coords || coords.length < 2) return;
      const lng = coords[0], lat = coords[1];
      const d = (lat - (pickupLat || 0)) ** 2 + (lng - (pickupLng || 0)) ** 2;
      if (d < bestDist) { bestDist = d; best = a; }
    });
    return best;
  }
}

async function assignTaskToAgent(taskId, agentId, byUser) {
  const task = await DeliveryTask.findById(taskId);
  if (!task) throw new Error('Task not found');
  task.assignedAgentId = agentId;
  task.status = 'assigned';
  task.attemptedAt = new Date();
  task.logs = task.logs || [];
  task.logs.push({ ts: new Date(), status: 'assigned', note: `Assigned by ${byUser?.email || byUser?.id || 'system'}` });
  await task.save();

  const agent = await DeliveryAgent.findById(agentId);
  if (agent) {
    try { sendSMS(agent.phone, `New delivery assigned: Order ${task.orderId}. Check your dashboard.`); } catch (e) { /* ignore */ }
    try { sendEmail(agent.email || (agent.userId && agent.userId.email), 'New Delivery Assigned', `You have a delivery ${task._id}`); } catch (e) { }
  }

  await DeliveryLog.create({ taskId: task._id, actor: byUser?._id, action: 'assigned', meta: { agentId } });
  return task;
}

async function payoutAgent(agentId, amount) {
  const agent = await DeliveryAgent.findById(agentId);
  if (!agent) throw new Error('Agent not found');
  agent.earningsBalance = (agent.earningsBalance || 0) + (amount || 0);
  await agent.save();
  return agent;
}

module.exports = {
  findNearestAgent,
  assignTaskToAgent,
  payoutAgent
};
