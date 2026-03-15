const redis = require('../config/redis.js');

module.exports = function require2FA({ redisKeyPrefix = "2fa:" } = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.user && req.user._id;
      if (!userId) return res.status(401).json({ error: "Unauthenticated" });

      const key = `${redisKeyPrefix}${String(userId)}`;
      try {
        const ok = redis && redis.get ? await redis.get(key) : null;
        if (ok) {
          // consume single-use flag
          try { if (redis && redis.del) await redis.del(key); } catch (e) {}
          return next();
        }
      } catch (e) {
        console.warn('require2FA redis check failed', e && e.message);
      }

      return res.status(403).json({ error: "2FA required" });
    } catch (err) {
      console.error("require2FA err", err);
      return res.status(500).json({ error: "server error" });
    }
  };
}

module.exports = { redis, userId, key, ok };