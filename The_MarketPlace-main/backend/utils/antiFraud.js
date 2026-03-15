const DEFAULT_COOLDOWN_SECONDS = 60 * 60; // 1 hour default cooldown per task per IP/device

// Use Redis if available on app, otherwise fallback to in-memory Map
const memStore = new Map();

function _set(key, ttlSeconds) {
  if (!ttlSeconds) ttlSeconds = DEFAULT_COOLDOWN_SECONDS;
  if (global.__redisClient__) return global.__redisClient__.set(key, '1', 'EX', ttlSeconds);
  memStore.set(key, Date.now() + ttlSeconds * 1000);
  setTimeout(() => { if (memStore.has(key) && memStore.get(key) <= Date.now()) memStore.delete(key); }, ttlSeconds * 1000 + 1000);
}

function _get(key) {
  if (global.__redisClient__) return global.__redisClient__.get(key);
  const v = memStore.get(key);
  if (!v) return null;
  if (v <= Date.now()) { memStore.delete(key); return null; }
  return '1';
}

async function markIpTaskCooldown(app, taskId, ip, ttlSeconds) {
  try {
    const redis = app && app.get && app.get('redis');
    const key = `task:ip:${taskId}:${ip}`;
    if (redis && redis.set) return await redis.set(key, '1', 'EX', ttlSeconds || DEFAULT_COOLDOWN_SECONDS);
    return _set(key, ttlSeconds);
  } catch (e) { return null; }
}

async function checkIpTaskAllowed(app, taskId, ip) {
  try {
    const redis = app && app.get && app.get('redis');
    const key = `task:ip:${taskId}:${ip}`;
    if (redis && redis.get) {
      const v = await redis.get(key);
      return !v;
    }
    const v = _get(key);
    return !v;
  } catch (e) { return true; }
}

async function markDeviceTaskCooldown(app, taskId, fingerprint, ttlSeconds) {
  try {
    const redis = app && app.get && app.get('redis');
    const key = `task:device:${taskId}:${fingerprint}`;
    if (redis && redis.set) return await redis.set(key, '1', 'EX', ttlSeconds || DEFAULT_COOLDOWN_SECONDS);
    return _set(key, ttlSeconds);
  } catch (e) { return null; }
}

async function checkDeviceTaskAllowed(app, taskId, fingerprint) {
  try {
    const redis = app && app.get && app.get('redis');
    const key = `task:device:${taskId}:${fingerprint}`;
    if (redis && redis.get) {
      const v = await redis.get(key);
      return !v;
    }
    const v = _get(key);
    return !v;
  } catch (e) { return true; }
}

module.exports = {
  checkIpTaskAllowed,
  markIpTaskCooldown,
  checkDeviceTaskAllowed,
  markDeviceTaskCooldown,
  DEFAULT_COOLDOWN_SECONDS
};
