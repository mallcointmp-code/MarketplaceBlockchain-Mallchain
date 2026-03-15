const crypto = require('crypto');

const SECRET = process.env.TASK_SIGNING_SECRET || 'change_this_task_secret';

function signPayload(payload) {
  const json = JSON.stringify(payload);
  const h = crypto.createHmac('sha256', SECRET).update(json).digest('hex');
  const token = Buffer.from(json).toString('base64') + '.' + h;
  return token;
}

function verifyToken(token) {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 2) return null;
    const json = Buffer.from(parts[0], 'base64').toString('utf8');
    const sig = parts[1];
    const expected = crypto.createHmac('sha256', SECRET).update(json).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return JSON.parse(json);
  } catch (e) { return null; }
}

module.exports = { signPayload, verifyToken };
