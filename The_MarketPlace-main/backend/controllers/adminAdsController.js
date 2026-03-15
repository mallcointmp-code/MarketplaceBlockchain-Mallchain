const Ad = require('../models/Ad.js');
const { releaseEscrow } = require('../services/adsService.js');

/**
 * List pending ads
 */
const listPendingAds = async (req, res) => {
  try {
    const ads = await Ad.find({ status: "pending" }).sort({ createdAt: -1 }).limit(200);
    res.json({ ok: true, ads });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "list failed" });
  }
};

/**
 * Approve ad (admin) — moves status to running
 */
const approveAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const adminId = req.user._id;
    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ error: "not found" });
    ad.status = "approved";
    ad.approvedBy = adminId;
    ad.updatedAt = new Date();
    await ad.save();
    res.json({ ok: true, ad });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "approve failed" });
  }
};

/**
 * Reject ad (admin) — refund escrow back to creator
 */
const rejectAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;
    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ error: "not found" });

    // refund reserved escrow to creator (ad.escrowReserved)
    const amount = ad.escrowReserved || 0;
    if (amount > 0) {
      await releaseEscrow(ad.creatorId, ad._id, amount, "refund");
    }

    ad.status = "rejected";
    ad.moderationNotes = reason || "rejected by admin";
    ad.updatedAt = new Date();
    await ad.save();
    res.json({ ok: true, ad });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "reject failed" });
  }
};

module.exports = { Ad, listPendingAds, ads, approveAd, adminId, ad, rejectAd, adminId, ad, amount };