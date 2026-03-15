const redis = require('../config/redis');

// Cursor-based SCAN endpoint
exports.scanKeys = async (req, res) => {
  try {
    if (!redis) return res.status(500).json({ error: 'redis not configured' });
    const cursor = req.query.cursor || '0';
    const count = Math.min(1000, Number(req.query.count || 100));
    const pattern = req.query.pattern || 'polyline:*';

    const reply = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', count);
    // ioredis returns [nextCursor, keys]
    const nextCursor = reply[0];
    const keys = reply[1] || [];

    const keyInfos = await Promise.all(keys.map(async (k) => {
      try {
        const ttl = await redis.ttl(k);
        return { key: k, ttl };
      } catch (err) {
        return { key: k, ttl: -2 };
      }
    }));

    const hits = Number(await redis.get('polyline:stats:hits') || 0);
    const misses = Number(await redis.get('polyline:stats:misses') || 0);

    res.json({ nextCursor, keys: keyInfos, hits, misses });
  } catch (err) {
    console.error('scanKeys err', err);
    res.status(500).json({ error: 'scan failed', details: err?.message || String(err) });
  }
};
