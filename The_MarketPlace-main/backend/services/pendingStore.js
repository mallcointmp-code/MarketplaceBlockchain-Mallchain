const IORedis = require('ioredis');

let redis = null;
if (process.env.REDIS_URL) {
  try { redis = new IORedis(process.env.REDIS_URL); } catch (e) { console.warn('Failed to connect to Redis:', e.message || e); redis = null; }
}

const mem = { pending: {}, qr: {} };
const prefix = (key, type) => `${type}:${key}`;

export async function setPendingWithdrawal(token, obj, ttlSec = 600) {
  if (redis) {
    const k = prefix(token, 'pending');
    await redis.set(k, JSON.stringify(obj));
    if (ttlSec) await redis.expire(k, ttlSec);
    return true;
  }
  mem.pending[token] = obj;
  return true;
}

export async function getPendingWithdrawal(token) {
  if (redis) {
    const v = await redis.get(prefix(token, 'pending'));
    return v ? JSON.parse(v) : null;
  }
  return mem.pending[token] || null;
}

export async function deletePendingWithdrawal(token) {
  if (redis) {
    await redis.del(prefix(token, 'pending'));
    return true;
  }
  delete mem.pending[token];
  return true;
}

export async function setQr(id, obj, ttlSec = 3600) {
  if (redis) {
    const k = prefix(id, 'qr');
    await redis.set(k, JSON.stringify(obj));
    if (ttlSec) await redis.expire(k, ttlSec);
    return true;
  }
  mem.qr[id] = obj;
  return true;
}

export async function getQr(id) {
  if (redis) {
    const v = await redis.get(prefix(id, 'qr'));
    return v ? JSON.parse(v) : null;
  }
  return mem.qr[id] || null;
}

export async function deleteQr(id) {
  if (redis) {
    await redis.del(prefix(id, 'qr'));
    return true;
  }
  delete mem.qr[id];
  return true;
}

module.exports = {
  setPendingWithdrawal,
  getPendingWithdrawal,
  deletePendingWithdrawal,
  setQr,
  getQr,
  deleteQr
};

module.exports = { IORedis, mem, prefix, k, v, k, v };