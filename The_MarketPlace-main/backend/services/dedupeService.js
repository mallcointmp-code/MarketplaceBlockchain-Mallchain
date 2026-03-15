const redis = require('../config/redis.js');

export async function checkAndMarkEvent(adId, userId, ip, eventType, windowSeconds = 60) {
  try {
    const uid = userId || "anon";
    const key = `ad_dedupe:${eventType}:${adId}:${uid}:${Math.floor(Date.now()/ (windowSeconds*1000))}`;
    const res = await redis.set(key, "1", "NX", "EX", windowSeconds);
    return res === null; // true => already seen
  } catch (err) {
    console.warn("dedupe redis error", err?.message || err);
    return false;
  }
}

module.exports = { redis, uid, key, res };