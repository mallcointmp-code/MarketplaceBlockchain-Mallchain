const Ad = require('../models/Ad.js');
const { releaseEscrow } = require('./adsService.js');

export async function rollbackCharge(adId, amount, reason = "fraud_refund") {
  return await releaseEscrow(adId, amount, reason);
}

module.exports = { Ad };