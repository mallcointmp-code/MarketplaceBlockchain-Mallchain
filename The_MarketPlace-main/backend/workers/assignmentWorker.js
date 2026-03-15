const { assignmentQueue } = require('../queues/deliveryQueue.js');
const DeliveryTask = require('../models/DeliveryTask.js');
const { findNearestAgent, assignTaskToAgent } = require('../services/deliveryService.js');

assignmentQueue.process(async (job) => {
  const { taskId } = job.data;
  console.log(`Processing assignment for task ${taskId}`);

  // Atomically lock the task by changing status from unassigned -> assigning
  const task = await DeliveryTask.findOneAndUpdate(
    { _id: taskId, status: 'unassigned' },
    { $set: { status: 'assigning', updatedAt: new Date() } },
    { new: true }
  );

  if (!task) {
    console.log(`Task ${taskId} not found or not unassigned, skipping.`);
    return Promise.resolve();
  }

  const pickup = task.pickupLocation || {};
  if (!pickup.lat || !pickup.lng) {
    console.error(`Task ${taskId} missing pickup coordinates`);
    await DeliveryTask.findByIdAndUpdate(taskId, { status: 'unassigned' });
    return Promise.resolve();
  }

  // Find agent
  let agent = null;
  try {
    agent = await findNearestAgent(pickup.lat, pickup.lng, 10000);
  } catch (err) {
    console.error('Error finding nearest agent:', err);
  }

  if (!agent) {
    console.log(`No agent found for task ${taskId}, requeueing/resetting.`);
    await DeliveryTask.findByIdAndUpdate(task._id, { status: 'unassigned', updatedAt: new Date() });
    // Verify if we should throw to retry or just leave it for the requeue worker
    // Throwing triggers Bull's retry mechanism
    throw new Error('No agent found');
  }

  await assignTaskToAgent(task._id, agent._id, { system: true });
  console.log(`Assigned task ${taskId} to agent ${agent._id}`);
  return Promise.resolve();
});

assignmentQueue.on('failed', (job, err) => {
  console.error('assignment job failed', job.id, err && err.message);
});

console.log('Assignment worker started');

module.exports = assignmentQueue;
