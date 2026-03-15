const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const ConversionRecord = require('../models/ConversionRecord');
const PlatformConfig = require('../models/PlatformConfig');

function secondThursdayOfMonth(year, month) {
  // month: 0-based
  const first = new Date(year, month, 1);
  // get day of week (0=Sun..6=Sat)
  const dow = first.getDay();
  // Thursday === 4
  const firstThursday = 1 + ((4 - dow + 7) % 7);
  const secondThursday = firstThursday + 7;
  return new Date(year, month, secondThursday);
}

async function runConversionIfDue() {
  try {
    const now = new Date();
    const target = secondThursdayOfMonth(now.getFullYear(), now.getMonth());
    if (now.getFullYear() !== target.getFullYear() || now.getMonth() !== target.getMonth() || now.getDate() !== target.getDate()) {
      return; // not the day
    }

    // check last run
    const cfg = await PlatformConfig.findOne({ key: 'lastConversionRun' }).lean();
    const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    if (cfg && cfg.value === todayKey) return; // already run this month

    const rate = Number(process.env.MALLPOINTS_TO_MALLCOINS_RATE || process.env.MALLPOINTS_CONVERSION_RATE || 0.31);

    // find wallets with mallpoints > 0
    const cursor = Wallet.find({ mallpoints: { $gt: 0 } }).cursor();
    const { runInTransaction } = require('../utils/transactionHelper.js');

    for (let w = await cursor.next(); w != null; w = await cursor.next()) {
      try {
        await runInTransaction(async (session) => {
          const wallet = await Wallet.findById(w._id).session(session);
          const pts = Number(wallet.mallpoints || 0);
          if (pts <= 0) return;

          const coins = Number((pts * rate).toFixed(6));
          // zero mallpoints
          wallet.mallpoints = 0;
          wallet.mallcoins = Number(((wallet.mallcoins || 0) + coins).toFixed(6));
          await wallet.save({ session });

          const tx = new WalletTransaction({ ownerId: wallet.ownerId || wallet.userId || wallet._id, type: 'conversion', amount: coins, currency: 'MALLCOIN', balanceBefore: null, balanceAfter: wallet.mallcoins, meta: { convertedFromMallPoints: pts, rate } });
          await tx.save({ session });

          const rec = new ConversionRecord({ userId: wallet.ownerId || wallet.userId || wallet._id, mallpoints: pts, mallcoins: coins, rate });
          await rec.save({ session });
        });
      } catch (err) {
        console.error('conversion per-wallet err', err);
      }
    }

    // store last run
    await PlatformConfig.findOneAndUpdate({ key: 'lastConversionRun' }, { value: todayKey }, { upsert: true });
    console.log('[conversion] run completed for', todayKey, 'rate=', rate);
  } catch (err) {
    console.error('runConversionIfDue err', err);
  }
}

let intervalHandle = null;
function start(app) {
  // run every hour and on start
  runConversionIfDue();
  intervalHandle = setInterval(runConversionIfDue, 1000 * 60 * 60);
  // expose for manual trigger
  app.set('conversionJob', { run: runConversionIfDue });
}

function stop() { if (intervalHandle) clearInterval(intervalHandle); }

module.exports = { start, stop, runConversionIfDue };
