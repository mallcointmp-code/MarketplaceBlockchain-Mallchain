const rateLimit = require('express-rate-limit');

// Impression limiter: allow up to 120 impressions per 60s per IP+campaign
const impressionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many impressions from this client, slow down' },
  keyGenerator: (req /*, res*/) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] || req.connection.remoteAddress);
    const campaign = req.params.campaignId || (req.body && req.body.campaignId) || 'global';
    return `${ip}:${campaign}`;
  }
});

// Click limiter: allow up to 60 clicks per 60s per IP+campaign
const clickLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many clicks from this client, slow down' },
  keyGenerator: (req /*, res*/) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] || req.connection.remoteAddress);
    const campaign = req.params.campaignId || (req.body && req.body.campaignId) || 'global';
    return `${ip}:${campaign}`;
  }
});

module.exports = { rateLimit, impressionLimiter, ip, campaign, clickLimiter, ip, campaign };