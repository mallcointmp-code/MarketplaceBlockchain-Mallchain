/**
 * Migration script:
 * - uses Bottleneck global limiter + per-OD group
 * - writes each attempt into CSV AND into MigrationResult Mongo collection
 * - supports exponential backoff & retries
 *
 * Usage:
 *   node scripts/migrate_polyline_tasks_with_queue_and_db.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const Bottleneck = require('bottleneck');
const crypto = require('crypto');

const DeliveryTask = require('../models/DeliveryTask.js');
const directionsService = require('../services/directionsService.js');
const MigrationResult = require('../models/MigrationResult.js');

dotenv.config();

const MONGO = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/the_market_place";

// config
const BATCH_SIZE = Number(process.env.MIGRATE_BATCH_SIZE || 20);
const MAX_RUN = Number(process.env.MIGRATE_MAX_RUN || 2000);
const SLEEP_MS_BETWEEN_BATCHES = Number(process.env.MIGRATE_SLEEP_MS || 1000);

// Bottleneck
const GLOBAL_RESERVOIR = Number(process.env.MIGRATE_GLOBAL_RESERVOIR || 50);
const GLOBAL_RESERVOIR_REFRESH_MS = Number(process.env.MIGRATE_RESERVOIR_REFRESH_MS || 60000);
const GLOBAL_MIN_TIME = Number(process.env.MIGRATE_MIN_TIME || 100);

// retry
const MAX_RETRIES = Number(process.env.MIGRATE_MAX_RETRIES || 4);
const BASE_DELAY_MS = Number(process.env.MIGRATE_BASE_DELAY_MS || 1000);

// logs
const LOG_DIR = path.resolve(process.cwd(), "backend", "migrations");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const CSV_LOG_FILE = path.join(LOG_DIR, "polyline_migration_log.csv");
if (!fs.existsSync(CSV_LOG_FILE)) {
  fs.writeFileSync(CSV_LOG_FILE, "taskId,attempt,success,reason,notes,timestamp\n", { encoding: "utf8" });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function csvLine(fields) {
  return fields.map(v => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    if (s.includes(",") || s.includes("\n") || s.includes('"')) return `"${s}"`;
    return s;
  }).join(",") + "\n";
}

const globalLimiter = new Bottleneck({
  reservoir: GLOBAL_RESERVOIR,
  reservoirRefreshAmount: GLOBAL_RESERVOIR,
  reservoirRefreshInterval: GLOBAL_RESERVOIR_REFRESH_MS,
  minTime: GLOBAL_MIN_TIME
});
const group = new Bottleneck.Group({ maxConcurrent: 1 });

async function recordAttemptToDb(taskId, attempt, success, reason, notes, origin, destination, routeEncoded, routeCoordsLength, durationSec, distanceMeters) {
  try {
    const doc = new MigrationResult({
      taskId,
      attempt,
      success,
      reason,
      notes,
      origin,
      destination,
      routeEncoded,
      routeCoordsLength,
      durationSec,
      distanceMeters,
      createdAt: new Date()
    });
    await doc.save();
  } catch (err) {
    console.error("Failed to write MigrationResult:", err?.message || err);
  }
}

async function processTaskWithRetries(task) {
  const p = task.pickupLocation || {};
  const d = task.dropoffLocation || {};
  if (!p.lat || !p.lng || !d.lat || !d.lng) {
    const reason = "missing_coords";
    fs.appendFileSync(CSV_LOG_FILE, csvLine([String(task._id), 0, false, reason, "", new Date().toISOString()]));
    await recordAttemptToDb(task._id, 0, false, reason, "", {lat:p.lat,lng:p.lng}, {lat:d.lat,lng:d.lng}, null, 0, null, null);
    return;
  }

  const keyString = `${Number(p.lat).toFixed(6)}|${Number(p.lng).toFixed(6)}|${Number(d.lat).toFixed(6)}|${Number(d.lng).toFixed(6)}`;
  const keyHash = crypto.createHash("sha1").update(keyString).digest("hex");
  const odKey = `od_${keyHash}`;

  let attempt = 0;
  let success = false;
  let lastError = null;
  while (attempt < MAX_RETRIES && !success) {
    attempt++;
    try {
      const routeInfo = await globalLimiter.schedule(() =>
        group.key(odKey).schedule(() =>
          directionsService.fetchRoutePolylineWithCache(p.lat, p.lng, d.lat, d.lng)
        )
      );

      if (!routeInfo || !routeInfo.encoded) {
        lastError = "no_route";
        fs.appendFileSync(CSV_LOG_FILE, csvLine([String(task._id), attempt, false, "no_route", JSON.stringify(routeInfo || {}), new Date().toISOString()]));
        await recordAttemptToDb(task._id, attempt, false, "no_route", JSON.stringify(routeInfo || {}), {lat:p.lat,lng:p.lng}, {lat:d.lat,lng:d.lng}, null, 0, null, null);
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
        continue;
      }

      const update = {
        routePolylineEncoded: routeInfo.encoded,
        routePolylineCoords: routeInfo.decoded || [],
        routeDistanceMeters: routeInfo.distanceMeters || null,
        routeDurationSec: routeInfo.durationSec || null
      };
      if (!task.expectedDurationSec && routeInfo.durationSec) update.expectedDurationSec = routeInfo.durationSec;

      await DeliveryTask.findByIdAndUpdate(task._id, update);
      fs.appendFileSync(CSV_LOG_FILE, csvLine([String(task._id), attempt, true, "updated", `coords:${update.routePolylineCoords.length}`, new Date().toISOString()]));
      await recordAttemptToDb(task._id, attempt, true, "updated", `coords:${update.routePolylineCoords.length}`, {lat:p.lat,lng:p.lng}, {lat:d.lat,lng:d.lng}, routeInfo.encoded, (routeInfo.decoded||[]).length, routeInfo.durationSec, routeInfo.distanceMeters);
      success = true;
      break;
    } catch (err) {
      lastError = err?.message || String(err);
      fs.appendFileSync(CSV_LOG_FILE, csvLine([String(task._id), attempt, false, "error", lastError, new Date().toISOString()]));
      await recordAttemptToDb(task._id, attempt, false, "error", lastError, {lat:p.lat,lng:p.lng}, {lat:d.lat,lng:d.lng}, null, 0, null, null);
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  if (!success) {
    fs.appendFileSync(CSV_LOG_FILE, csvLine([String(task._id), attempt, false, "failed_after_retries", lastError || "", new Date().toISOString()]));
    await recordAttemptToDb(task._id, attempt, false, "failed_after_retries", lastError || "", {lat:p.lat,lng:p.lng}, {lat:d.lat,lng:d.lng}, null, 0, null, null);
  }
}

async function run() {
  console.log("Connecting to mongo:", MONGO);
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });

  console.log("Migration starting...");
  let processed = 0;
  const cursor = DeliveryTask.find({
    $or: [
      { routePolylineEncoded: { $exists: false } },
      { routePolylineEncoded: null },
      { routePolylineEncoded: "" }
    ]
  }).cursor();

  let batch = [];
  for await (const task of cursor) {
    batch.push(task);
    if (batch.length >= BATCH_SIZE) {
      console.log(`Processing batch of ${batch.length} (processed: ${processed})`);
      await Promise.all(batch.map(t => processTaskWithRetries(t)));
      processed += batch.length;
      batch = [];
      if (processed >= MAX_RUN) break;
      await sleep(SLEEP_MS_BETWEEN_BATCHES);
    }
  }

  if (batch.length > 0) {
    console.log(`Processing final batch of ${batch.length}`);
    await Promise.all(batch.map(t => processTaskWithRetries(t)));
    processed += batch.length;
  }

  console.log("Migration complete. Processed:", processed, "CSV:", CSV_LOG_FILE);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error("Migration run error:", err);
  process.exit(1);
});

module.exports = { mongoose, dotenv, fs, path, Bottleneck, crypto, DeliveryTask, directionsService, MigrationResult, MONGO, BATCH_SIZE, MAX_RUN, SLEEP_MS_BETWEEN_BATCHES, GLOBAL_RESERVOIR, GLOBAL_RESERVOIR_REFRESH_MS, GLOBAL_MIN_TIME, MAX_RETRIES, BASE_DELAY_MS, LOG_DIR, CSV_LOG_FILE, s, globalLimiter, group, doc, p, d, reason, keyString, keyHash, odKey, routeInfo, delay, update, delay, cursor };