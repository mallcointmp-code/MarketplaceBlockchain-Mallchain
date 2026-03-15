const AdEvent = require('../models/AdEvent.js');
const Ad = require('../models/Ad.js');
const mongoose = require('mongoose');

/**
 * Return aggregated metrics for an ad or creator:
 * GET /api/analytics/ad/:adId?from=2025-01-01&to=2025-01-07&bucket=day
 */
const adTimeSeries = async (req, res) => {
  try {
    const { adId } = req.params;
    const { from, to, bucket = "day" } = req.query;
    const match = { adId: mongoose.Types.ObjectId(adId) };
    if (from || to) match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);

    // bucket grouping
    const groupFormat = bucket === "hour" ? { $dateToString: { format: "%Y-%m-%dT%H:00:00Z", date: "$createdAt" } } : { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };

    const pipeline = [
      { $match: match },
      { $group: { _id: { bucket: groupFormat, type: "$type" }, count: { $sum: 1 } } },
      { $sort: { "_id.bucket": 1 } }
    ];
    const rows = await AdEvent.aggregate(pipeline).allowDiskUse(true);
    // reshape
    const result = {};
    for (const r of rows) {
      const key = r._id.bucket;
      result[key] = result[key] || { impressions: 0, clicks: 0, engagements: 0 };
      if (r._id.type === "impression") result[key].impressions = r.count;
      if (r._id.type === "click") result[key].clicks = r.count;
      if (r._id.type === "engagement") result[key].engagements = r.count;
    }
    res.json({ ok: true, series: result });
  } catch (err) {
    console.error("adTimeSeries err", err);
    res.status(500).json({ error: "analytics failed" });
  }
};

/**
 * Ad summary: impressions, clicks, CTR, spend
 */
const adSummary = async (req, res) => {
  try {
    const { adId } = req.params;
    const totalImpr = await AdEvent.countDocuments({ adId, type: "impression" });
    const totalClicks = await AdEvent.countDocuments({ adId, type: "click" });

    // spend via AdTransaction
    const AdTransaction = require("../models/AdTransaction.js");
    const agg = await AdTransaction.aggregate([
      { $match: { adId: mongoose.Types.ObjectId(adId), type: "charge" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const spend = (agg[0] && agg[0].total) || 0;
    const ctr = totalImpr > 0 ? (totalClicks / totalImpr) : 0;
    res.json({ ok: true, impressions: totalImpr, clicks: totalClicks, ctr, spend });
  } catch (err) {
    console.error("adSummary err", err);
    res.status(500).json({ error: "summary failed" });
  }
};

module.exports = { adTimeSeries, adSummary };