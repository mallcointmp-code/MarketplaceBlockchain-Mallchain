const redis = require('../config/redis.js');

export async function evaluateEventRisk(adId, userId, ip, ua, eventType) {
  try {
    const ipKey = `ad_fraud_ip:${ip}:${adId}`;
    const ipCount = Number(await redis.incr(ipKey));
    if (ipCount === 1) await redis.expire(ipKey, 60*60);

    const userKey = `ad_fraud_user:${userId || 'anon'}:${adId}`;
    const uCount = Number(await redis.incr(userKey));
    if (uCount === 1) await redis.expire(userKey, 60*60);

    let score = 0;
    let reasons = [];
    if (ipCount > 20) { score += 70; reasons.push("ip_spike"); }
    if (uCount > 10) { score += 40; reasons.push("user_spike"); }
    if (!ua || ua.length < 10) { score += 20; reasons.push("suspicious_ua"); }

    const suspicious = score >= 50;
    return { suspicious, score, reason: reasons.join(",") };
  } catch (err) {
    return { suspicious: false, score: 0, reason: "" };
  }
}

module.exports = { redis, ipKey, ipCount, userKey, uCount, suspicious };