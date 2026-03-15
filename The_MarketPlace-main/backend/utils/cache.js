const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL || process.env.BULL_REDIS || 'redis://127.0.0.1:6379' });
client.on('error', err => console.error('Redis error:', err));
client.connect?.().catch(() => {});

export async function getOrSetCache(key, cb, ttl = 300) {
  try {
    const data = await client.get(key);
    if (data) return JSON.parse(data);
    const freshData = await cb();
    try { await client.setEx(key, ttl, JSON.stringify(freshData)); } catch (e) {}
    return freshData;
  } catch (err) {
    // On Redis errors, still return fresh data from cb
    return await cb();
  }
}

module.exports = { getOrSetCache };
module.exports = { redis, client, data, freshData };