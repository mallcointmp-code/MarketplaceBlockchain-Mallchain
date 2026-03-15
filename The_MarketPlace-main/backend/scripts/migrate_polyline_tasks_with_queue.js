const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const Bottleneck = require('bottleneck');

dotenv.config();

const DeliveryTask = require('../models/DeliveryTask');
const directionsService = require('../services/directionsService');

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/the_market_place';
const BATCH_SIZE = Number(process.env.MIGRATE_BATCH_SIZE || 20);
const MAX_RUN = Number(process.env.MIGRATE_MAX_RUN || 2000);
const SLEEP_MS_BETWEEN_BATCHES = Number(process.env.MIGRATE_SLEEP_MS || 1000);

const GLOBAL_RESERVOIR = Number(process.env.MIGRATE_GLOBAL_RESERVOIR || 50);
const GLOBAL_RESERVOIR_REFRESH_MS = Number(process.env.MIGRATE_RESERVOIR_REFRESH_MS || 60 * 1000);
const GLOBAL_MIN_TIME = Number(process.env.MIGRATE_MIN_TIME || 100);

const LOG_DIR = path.join(process.cwd(), 'backend', 'migrations');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_FILE = path.join(LOG_DIR, 'polyline_migration_log.csv');
if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, 'taskId,updated,reason,notes,timestamp\n', { encoding: 'utf8' });

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function csvLine(fields) {
  return fields.map(v => { if (v === null || v === undefined) return ''; const s = String(v).replace(/"/g, '""'); if (s.includes(',')||s.includes('\n')||s.includes('"')) return `"${s}"`; return s; }).join(',') + '\n';
}

const globalLimiter = new Bottleneck({
  reservoir: GLOBAL_RESERVOIR,
  reservoirRefreshAmount: GLOBAL_RESERVOIR,
  reservoirRefreshInterval: GLOBAL_RESERVOIR_REFRESH_MS,
  minTime: GLOBAL_MIN_TIME
});

const group = new Bottleneck.Group({ maxConcurrent: 1, minTime: 0 });

async function processTask(task) {
  const p = task.pickupLocation || {};
  const d = task.dropoffLocation || {};
  if (!p.lat || !p.lng || !d.lat || !d.lng) {
    fs.appendFileSync(LOG_FILE, csvLine([String(task._id), 'false', 'missing_coords', '', new Date().toISOString()]));
    return;
  }

  const keyString = `${Number(p.lat).toFixed(6)}|${Number(p.lng).toFixed(6)}|${Number(d.lat).toFixed(6)}|${Number(d.lng).toFixed(6)}`;
  const keyHash = require('crypto').createHash('sha1').update(keyString).digest('hex');
  const odKey = `od_${keyHash}`;

  try {
    const routeInfo = await globalLimiter.schedule(() => group.key(odKey).schedule(() => directionsService.fetchRoutePolylineWithCache(p.lat, p.lng, d.lat, d.lng)));
    if (!routeInfo || !routeInfo.encoded) {
      fs.appendFileSync(LOG_FILE, csvLine([String(task._id), 'false', 'no_route', JSON.stringify(routeInfo || {}), new Date().toISOString()]));
      return;
    }

    const update = {
      routePolylineEncoded: routeInfo.encoded,
      routePolylineCoords: routeInfo.decoded || [],
      routeDistanceMeters: routeInfo.distanceMeters || null,
      routeDurationSec: routeInfo.durationSec || null
    };
    if (!task.expectedDurationSec && routeInfo.durationSec) update.expectedDurationSec = routeInfo.durationSec;

    await DeliveryTask.findByIdAndUpdate(task._id, update);
    fs.appendFileSync(LOG_FILE, csvLine([String(task._id), 'true', 'updated', `coords:${(update.routePolylineCoords||[]).length}`, new Date().toISOString()]));
  } catch (err) {
    console.error('processTask error', err && (err.message || err));
    fs.appendFileSync(LOG_FILE, csvLine([String(task._id), 'false', 'error', err && (err.message || String(err)), new Date().toISOString()]));
  }
}

async function run() {
  console.log('Connecting to mongo:', MONGO);
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Starting migration (with throttling). Batch size:', BATCH_SIZE);
  let processed = 0;

  const cursor = DeliveryTask.find({ $or: [ { routePolylineEncoded: { $exists: false } }, { routePolylineEncoded: null }, { routePolylineEncoded: '' } ] }).cursor();
  let batch = [];
  for await (const task of cursor) {
    batch.push(task);
    if (batch.length >= BATCH_SIZE) {
      console.log(`Processing batch of ${batch.length} (processed: ${processed})`);
      await Promise.all(batch.map(t => processTask(t)));
      processed += batch.length;
      batch = [];
      if (processed >= MAX_RUN) break;
      await sleep(SLEEP_MS_BETWEEN_BATCHES);
    }
  }

  if (batch.length > 0) {
    console.log(`Processing final batch of ${batch.length}`);
    await Promise.all(batch.map(t => processTask(t)));
    processed += batch.length;
  }

  console.log('Migration complete. Processed:', processed, 'Log:', LOG_FILE);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error('Migration error:', err && (err.message || err)); process.exit(1); });
