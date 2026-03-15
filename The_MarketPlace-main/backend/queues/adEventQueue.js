const Queue = require('bull');
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const adEventQueue = new Queue("ad-events", REDIS_URL, { defaultJobOptions: { removeOnComplete: true, removeOnFail: 100 } });

module.exports = { Queue, REDIS_URL, adEventQueue };