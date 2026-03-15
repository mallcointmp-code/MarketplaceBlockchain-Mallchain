const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const DeliveryTask = require('../models/DeliveryTask');
const directionsService = require('../services/directionsService');

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/the_market_place';
const BATCH_SIZE = Number(process.env.MIGRATE_BATCH_SIZE || 20);
const MAX_RUN = Number(process.env.MIGRATE_MAX_RUN || 1000);
const SLEEP_MS_BETWEEN_BATCHES = Number(process.env.MIGRATE_SLEEP_MS || 1000);

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function processBatch(batch) {
  const promises = batch.map(async (task) => {
    const pickup = task.pickupLocation || {};
    const dropoff = task.dropoffLocation || {};

    if (!pickup.lat || !pickup.lng || !dropoff.lat || !dropoff.lng) {
      console.log(`[skip ${task._id}] missing coords`);
      return { id: task._id, skipped: true, reason: 'missing coords' };
    }

    try {
      const routeInfo = await directionsService.fetchRoutePolylineWithCache(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
      if (!routeInfo || !routeInfo.encoded) {
        console.warn(`[no-route ${task._id}] directions returned empty`);
        return { id: task._id, updated: false, reason: 'no route' };
      }

      const update = {
        routePolylineEncoded: routeInfo.encoded,
        routePolylineCoords: routeInfo.decoded || [],
        routeDistanceMeters: routeInfo.distanceMeters || null,
        routeDurationSec: routeInfo.durationSec || null
      };
      if (!task.expectedDurationSec && routeInfo.durationSec) update.expectedDurationSec = routeInfo.durationSec;

      await DeliveryTask.findByIdAndUpdate(task._id, update, { new: true });
      console.log(`[updated ${task._id}] encoded saved (coords ${update.routePolylineCoords.length})`);
      return { id: task._id, updated: true };
    } catch (err) {
      console.error(`[error ${task._id}]`, err && (err.message || err));
      return { id: task._id, updated: false, error: err && (err.message || String(err)) };
    }
  });

  const results = await Promise.allSettled(promises);
  return results;
}

async function run() {
  console.log('Connecting to Mongo:', MONGO);
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });

  console.log('Migration started: scanning DeliveryTask for missing routePolylineEncoded...');
  let processed = 0;

  const cursor = DeliveryTask.find({
    $or: [
      { routePolylineEncoded: { $exists: false } },
      { routePolylineEncoded: null },
      { routePolylineEncoded: '' }
    ]
  }).cursor();

  const tasksToProcess = [];
  for await (const doc of cursor) {
    tasksToProcess.push(doc);
    if (tasksToProcess.length >= BATCH_SIZE) {
      console.log(`Processing batch of ${tasksToProcess.length} (processed so far: ${processed})`);
      await processBatch(tasksToProcess);
      processed += tasksToProcess.length;
      tasksToProcess.length = 0;
      if (processed >= MAX_RUN) break;
      await sleep(SLEEP_MS_BETWEEN_BATCHES);
    }
  }

  if (tasksToProcess.length > 0 && processed < MAX_RUN) {
    console.log(`Processing final batch of ${tasksToProcess.length}`);
    await processBatch(tasksToProcess);
    processed += tasksToProcess.length;
  }

  console.log('Migration finished. Total processed:', processed);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Migration script error:', err && (err.message || err));
  process.exit(1);
});
