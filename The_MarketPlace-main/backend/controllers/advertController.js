const Advertisement = require('../models/Advertisement.js');
const Wallet = require('../models/Wallet.js');
const Transaction = require('../models/Transaction.js');
const { recordTx } = require('../services/walletService.js');

// seller creates ad draft
async function createAd(req, res) {
  try {
    const sellerId = req.user && req.user._id;
    if (!sellerId) return res.status(401).json({ error: 'auth required' });
    const payload = req.body || {};
    const ad = new Advertisement({ ...payload, sellerId });
    await ad.save();
    res.json({ ok: true, ad });
  } catch (err) {
    console.error('createAd', err);
    res.status(500).json({ error: 'create ad failed' });
  }
}

// seller requests to publish: compute price and debit wallet
async function requestPublish(req, res) {
  try {
    const adId = req.params.adId;
    const ad = await Advertisement.findById(adId);
    if (!ad) return res.status(404).json({ error: 'ad not found' });
    if (!String(ad.sellerId).equals(String(req.user._id))) return res.status(403).json({ error: 'not owner' });

    const ratePerImpression = Number(process.env.AD_RATE_PER_IMPRESSION || 0.1);
    const priceKsh = (ad.impressionsBought || 0) * ratePerImpression || Number(ad.costKsh || 0);

    const wallet = await Wallet.findOne({ ownerId: req.user._id });
    if (!wallet || (wallet.mallmoney || 0) < priceKsh) return res.status(402).json({ error: 'insufficient funds' });

    wallet.mallmoney = (wallet.mallmoney || 0) - priceKsh;
    await wallet.save();

    await Transaction.create({
      walletId: wallet._id,
      type: 'fee',
      amount: priceKsh,
      currency: 'KSH',
      counterparty: 'ad_purchase',
      meta: { adId }
    });

    try {
      await recordTx(wallet._id, {
        type: 'ad_purchase',
        amount: priceKsh,
        currency: 'KSH',
        counterparty: 'ad_purchase',
        meta: { adId }
      });
    } catch (e) { /* best effort */ }

    ad.costKsh = priceKsh;
    ad.status = 'pending';
    ad.updatedAt = new Date();
    await ad.save();

    const io = req.app.get('io');
    if (io) io.to('admin:ads').emit('ad:pending', { adId: ad._id });

    res.json({ ok: true, ad });
  } catch (err) {
    console.error('requestPublish', err);
    res.status(500).json({ error: 'request publish failed' });
  }
}

// admin updates ad status
async function adminUpdateAdStatus(req, res) {
  try {
    const { adId } = req.params;
    const { status, adminNotes } = req.body;
    if (!['approved','rejected','paused','active','ended'].includes(status)) return res.status(400).json({ error: 'invalid status' });
    const ad = await Advertisement.findByIdAndUpdate(
      adId,
      { status, adminNotes, updatedAt: new Date() },
      { new: true }
    );
    res.json({ ok: true, ad });
  } catch (err) {
    console.error('adminUpdateAdStatus', err);
    res.status(500).json({ error: 'admin update failed' });
  }
}

// public: record impression (basic count; rate-limit/dedupe recommended)
async function recordImpression(req, res) {
  try {
    const { adId } = req.params;
    const ad = await Advertisement.findById(adId);
    if (!ad) return res.status(404).json({ error: 'ad not found' });
    ad.impressionsServed = (ad.impressionsServed || 0) + 1;
    if (ad.impressionsBought && ad.impressionsServed >= ad.impressionsBought) ad.status = 'ended';
    await ad.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('recordImpression', err);
    res.status(500).json({ error: 'impression failed' });
  }
}

// public: record click
async function recordClick(req, res) {
  try {
    const { adId } = req.params;
    const ad = await Advertisement.findById(adId);
    if (!ad) return res.status(404).json({ error: 'ad not found' });
    ad.clicks = (ad.clicks || 0) + 1;
    await ad.save();
    res.json({ ok: true, redirectTo: ad.url });
  } catch (err) {
    console.error('recordClick', err);
    res.status(500).json({ error: 'click failed' });
  }
}

// get ad / stats
async function getAd(req, res) {
  try {
    const ad = await Advertisement.findById(req.params.adId).lean();
    if (!ad) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true, ad });
  } catch (err) {
    console.error('getAd', err);
    res.status(500).json({ error: 'get ad failed' });
  }
}

// CommonJS exports
module.exports = {
  Advertisement,
  Wallet,
  Transaction,
  createAd,
  requestPublish,
  adminUpdateAdStatus,
  recordImpression,
  recordClick,
  getAd
};
