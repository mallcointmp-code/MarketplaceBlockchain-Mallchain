/**
 * Worker: consumes 'ad-events' queue and:
 * - dedupes events (via dedupeService)
 * - runs fraud detection (fraudService)
 * - charges for non-fraud events (adsService.chargeForUnit)
 * - records AdTransaction & WalletTransaction inside adsService
 * - on fraud (suspicious) either skip charge, mark for review, or charge reduced amount
 */

const Queue = require('bull');
const Ad = require('../models/Ad.js');
const CampaignEvent = require('../models/CampaignEvent.js');
const { checkAndMarkEvent } = require('../services/dedupeService.js');
const { evaluateEventRisk } = require('../services/fraudService.js');
const { chargeAdEvent, refundEscrow as releaseEscrow } = require('../services/adsService.js');
const redis = require('../config/redis.js');
const config = require('../config/env.js');

const adEventsQueue = new Queue("ad-events", config.REDIS_URL);

const CONCURRENCY = Number(process.env.AD_WORKER_CONCURRENCY || 5);

adEventsQueue.process(CONCURRENCY, async (job) => {
  const { adId, type, userId, ip, ua } = job.data;
  try {
    const dup = await checkAndMarkEvent(adId, userId, ip, type, 60);
    if (dup) return Promise.resolve({ skipped: true, reason: "duplicate" });

    const ad = await Ad.findById(adId);
    if (!ad || ad.status !== "approved") return Promise.reject(new Error("Ad not available"));
    const unitPrice = ad.pricePerUnit || 10;

    const risk = await evaluateEventRisk(adId, userId, ip, ua, type);
    if (risk.suspicious) {
      const key = `ad_suspicious:${adId}`;
      await redis.lpush(key, JSON.stringify({ job: job.id, adId, userId, ip, ua, type, risk, ts: Date.now() }));
      await redis.expire(key, 60*60*24);
      return Promise.resolve({ suspicious: true, score: risk.score });
    }

    await chargeAdEvent({ adId, userId, ip, ua, type, eventId: job.id });

    if (ad.reservedEscrow - unitPrice <= 0) {
      ad.status = "paused";
      await ad.save();
    }

    return Promise.resolve({ charged: true, amount: unitPrice });
  } catch (err) {
    console.error("adEvents worker error", err);
    if (err.message && err.message.includes("Insufficient escrow")) {
      await redis.lpush(`ad_errors:${adId}`, JSON.stringify({ job: job.id, error: err.message, ts: Date.now() }));
      await redis.expire(`ad_errors:${adId}`, 60*60*24);
      try { const ad = await Ad.findById(adId); if (ad) { ad.status = "paused"; await ad.save(); } } catch(e){}
      return Promise.reject(err);
    }
    return Promise.reject(err);
  }
});

adEventsQueue.on("failed", (job, err) => { console.error("Job failed", job.id, err?.message || err); });
adEventsQueue.on("completed", (job, result) => {});
console.log("Ad events worker started.");

module.exports = { Queue, Ad, CampaignEvent, redis, config, adEventsQueue, CONCURRENCY, dup, ad, unitPrice, risk, key, ad };