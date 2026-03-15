const Queue = require('bull');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const assignmentQueue = new Queue('delivery-assignment', REDIS_URL);

async function enqueueAssignment(taskId) {
  await assignmentQueue.add({ taskId }, { attempts: 3, backoff: { type: 'fixed', delay: 2000 } });
}

module.exports = { assignmentQueue, enqueueAssignment, REDIS_URL };