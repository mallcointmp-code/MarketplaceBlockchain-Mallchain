// backend/workers/adBillingWorker.js
// Worker to aggregate unbilled ad events and deduct spend from ad escrow
const AdEvent = require('../models/AdEvent.js');
const AdTransaction = require('../models/AdTransaction.js');
const { releaseEscrow } = require('../services/adsService.js');

const CLICK_PRICE = 0.20;       // 0.20 KSH per click (example)
const IMPRESSION_PRICE = 0.01;  // 0.01 per view

module.exports = async function processAdEvents() {
  console.log('🔄 Processing ad billing...');

  // Find a batch of unbilled events
  const unbilled = await AdEvent.find({ billed: { $ne: true } }).limit(800);

  for (const ev of unbilled) {
    try {
      let cost = 0;
      if (ev.eventType === 'impression') cost = IMPRESSION_PRICE;
      if (ev.eventType === 'click') cost = CLICK_PRICE;

      if (!ev.adId) {
        ev.billed = true; // skip
        await ev.save();
        continue;
      }

      // Release escrow (create ad_spend transaction and increment ad.spent)
      await releaseEscrow(ev.adId, cost, `Auto-billing for ${ev.eventType}`);

      ev.billed = true;
      ev.billedAt = new Date();
      await ev.save();
    } catch (err) {
      console.error('billing error for event', ev._id, err.message);
      // do not mark billed so it will be retried
    }
  }

  console.log('✔ Billing processed:', unbilled.length);
}

// Run periodically
setInterval(() => {
  processAdEvents().catch(err => console.error('adBillingWorker failed', err));
}, 5000);


module.exports = { AdEvent, AdTransaction, CLICK_PRICE, IMPRESSION_PRICE, unbilled };