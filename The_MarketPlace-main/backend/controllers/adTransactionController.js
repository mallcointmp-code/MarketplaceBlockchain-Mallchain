const AdTransaction = require('../models/AdTransaction.js');
const adsService = require('../services/adsService.js');

export async function listAdTransactions(req, res) {
  try {
    const txs = await AdTransaction.find({}).sort({ reservedAt: -1 }).limit(200);
    res.json(txs);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

export async function completeAdController(req, res) {
  try {
    const { adId, payoutTo } = req.body;
    const tx = await adsService.completeAd(adId, payoutTo || null);
    res.json({ ok: true, tx });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

export async function refundAdController(req, res) {
  try {
    const { adId } = req.body;
    const tx = await adsService.refundAd(adId);
    res.json({ ok: true, tx });
  } catch (err) { res.status(500).json({ error: err.message }); }
}
module.exports = { listAdTransactions, completeAdController, refundAdController };

// CommonJS compatibility
try {
  if (typeof module !== 'undefined' && module.exports) {
    if (typeof exports !== 'undefined' && exports && exports.default) module.exports = exports.default;
    module.exports.default = module.exports;
  }
} catch (e) {}

module.exports = { AdTransaction, adsService, txs, tx, tx };