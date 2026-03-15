import * as analyticsService from '../services/analyticsService.js';
const Product = require('../models/Product.js');

export async function sellerSummary(req, res) {
  try {
    const sellerId = req.user && req.user._id;
    if (!sellerId) return res.status(401).json({ error: 'auth required' });
    const summary = await analyticsService.getSellerSummary(sellerId);
    res.json({ ok: true, summary });
  } catch (e) { console.error('sellerSummary', e); res.status(500).json({ error: 'failed' }); }
};
export async function productDetails(req, res) {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId).lean();
    if (!product) return res.status(404).json({ error: 'not found' });
    const analytics = await analyticsService.getProductAnalytics(productId);
    res.json({ ok: true, product, analytics });
  } catch (e) { console.error('productDetails', e); res.status(500).json({ error: 'failed' }); }
};
export async function recordView(req, res) {
  try {
    const { productId } = req.body;
    const ip = req.ip;
    const ua = req.headers['user-agent'];
    await analyticsService.recordView({ productId, ip, ua });
    res.json({ ok: true });
  } catch (e) { console.error('recordView', e); res.status(500).json({ error: 'failed' }); }
};
module.exports = { sellerSummary, productDetails, recordView };

// CommonJS compatibility
try {
  if (typeof module !== 'undefined' && module.exports) {
    if (typeof exports !== 'undefined' && exports && exports.default) module.exports = exports.default;
    module.exports.default = module.exports;
  }
} catch (e) {}

module.exports = { Product, sellerId, summary, product, analytics, ip, ua };