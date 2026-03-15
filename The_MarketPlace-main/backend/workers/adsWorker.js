// backend/workers/adsWorker.js
const Queue = require('bull');
const dotenv = require('dotenv');
const { chargeAdEvent } = require('../services/adsService.js');
const redisConfig = require('../config/redis.js');

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const adEventsQueue = new Queue("ad-events", REDIS_URL);

// job data: { adId, userId, ip, ua, eventType, eventId }
adEventsQueue.process(50, async (job) => {
  const data = job.data;
  try {
    // run fraud checks here (advanced)
    const res = await chargeAdEvent({
      adId: data.adId,
      userId: data.userId,
      ip: data.ip,
      ua: data.ua,
      eventType: data.eventType,
      eventId: data.eventId
    });
    return { ok: true, res };
  } catch (err) {
    console.error("ad worker error", err);
    throw err; // worker will retry depending on job settings
  }
});

// optional: a small function to enqueue events
export async function enqueueAdEvent(payload) {
  // rapid dedupe should be performed before enqueue (client or short redis check)
  await adEventsQueue.add(payload, { attempts: 4, backoff: { type: "exponential", delay: 1000 } });
}

module.exports = adEventsQueue;

module.exports = { Queue, dotenv, redisConfig, REDIS_URL, adEventsQueue, data, res };