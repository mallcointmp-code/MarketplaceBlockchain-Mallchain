// backend/controllers/adEventsController.js
const AdEvent = require('../models/AdEvent.js');
const Ad = require('../models/Ad.js');

/**
 * Impression and click endpoints (called from frontend AdTile)
 * - impressions increment quickly and stored as AdEvent documents for later aggregation
 * - clicks also stored; on click you could optionally immediately charge per-click budget
 */

export async function logImpression(req, res) {
  try {
    const { adId } = req.body;
    await AdEvent.create({ adId, eventType: "impression", userId: req.user?._id, meta: { ua: req.headers["user-agent"], ip: req.ip } });
    // lightweight response
    res.json({ ok: true });
  } catch (err) {
    console.error("logImpression", err);
    res.status(500).json({ error: "impression error" });
  }
};

export async function logClick(req, res) {
  try {
    const { adId } = req.body;
    await AdEvent.create({ adId, eventType: "click", userId: req.user?._id, meta: { ua: req.headers["user-agent"], ip: req.ip } });

    // optional: immediate ad spending policy: decrement ad budget by perClickRate and create AdTransaction+WalletTransaction.
    // For now we return OK and an admin worker or cron will aggregate events and consume budget.
    res.json({ ok: true });
  } catch (err) {
    console.error("logClick", err);
    res.status(500).json({ error: "click error" });
  }
};

module.exports = { logImpression, logClick };

// CommonJS compatibility
try {
  if (typeof module !== 'undefined' && module.exports) {
    if (typeof exports !== 'undefined' && exports && exports.default) module.exports = exports.default;
    module.exports.default = module.exports;
  }
} catch (e) {}

module.exports = { AdEvent, Ad };