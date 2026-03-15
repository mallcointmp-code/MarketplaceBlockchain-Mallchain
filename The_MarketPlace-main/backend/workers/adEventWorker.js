const Bull = require('bull');
const redisClient = require('../config/redis.js');
const adService = require('../services/adsService.js');
const crypto = require('crypto');

const redisUrl = process.env.BULL_REDIS || process.env.REDIS_URL || "redis://127.0.0.1:6379";
const adQueue = new Bull("ad_events", redisUrl);

const DEDUP_TTL = 60; // seconds

function dedupKey(adId, userId) {
  const now = Math.floor(Date.now() / 60000);
  const base = `${adId}:${userId}:${now}`;
  return `ad:dedup:${crypto.createHash("sha1").update(base).digest("hex")}`;
}

async function basicFraudCheck({ adId, userId, ip, userAgent }) {
  try {
    const key = dedupKey(adId, userId);
    // setnx returns 1 on success, 0 if already present
    const set = await redisClient.setnx(key, "1");
    if (set === 0) return { ok: false, reason: "duplicate_event" };
    await redisClient.expire(key, DEDUP_TTL);

    const ipKey = `ad:ip:${ip}:${Math.floor(Date.now()/60000)}`;
    const ipCount = await redisClient.incr(ipKey);
    if (ipCount === 1) await redisClient.expire(ipKey, 60);
    if (ipCount > 50) return { ok: false, reason: "ip_rate" };

    return { ok: true };
  } catch (err) {
    console.error("fraud check err", err);
    return { ok: true }; // fail-open if redis unavailable
  }
}

const PRICE_PER_IMPRESSION = Number(process.env.PRICE_PER_IMPRESSION || 0.1);
const PRICE_PER_CLICK = Number(process.env.PRICE_PER_CLICK || 10);

adQueue.process(async (job) => {
  const { adId, sellerId, type, userId, ip, userAgent } = job.data;
  try {
    const check = await basicFraudCheck({ adId, userId, ip, userAgent });
    if (!check.ok) return { ok: false, reason: check.reason };

    const amount = type === "click" ? PRICE_PER_CLICK : PRICE_PER_IMPRESSION;
    const charge = await adService.chargeEscrow({ adId, sellerId, amount, eventMeta: { type, userId, ip, userAgent } });
    return { ok: true, chargeId: charge._id };
  } catch (err) {
    console.error("ad event job error", err);
    throw err;
  }
});

export { adQueue };
module.exports = adQueue;

module.exports = { Bull, redisClient, adService, crypto, redisUrl, adQueue, DEDUP_TTL, now, base, key, set, ipKey, ipCount, PRICE_PER_IMPRESSION, PRICE_PER_CLICK, check, amount, charge };