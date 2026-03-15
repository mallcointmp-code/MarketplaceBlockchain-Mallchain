const Ad = require('../models/Ad.js');
const { reserveEscrow, chargeAdEvent } = require('../services/adsService.js');
const Wallet = require('../models/Wallet.js');

/**
 * Create ad (creator side)
 */
const createAd = async (req, res) => {
  try {
    const userId = req.user._id;
    const body = req.body;
    const ad = new Ad({ ...body, creatorId: userId, status: "pending", createdAt: new Date() });
    await ad.save();
    return res.json({ ok: true, ad });
  } catch (err) {
    console.error("createAd err", err);
    return res.status(500).json({ error: "create failed" });
  }
};

/**
 * Creator funds ad (reserve escrow) — API: /api/ads/:adId/fund
 * body: { amount }
 */
const fundAd = async (req, res) => {
  try {
    const userId = req.user._id;
    const { adId } = req.params;
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "invalid amount" });
    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ error: "ad not found" });
    if (!ad.creatorId.equals(userId)) return res.status(403).json({ error: "not owner" });

    await reserveEscrow(userId, adId, amount);
    ad.budget = (ad.budget || 0) + Number(amount);
    ad.escrowReserved = (ad.escrowReserved || 0) + Number(amount);
    await ad.save();

    return res.json({ ok: true, ad });
  } catch (err) {
    console.error("fundAd err", err);
    return res.status(500).json({ error: err.message || "fund failed" });
  }
};

/**
 * Serve targeted ads for a user (server-side selection)
 * POST /api/ads/serve
 * body: { categories: [], region, demographics:{...}, limit: 5}
 */
const serveAds = async (req, res) => {
  try {
    const { categories = [], region, demographics = {}, limit = 5 } = req.body;

    // basic targeting query
    const q = { status: "running" };

    if (categories.length) q.categories = { $in: categories };
    if (region) q.regions = { $in: [region] };

    // demographic filtering: store as range checks (simple)
    if (demographics.age) {
      q.$or = [
        { "demographics.ageMin": { $lte: demographics.age } },
        { "demographics.ageMin": { $exists: false } }
      ];
      q.$or.push({ "demographics.ageMax": { $gte: demographics.age } });
    }

    // Exclude paused/insufficient budget ads
    q.budget = { $gt: 0 };

    const ads = await Ad.find(q).sort({ createdAt: -1 }).limit(limit).lean();

    // you may implement further ranking (bid price, CTR) here
    return res.json({ ok: true, ads });
  } catch (err) {
    console.error("serveAds err", err);
    return res.status(500).json({ error: "serve failed" });
  }
};

/**
 * Record click or impression from frontend: POST /api/ads/:adId/event
 * body: { type: 'impression'|'click', eventId, ua, ip }
 * This endpoint will attempt to charge via adsService. It returns charged:true/false.
 */
const recordAdEvent = async (req, res) => {
  try {
    const { adId } = req.params;
    const { type, eventId } = req.body;
    const userId = req.user ? req.user._id : null;
    const ip = req.ip || req.headers["x-forwarded-for"] || null;
    const ua = req.headers["user-agent"] || req.body.ua || "";

    const result = await chargeAdEvent({ adId, userId, ip, ua, eventType: type, eventId });
    return res.json({ ok: true, result });
  } catch (err) {
    console.error("recordAdEvent err", err);
    return res.status(500).json({ error: err.message || "event failed" });
  }
};

/**
 * Admin approve: mark ad live
 */
const adminApproveAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ error: "Ad not found" });

    ad.status = "running";
    ad.approvedBy = req.user._id;
    ad.approvedAt = new Date();
    await ad.save();
    return res.json({ ok: true, ad });
  } catch (err) {
    console.error("adminApproveAd err", err);
    return res.status(500).json({ error: err.message || "approve failed" });
  }
};

/**
 * Admin reject: refund escrow and mark rejected
 */
const adminRejectAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { reason } = req.body;
    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ error: "Ad not found" });

    // if ad has budget/reservation, attempt refund via adsService.refund
    try {
      if (ad.budget && ad.budget > 0) {
        await releaseEscrow(ad.creatorId || ad.sellerId, ad._id, ad.budget, 'refund');
      }
    } catch (er) {
      console.warn('refund attempt failed during adminRejectAd', er && er.message);
    }

    ad.status = "rejected";
    ad.rejectedBy = req.user._id;
    ad.rejectedAt = new Date();
    ad.rejectReason = reason;
    await ad.save();

    return res.json({ ok: true, ad });
  } catch (err) {
    console.error("adminRejectAd err", err);
    return res.status(500).json({ error: err.message || "reject failed" });
  }
};

/**
 * Get seller's own ads
 * GET /api/ads/mine
 */
const getMyAds = async (req, res) => {
  try {
    const userId = req.user._id;
    const ads = await Ad.find({ creatorId: userId }).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, ads });
  } catch (err) {
    console.error("getMyAds err", err);
    return res.status(500).json({ error: "failed to fetch ads" });
  }
};

/**
 * Pause ad (seller)
 * POST /api/ads/:adId/pause
 */
const pauseAd = async (req, res) => {
  try {
    const userId = req.user._id;
    const { adId } = req.params;
    const ad = await Ad.findById(adId);

    if (!ad) return res.status(404).json({ error: "Ad not found" });
    if (!ad.creatorId.equals(userId)) return res.status(403).json({ error: "Not authorized" });
    if (ad.status !== "running") return res.status(400).json({ error: "Ad is not running" });

    ad.status = "paused";
    ad.pausedAt = new Date();
    await ad.save();

    return res.json({ ok: true, ad });
  } catch (err) {
    console.error("pauseAd err", err);
    return res.status(500).json({ error: err.message || "pause failed" });
  }
};

/**
 * Resume ad (seller)
 * POST /api/ads/:adId/resume
 */
const resumeAd = async (req, res) => {
  try {
    const userId = req.user._id;
    const { adId } = req.params;
    const ad = await Ad.findById(adId);

    if (!ad) return res.status(404).json({ error: "Ad not found" });
    if (!ad.creatorId.equals(userId)) return res.status(403).json({ error: "Not authorized" });
    if (ad.status !== "paused") return res.status(400).json({ error: "Ad is not paused" });
    if (ad.escrowReserved <= 0) return res.status(400).json({ error: "Insufficient budget, please add funds" });

    ad.status = "running";
    ad.resumedAt = new Date();
    await ad.save();

    return res.json({ ok: true, ad });
  } catch (err) {
    console.error("resumeAd err", err);
    return res.status(500).json({ error: err.message || "resume failed" });
  }
};


module.exports = {
  createAd,
  fundAd,
  serveAds,
  recordAdEvent,
  adminApproveAd,
  adminRejectAd,
  getMyAds,
  pauseAd,
  resumeAd
};